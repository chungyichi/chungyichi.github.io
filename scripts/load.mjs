// The only place that reads content from disk.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { site } from "../site.config.mjs";
import { createMarkdown, parsePost, ContentError } from "./content.mjs";

/**
 * A post's own CSS is trusted (it is in the repo) but must not pull anything from other hosts:
 * no @import, no absolute or protocol-relative url(), no legacy script hooks. Local files are referenced as /media/....
 */
export function checkPostCss(text, where = "post css") {
  if (text.length > 100_000) throw new ContentError(`${where}: larger than 100 KB`);
  if (/@import/i.test(text)) throw new ContentError(`${where}: @import is not allowed (it would load another file)`);
  if (/expression\s*\(|javascript:|behavior\s*:|-moz-binding/i.test(text)) throw new ContentError(`${where}: script hooks in CSS are not allowed`);
  for (const m of text.matchAll(/url\(\s*(['"]?)([^)'"]*)\1\s*\)/gi)) {
    const u = m[2].trim();
    if (!(u.startsWith("/") && !u.startsWith("//")) && !u.startsWith("#")) throw new ContentError(`${where}: url(${u}) must be a local /media/... path`);
  }
  return text;
}

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
      for (const f of readdirSync(dir).filter((x) => x.endsWith(".md") || x.endsWith(".html")).sort()) {
        const post = parsePost(f, readFileSync(join(dir, f), "utf8"), md, section);
        // content/<section>/<slug>.css: this post's own stylesheet (shared by its languages), loaded on its pages only
        const cssFile = join(dir, `${post.slug}.css`);
        const css = existsSync(cssFile) ? checkPostCss(readFileSync(cssFile, "utf8"), cssFile) : "";
        // content/<section>/<slug>.js: this post's own script (module), for trusted posts only
        const jsFile = join(dir, `${post.slug}.js`);
        const js = existsSync(jsFile) ? readFileSync(jsFile, "utf8") : "";
        if (js && !post.trusted) throw new ContentError(`${jsFile}: a post script needs 'trusted: true' in the post's front matter`);
        if (js.length > 200_000) throw new ContentError(`${jsFile}: larger than 200 KB`);
        posts.push({ ...post, css, js, private: isPrivate });
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
