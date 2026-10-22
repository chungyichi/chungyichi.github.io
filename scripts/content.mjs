// Content pipeline: front matter, Markdown, publishing rules, translations, pagination, sitemap.
// Pure functions (no file or network access) so they can be tested; the loader is in load.mjs.
import MarkdownIt from "markdown-it";
import hljs from "highlight.js/lib/common";

import { ContentError } from "./errors.mjs";
import { sanitizeHtml } from "./sanitize.mjs";

export { ContentError };

const FILE_RE = /^(\d{4}-\d{2}-\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)\.(zh|en)\.(md|html)$/;
const ALLOWED_KEYS = new Set(["title", "summary", "draft", "updated", "trusted"]);

/** Parse the `---` front matter block. A strict YAML subset: `key: value`, quoted or bare strings, true/false. */
export function parseFrontMatter(text, where = "post") {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!m) throw new ContentError(`${where}: missing front matter block (--- ... ---)`);
  const data = {};
  for (const [i, raw] of m[1].split(/\r?\n/).entries()) {
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    const kv = /^([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/.exec(raw);
    if (!kv) throw new ContentError(`${where}: front matter line ${i + 1} is not 'key: value': ${JSON.stringify(raw)}`);
    const [, key, val0] = kv;
    if (!ALLOWED_KEYS.has(key)) throw new ContentError(`${where}: unknown front matter key '${key}' (allowed: ${[...ALLOWED_KEYS].join(", ")})`);
    if (key in data) throw new ContentError(`${where}: duplicate front matter key '${key}'`);
    let val = val0.trim();
    if (val === "true" || val === "false") val = val === "true";
    else if (/^".*"$/.test(val)) val = JSON.parse(val);
    else if (/^'.*'$/.test(val)) val = val.slice(1, -1).replace(/''/g, "'");
    data[key] = val;
  }
  return { data, body: m[2] };
}

/** Markdown -> HTML. Raw HTML in the source is NOT passed through (it is escaped). */
export function createMarkdown() {
  const md = new MarkdownIt({
    html: false, linkify: true, typographer: false,
    highlight(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        return `<pre><code class="hljs language-${lang}">${hljs.highlight(code, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
      }
      return "";
    },
  });
  // A line that is exactly {{widget: name}} becomes <div class="widget" data-widget="name"></div>: a mount point for the post's own script
  // (content/<section>/<slug>.js, trusted posts only). Raw HTML stays off, so this is the only way Markdown gets an interactive spot.
  md.block.ruler.before("paragraph", "widget", (state, start, end, silent) => {
    const line = state.src.slice(state.bMarks[start] + state.tShift[start], state.eMarks[start]).trim();
    const m = /^\{\{widget:\s*([a-z0-9][a-z0-9-]{0,40})\s*\}\}$/.exec(line);
    if (!m) return false;
    if (silent) return true;
    const t = state.push("html_block", "", 0);
    t.content = `<div class="widget" data-widget="${m[1]}"></div>\n`;
    t.map = [start, start + 1];
    state.line = start + 1;
    return true;
  });
  const defaultLink = md.renderer.rules.link_open || ((t, i, o, _e, self) => self.renderToken(t, i, o));
  md.renderer.rules.link_open = (tokens, idx, opts, env, self) => {
    const href = tokens[idx].attrGet("href") || "";
    if (/^https?:\/\//i.test(href)) tokens[idx].attrSet("rel", "noopener noreferrer");
    return defaultLink(tokens, idx, opts, env, self);
  };
  return md;
}

/** Turn one file into a post object, or throw a ContentError that names the file. */
export function parsePost(filename, text, md = createMarkdown(), section = "tech") {
  const fm = FILE_RE.exec(filename);
  if (!fm) throw new ContentError(`${filename}: file name must look like YYYY-MM-DD-slug.zh.md or .en.md, or .html for a hand-laid-out post (lowercase, hyphens)`);
  const [, date, slug, lang, ext] = fm;
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== date) throw new ContentError(`${filename}: ${date} is not a real date`);
  const { data, body } = parseFrontMatter(text, filename);
  const isDraft = data.draft === true;
  if (typeof data.title !== "string" || !data.title.trim()) throw new ContentError(`${filename}: front matter 'title' is required`);
  data.summary ??= "";
  // A draft may be unfinished (npm run new creates it with an empty summary); a published post may not.
  if (typeof data.summary !== "string" || (!data.summary.trim() && !isDraft)) throw new ContentError(`${filename}: front matter 'summary' is required`);
  if (data.summary.length > 300) throw new ContentError(`${filename}: summary is ${data.summary.length} characters (max 300)`);
  if ("trusted" in data && typeof data.trusted !== "boolean") throw new ContentError(`${filename}: 'trusted' must be true or false`);
  if ("draft" in data && typeof data.draft !== "boolean") throw new ContentError(`${filename}: 'draft' must be true or false`);
  if ("updated" in data && !/^\d{4}-\d{2}-\d{2}$/.test(String(data.updated))) throw new ContentError(`${filename}: 'updated' must be YYYY-MM-DD`);
  return {
    section, slug, lang, date, title: data.title.trim(), summary: data.summary.trim(),
    draft: data.draft === true, updated: data.updated || "",
    // .md: raw HTML off (trusted .md may add a script and {{widget: name}} mount points). .html: allowlist sanitizer, unless the post is marked `trusted: true` (your own hand-written page: the body is used as is).
    trusted: data.trusted === true,
    html: ext === "html" ? (data.trusted === true ? body : sanitizeHtml(body, filename)) : md.render(body),
    words: (ext === "html" ? body.replace(/<[^>]*>/g, " ") : body).split(/\s+/).filter(Boolean).length,
  };
}

/** `YYYY-MM-DD` for "now" in the given IANA zone. */
export function todayIn(zone, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Published = not a draft and dated today or earlier (in the site's zone), unless drafts are included (dev). */
export function selectPublished(posts, today, { includeDrafts = false } = {}) {
  return posts.filter((p) => includeDrafts || (!p.draft && p.date <= today));
}

export function sortPosts(posts) {
  return [...posts].sort((a, b) => (a.date === b.date ? a.slug.localeCompare(b.slug) : a.date < b.date ? 1 : -1));
}

/** Build the model the site renders from: per-language sorted posts, plus translation links by slug+date. */
export function buildModel(posts, langs, sections) {
  const ids = sections.map((s) => s.id);
  const seen = new Set();
  for (const p of posts) {
    if (!ids.includes(p.section)) throw new ContentError(`post ${p.slug} is in unknown section '${p.section}'`);
    const key = `${p.section}/${p.lang}/${p.slug}`;
    if (seen.has(key)) throw new ContentError(`two ${p.lang} posts in '${p.section}' share the slug '${p.slug}'`);
    seen.add(key);
  }
  const byLang = Object.fromEntries(langs.map((l) => [l, sortPosts(posts.filter((p) => p.lang === l))]));
  const bySection = Object.fromEntries(ids.map((s) => [s, Object.fromEntries(langs.map((l) => [l, byLang[l].filter((p) => p.section === s)]))]));
  const translations = {};                                  // "section/slug" -> { lang: true }
  for (const p of posts) (translations[`${p.section}/${p.slug}`] ??= {})[p.lang] = true;
  const missing = posts.filter((p) => langs.some((l) => l !== p.lang && !translations[`${p.section}/${p.slug}`][l]));
  return { byLang, bySection, translations, missing };
}

export function paginate(items, perPage) {
  if (!Number.isInteger(perPage) || perPage < 1) throw new ContentError("postsPerPage must be a positive integer");
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  return Array.from({ length: pages }, (_, i) => ({ number: i + 1, total: pages, items: items.slice(i * perPage, (i + 1) * perPage) }));
}

/** Group an already-sorted list by date, like the reference blog's index. */
export function groupByDate(items) {
  const groups = [];
  for (const p of items) {
    const last = groups[groups.length - 1];
    if (last && last.date === p.date) last.items.push(p);
    else groups.push({ date: p.date, items: [p] });
  }
  return groups;
}

const unescapeText = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&amp;/g, "&");

/** Headings of a rendered post body, as plain text (for search). */
export function headingsOf(html) {
  return [...html.matchAll(/<h[2-4](?:\s[^>]*)?>([\s\S]*?)<\/h[2-4]>/g)].map((m) => unescapeText(m[1].replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim()).filter(Boolean);
}

/** The search index for one language: title, summary, headings, date, section title and address. Titles and summaries only; no body text. */
export function buildSearchIndex(posts, lang, sectionTitleOf) {
  return posts.filter((p) => p.lang === lang).map((p) => ({
    t: p.title, s: p.summary, h: headingsOf(p.html), d: p.date, c: sectionTitleOf(p.section), u: postPath(lang, p.section, p.slug),
  }));
}

/** Hosts a piece of trusted content talks to (scripts, frames, stylesheets, images, fetches): shown by `npm run check` so nothing third-party sneaks in unnoticed. */
export function externalHosts(text) {
  const hosts = new Set();
  for (const m of String(text).matchAll(/(?:https?:)?\/\/([a-z0-9][a-z0-9.-]*\.[a-z]{2,})(?::\d+)?(?=[/"'`\s)>?#]|$)/gi)) hosts.add(m[1].toLowerCase());
  return [...hosts].sort();
}

export const searchPath = (lang) => `/${lang}/search/`;
export const postPath = (lang, section, slug) => `/${lang}/${section}/${slug}/`;
export const indexPath = (lang, section, page = 1) => (page === 1 ? `/${lang}/${section}/` : `/${lang}/${section}/page/${page}/`);

const xml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);

export function sitemap(baseUrl, urls) {
  const body = urls.map((u) => `  <url><loc>${xml(baseUrl + u.path)}</loc>${(u.alternates || []).map((a) => `<xhtml:link rel="alternate" hreflang="${a.lang}" href="${xml(baseUrl + a.path)}"/>`).join("")}</url>`);
  return `<?xml version="1.0" encoding="utf-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body.join("\n")}\n</urlset>\n`;
}
