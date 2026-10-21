// The only place that reads content from disk.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { site } from "../site.config.mjs";
import { createMarkdown, parsePost, ContentError } from "./content.mjs";

/**
 * Posts of every section from content/<section>/. With includePrivate (dev only) also content/_private/<section>/,
 * which is git-ignored (drafts and imports not yet cleared for publication); those posts are marked `private`.
 */
export function loadPosts({ root = "content", sections = site.sections.map((s) => s.id), includePrivate = false } = {}) {
  const md = createMarkdown();
  const posts = [];
  const trees = [[root, false], ...(includePrivate ? [[join(root, "_private"), true]] : [])];
  for (const [base, isPrivate] of trees) {
    for (const section of sections) {
      const dir = join(base, section);
      if (!existsSync(dir)) continue;
      for (const f of readdirSync(dir).filter((x) => x.endsWith(".md")).sort()) {
        posts.push({ ...parsePost(f, readFileSync(join(dir, f), "utf8"), md, section), private: isPrivate });
      }
    }
  }
  return posts;
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
