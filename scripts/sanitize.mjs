// HTML allowlist sanitizer for .html posts (imports such as Medium are not hand-written, so they are not trusted).
// Parses with parse5 (the HTML5 spec algorithm), then re-serializes ONLY allowlisted tags and attributes.
// Anything else is dropped (dangerous elements with their content) or unwrapped (unknown wrappers keep their children).
import { parseFragment } from "parse5";
import { ContentError } from "./errors.mjs";

const RENAME = { b: "strong", i: "em", h1: "h2", h5: "h4", h6: "h4", strike: "del", s: "del" };
const KEEP = new Set(["p", "br", "hr", "h2", "h3", "h4", "strong", "em", "del", "sup", "sub", "mark", "small", "kbd", "time", "a", "ul", "ol", "li",
  "blockquote", "pre", "code", "figure", "figcaption", "img", "table", "thead", "tbody", "tr", "th", "td", "div", "span", "section", "aside",
  "details", "summary"]);
const VOID = new Set(["br", "hr", "img"]);
// Removed together with their content; everything else unknown is unwrapped.
const DROP = new Set(["script", "style", "iframe", "frame", "frameset", "object", "embed", "applet", "form", "input", "button", "select",
  "textarea", "svg", "math", "template", "noscript", "head", "title", "link", "meta", "base", "audio", "video", "canvas", "dialog"]);
// Layout is up to each post: any tag above may carry class names (and a fragment id). The look of those classes comes from
// the site's shared stylesheet or from the post's own CSS file (content/<section>/<slug>.css, trusted, loaded on that page only).
// There is deliberately no `style` attribute: inline CSS could load third-party URLs, and class + CSS file covers the need.
const CLASS_RE = /^[a-z][a-z0-9_-]{0,40}$/i;
const ID_RE = /^[A-Za-z][A-Za-z0-9_-]{0,60}$/;

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s) => esc(s).replace(/"/g, "&quot;");

/** Returns a safe URL string or null. Allowed: http(s), mailto, root-relative (/x, not //x) and #fragment. */
export function safeUrl(raw) {
  const u = String(raw).replace(/[\u0000- \u007f-\u009f]/g, "");   // browsers ignore control chars and spaces inside a scheme
  if (!u) return null;
  if (u.startsWith("#")) return u;
  if (u.startsWith("/") && !u.startsWith("//") && !u.startsWith("/\\")) return String(raw).trim();
  if (/^(https?:\/\/|mailto:)/i.test(u)) return String(raw).trim();
  return null;
}

/** An image must be hosted by this site: a root-relative path. (Hotlinked images leak readers' IPs and break when the host changes.) */
const localImage = (url) => url && url.startsWith("/");

export function sanitizeHtml(html, where = "html post") {
  const root = parseFragment(html);
  const out = [];
  const external = [];

  const attr = (node, name) => node.attrs?.find((a) => a.name === name)?.value;
  const classes = (node) => (attr(node, "class") || "").split(/\s+/).filter((c) => CLASS_RE.test(c));

  function walk(node) {
    for (const child of node.childNodes || []) {
      if (child.nodeName === "#text") { out.push(esc(child.value)); continue; }
      if (!child.tagName) continue;                                     // comments, doctype
      let tag = child.tagName.toLowerCase();
      if (DROP.has(tag)) continue;
      tag = RENAME[tag] || tag;
      if (!KEEP.has(tag)) { walk(child); continue; }
      let attrs = "";
      if (tag === "a") {
        const href = safeUrl(attr(child, "href") ?? "");
        if (!href) { walk(child); continue; }                           // no safe target: keep the text, drop the link
        attrs = ` href="${escAttr(href)}"`;
        if (/^https?:/i.test(href)) attrs += ' rel="noopener noreferrer"';
        const title = attr(child, "title");
        if (title) attrs += ` title="${escAttr(title)}"`;
      } else if (tag === "img") {
        const raw = attr(child, "src") ?? "";
        const src = safeUrl(raw);
        if (!localImage(src)) { external.push(raw || "(empty src)"); continue; }   // never drop a picture silently
        attrs = ` src="${escAttr(src)}" alt="${escAttr(attr(child, "alt") ?? "")}" loading="lazy" decoding="async"`;
        for (const k of ["width", "height"]) { const v = attr(child, k); if (v && /^\d{1,5}$/.test(v)) attrs += ` ${k}="${v}"`; }
      } else if (tag === "th" || tag === "td") {
        for (const k of ["colspan", "rowspan"]) { const v = attr(child, k); if (v && /^\d{1,2}$/.test(v)) attrs += ` ${k}="${v}"`; }
      }
      const cls = classes(child);
      if (cls.length) attrs += ` class="${cls.join(" ")}"`;
      const id = attr(child, "id");
      if (id && ID_RE.test(id)) attrs += ` id="${id}"`;
      out.push(`<${tag}${attrs}>`);
      if (!VOID.has(tag)) { walk(child); out.push(`</${tag}>`); }
    }
  }
  walk(root);
  if (external.length) {
    throw new ContentError(`${where}: images must be local (a /media/... path), found ${external.length} external: ${external.slice(0, 3).join(", ")}${external.length > 3 ? ", ..." : ""}`);
  }
  return out.join("");
}
