// Medium export HTML -> a clean post body. Pure except for the injected fetchImage, so it can be tested without a network.
// Structure assumed from Medium's export format (h1.p-name title, section[data-field=body], time.dt-published, figure/img/figcaption);
// UNVERIFIED against a real export until one is available: adjust here if a real file differs.
import { parse, serialize } from "parse5";
import { createHash } from "node:crypto";
import { sanitizeHtml } from "./sanitize.mjs";
import { ContentError } from "./errors.mjs";

const attr = (n, name) => n.attrs?.find((a) => a.name === name)?.value;
const hasClass = (n, c) => (attr(n, "class") || "").split(/\s+/).includes(c);
const kids = (n) => n.content?.childNodes || n.childNodes || [];
function find(n, pred) {
  if (n.tagName && pred(n)) return n;
  for (const c of kids(n)) { const r = find(c, pred); if (r) return r; }
  return null;
}
function text(n) {
  if (n.nodeName === "#text") return n.value;
  return kids(n).map(text).join("");
}
const setAttr = (n, name, value) => { const a = n.attrs.find((x) => x.name === name); if (a) a.value = value; else n.attrs.push({ name, value }); };

const EXT = { "image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif", "image/webp": ".webp", "image/avif": ".avif" };

/** Lowercase ASCII slug from a Medium file name like 2020-01-01_My-Title-1a2b3c4d5e6f.html (CJK titles fall back to a hash). */
export function slugFromFilename(name) {
  const base = name.replace(/\.html$/i, "").replace(/^\d{4}-\d{2}-\d{2}_/, "").replace(/-[0-9a-f]{10,14}$/i, "");
  const s = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return s || "post-" + createHash("sha1").update(name).digest("hex").slice(0, 8);
}

export const guessLang = (s) => ((s.match(/[㐀-鿿]/g) || []).length / Math.max(1, s.replace(/\s/g, "").length) > 0.15 ? "zh" : "en");

/**
 * @param html       one exported post
 * @param opts.mediaDir  URL directory the pictures will be served from, e.g. /media/life/my-trip
 * @param opts.fetchImage async (url) => { bytes: Buffer, type: string }
 * @returns { title, date, summary, body, files: [{ name, bytes }], notes: [] }  (body is already sanitized)
 */
export async function convertMedium(html, { mediaDir, fetchImage }) {
  const doc = parse(html);
  const notes = [];
  const titleEl = find(doc, (n) => n.tagName === "h1" && hasClass(n, "p-name")) || find(doc, (n) => n.tagName === "title");
  const title = titleEl ? text(titleEl).trim() : "";
  if (!title) throw new ContentError("no title found in the Medium file");
  const t = find(doc, (n) => n.tagName === "time" && hasClass(n, "dt-published"));
  const date = (attr(t || { attrs: [] }, "datetime") || "").slice(0, 10) || null;
  const sub = find(doc, (n) => n.tagName === "section" && attr(n, "data-field") === "subtitle");
  const bodyEl = find(doc, (n) => n.tagName === "section" && attr(n, "data-field") === "body") || find(doc, (n) => n.tagName === "article");
  if (!bodyEl) throw new ContentError("no post body found (section[data-field=body])");

  const files = [];
  const byUrl = new Map();
  async function visit(parent) {
    const list = kids(parent);
    for (let i = 0; i < list.length; i++) {
      const n = list[i];
      if (!n.tagName) continue;
      if (n.tagName === "h1" && hasClass(n, "graf--title")) { list.splice(i--, 1); continue; }            // the title is front matter
      n.attrs = n.attrs.filter((a) => !["class", "id", "name", "data-image-id"].includes(a.name));         // Medium's own classes mean nothing here; layout is added by hand later
      if (n.tagName === "h3") n.tagName = n.nodeName = "h2";                                                // Medium: h3 = section, h4 = sub-section
      else if (n.tagName === "h4") n.tagName = n.nodeName = "h3";
      if (n.tagName === "iframe") {                                                                          // embeds become a plain link, never a third-party frame
        const src = attr(n, "src") || attr(n, "data-src") || "";
        notes.push(`embed replaced by a link: ${src}`);
        n.tagName = n.nodeName = "a"; n.attrs = [{ name: "href", value: src }]; n.childNodes = [{ nodeName: "#text", value: src, parentNode: n }];
        continue;
      }
      if (n.tagName === "img") {
        const src = attr(n, "src") || "";
        if (/^https:\/\//i.test(src)) {
          if (!byUrl.has(src)) {
            const { bytes, type } = await fetchImage(src);
            const ext = EXT[String(type).split(";")[0].trim().toLowerCase()];
            if (!ext) throw new ContentError(`${src}: unsupported image type ${type}`);
            const name = createHash("sha1").update(src).digest("hex").slice(0, 12) + ext;
            files.push({ name, bytes });
            byUrl.set(src, name);
          }
          setAttr(n, "src", `${mediaDir}/${byUrl.get(src)}`);
        }
        continue;
      }
      await visit(n);
    }
  }
  await visit(bodyEl);

  const rawBody = serialize(bodyEl);
  const body = sanitizeHtml(rawBody, "medium import").replace(/<p>\s*<\/p>/g, "").trim();
  const summary = (sub ? text(sub) : text(bodyEl)).replace(/\s+/g, " ").trim().slice(0, 200);
  return { title, date, summary, body, files, notes };
}
