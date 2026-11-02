// node scripts/book-add.mjs <file.tsv> [--date YYYY-MM-DD] [--out content/books] [--dry-run]
// Many books at once: one book per line, TAB-separated columns (an empty column keeps its default; trailing ones may be left out):
//   title  author  owner(me|son, default me)  tags(a,b)  summary  volumes(a;b)  own(yes|no, default yes)  source(url)  slug(ascii-lower-hyphen, required)  original(optional: original / English title)  type(optional: 小說 | 漫畫)
// Each good line becomes content/books/<date>-<slug>.zh.md (published, no cover needed). A line is skipped, with the reason, when it does not pass the
// same parsing as the build, the slug is taken, or an author is not in site.config.mjs (books grid.authors): those are listed once at the end, grouped,
// so you can add them to the config and run again. Nothing is overwritten. Lines starting with # and a header line starting with "title" are ignored.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { site } from "../site.config.mjs";
import { todayIn, parsePost, ContentError } from "./content.mjs";
import { BOOKS_SECTION, gridOf, resolveAuthors, isAdultText } from "../src/toys.mjs";

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** The post text of one book (every value quoted as JSON, which the front matter reader accepts: colons and quotes are safe). */
export function bookText({ title, author, owner, tags, summary, volumes, own, source, original = "", type = "" }) {
  const fm = [`title: ${JSON.stringify(title)}`];
  if (summary) fm.push(`summary: ${JSON.stringify(summary)}`);
  if (author) fm.push(`author: ${JSON.stringify(author)}`);
  fm.push(`owner: ${owner}`, `tags: ${JSON.stringify(tags)}`);
  if (volumes.length) fm.push(`volumes: ${JSON.stringify(volumes.join("; ") + (volumes.length === 1 ? ";" : ""))}`);   // ";" keeps a comma inside one title
  if (own === "no") fm.push("own: no");
  if (source) fm.push(`source: ${JSON.stringify(source)}`);
  if (original) fm.push(`original: ${JSON.stringify(original)}`);
  if (type) fm.push(`type: ${JSON.stringify(type)}`);
  return `---\n${fm.join("\n")}\n---\n`;
}

/**
 * Plan the files for the lines of a list. `taken(slug)` says whether a book with that slug already exists.
 * @returns {{ write: { file: string, text: string, line: number }[], skipped: { line: number, title: string, reason: string }[], unknownAuthors: Map<string, { nearest: string[], titles: string[] }> }}
 */
export function planBooks(text, { date, taken = () => false }) {
  const owners = (gridOf(BOOKS_SECTION)?.owners ?? []).map((o) => o.id);
  const write = [], skipped = [], unknownAuthors = new Map(), slugs = new Set();
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = i + 1;
    if (!raw.trim() || raw.startsWith("#") || (i === 0 && raw.startsWith("title\t"))) return;
    const [title = "", author = "", ownerCol = "", tagsCol = "", summary = "", volumesCol = "", ownCol = "", source = "", slug = "", original = "", type = ""] = raw.split("\t").map((c) => c.trim());
    const skip = (reason) => skipped.push({ line, title, reason });
    if (!title) return skip("no title");
    if (!SLUG_RE.test(slug)) return skip(slug ? `slug "${slug}" must be lowercase ASCII words with hyphens` : "no slug (column 9)");
    if (slugs.has(slug)) return skip(`slug ${slug} is used twice in this list`);
    if (taken(slug)) return skip(`slug ${slug} already exists`);
    const owner = ownerCol || "me", own = ownCol || "yes";
    if (!owners.includes(owner)) return skip(`owner "${owner}" is not one of ${owners.join(", ")}`);
    if (!["yes", "no"].includes(own)) return skip(`own "${own}" must be yes or no`);
    const tags = tagsCol.split(/[,，、]/).map((x) => x.trim()).filter(Boolean);
    if (!tags.length) return skip("no tags (a published book needs 1 to 3)");
    const unknown = author ? resolveAuthors(author).unknown : [];
    if (unknown.length) {
      for (const u of unknown) { const e = unknownAuthors.get(u.name) ?? { nearest: u.nearest, titles: [] }; e.titles.push(title); unknownAuthors.set(u.name, e); }
      return skip(`author not in site.config.mjs: ${unknown.map((u) => u.name).join(", ")}`);
    }
    const volumes = volumesCol.split(/[;；]/).map((x) => x.trim()).filter(Boolean);
    const body = bookText({ title, author, owner, tags, summary, volumes, own, source, original, type });
    const file = `${date}-${slug}.zh.md`;
    try {
      const post = parsePost(file, body, undefined, BOOKS_SECTION);
      if (isAdultText(post) && post.source) return skip("an adult book (own: no, tag 成人) has no source link");
    } catch (e) {
      if (e instanceof ContentError) return skip(e.message.replace(`${file}: `, ""));
      throw e;
    }
    slugs.add(slug);
    write.push({ file, text: body, line });
  });
  return { write, skipped, unknownAuthors };
}

function main() {
  const args = process.argv.slice(2);
  const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
  const dry = args.includes("--dry-run") && Boolean(args.splice(args.indexOf("--dry-run"), 1));
  const date = opt("date") ?? todayIn(site.timezone), out = opt("out") ?? join("content", BOOKS_SECTION);
  const file = args.find((a) => !a.startsWith("--"));
  const die = (m) => { console.error(`error: ${m}`); process.exit(1); };
  if (!file || args.length > 1) die("usage: node scripts/book-add.mjs <file.tsv> [--date YYYY-MM-DD] [--out content/books] [--dry-run]\n  columns (tab-separated): title author owner tags summary volumes own source slug");
  if (!existsSync(file)) die(`${file} not found`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) die("--date must be YYYY-MM-DD");
  const existing = existsSync(out) ? readdirSync(out) : [];
  const { write, skipped, unknownAuthors } = planBooks(readFileSync(file, "utf8"), { date, taken: (slug) => existing.some((f) => new RegExp(`^\\d{4}-\\d{2}-\\d{2}-${slug}\\.(zh|en)\\.(md|html)$`).test(f)) });
  if (!dry) { mkdirSync(out, { recursive: true }); for (const w of write) writeFileSync(join(out, w.file), w.text, { flag: "wx" }); }
  for (const s of skipped) console.log(`skipped line ${s.line} ${JSON.stringify(s.title)}: ${s.reason}`);
  if (unknownAuthors.size) {
    console.log(`\nAuthors not in site.config.mjs (books grid.authors); add each once as { name, aliases: [] }, then run again:`);
    for (const [name, e] of unknownAuthors) console.log(`  ${name}  (${e.titles.length} book${e.titles.length > 1 ? "s" : ""}: ${e.titles.slice(0, 3).join(", ")}${e.titles.length > 3 ? ", ..." : ""}; nearest known: ${e.nearest.join(", ") || "none"})`);
  }
  console.log(`\n${dry ? "would write" : "written"} ${write.length}, skipped ${skipped.length}${dry ? "" : ` (in ${out})`}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
