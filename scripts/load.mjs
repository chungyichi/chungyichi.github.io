// The only place that reads content from disk.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createMarkdown, parsePost, ContentError } from "./content.mjs";

export function loadPosts(root = "content/posts") {
  const md = createMarkdown();
  if (!existsSync(root)) return [];
  return readdirSync(root).filter((f) => f.endsWith(".md")).sort()
    .map((f) => parsePost(f, readFileSync(join(root, f), "utf8"), md));
}

/** Pages like About: content/pages/<name>.<lang>.md with the same front matter (title, summary). */
export function loadPages(root = "content/pages") {
  const md = createMarkdown();
  const pages = {};
  if (!existsSync(root)) return pages;
  for (const f of readdirSync(root).filter((x) => x.endsWith(".md")).sort()) {
    const m = /^([a-z0-9-]+)\.(zh|en)\.md$/.exec(f);
    if (!m) throw new ContentError(`${f}: page file name must look like about.zh.md`);
    // reuse the post parser with a dummy date
    const p = parsePost(`2000-01-01-${m[1]}.${m[2]}.md`, readFileSync(join(root, f), "utf8"), md);
    (pages[m[1]] ??= {})[m[2]] = { title: p.title, summary: p.summary, html: p.html };
  }
  return pages;
}
