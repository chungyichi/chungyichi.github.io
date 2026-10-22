// npm run import:medium -- <export-dir> --section tech|life [--public] [--dry] [--map-only] [--no-drafts] [--max-width 1200]
// Reads <export-dir>/posts/*.html (Medium's "Download your information" export, unzipped) and writes one .html post each,
// plus its pictures, into content/_private/<section>/ (git-ignored: review first). --public writes into content/<section>/ instead.
// Medium keeps unpublished drafts in posts/ as draft_*.html; they are imported too (private, dated today) unless --no-drafts.
// --dry only reads the files and prints what would be written (titles, dates, languages, slugs, picture counts); it downloads nothing.
// Every import also writes <output>/import-map.json: for each post its slug, the Medium export file, Medium id and canonical URL, title, and for each
// local picture the Medium address it came from, so any generated name can be traced back. --map-only rebuilds that map for an earlier import without downloading or writing posts.
// Nothing is overwritten: an existing file is reported and skipped.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { site } from "../site.config.mjs";
import { todayIn } from "./content.mjs";
import { convertMedium, slugFromFilename, guessLang } from "./medium.mjs";

const HOSTS = /(^|\.)medium\.com$/i;               // Medium's image hosts (cdn-images-1.medium.com, miro.medium.com)
const MAX_IMAGE = 25 * 1024 * 1024;

export async function fetchImage(url) {
  const u = new URL(url);
  if (u.protocol !== "https:" || !HOSTS.test(u.hostname)) throw new Error(`refusing to download from ${u.hostname}`);
  await new Promise((r) => setTimeout(r, 150));                 // be polite: about 6 requests a second at most
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000), headers: { "user-agent": "chungyichi.github.io-import/1.0" } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const type = res.headers.get("content-type") || "";
  if (!type.startsWith("image/")) throw new Error(`${url}: not an image (${type})`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > MAX_IMAGE) throw new Error(`${url}: larger than 25 MB`);
  return { bytes, type };
}

async function main() {
  const args = process.argv.slice(2);
  const dir = args.find((a) => !a.startsWith("--"));
  const section = args[args.indexOf("--section") + 1];
  const isPublic = args.includes("--public"), dry = args.includes("--dry"), mapOnly = args.includes("--map-only"), withDrafts = !args.includes("--no-drafts");
  const maxWidth = args.includes("--max-width") ? Number(args[args.indexOf("--max-width") + 1]) : 1200;
  if (!Number.isInteger(maxWidth) || maxWidth < 200 || maxWidth > 4000) { console.error("--max-width must be 200..4000"); process.exit(2); }
  if (!dir || args.indexOf("--section") < 0 || !site.sections.some((s) => s.id === section)) {
    console.error(`usage: npm run import:medium -- <export-dir> --section ${site.sections.map((s) => s.id).join("|")} [--public]`);
    process.exit(2);
  }
  const postsDir = join(dir, "posts");
  if (!existsSync(postsDir)) { console.error(`${postsDir} not found (unzip the Medium export first)`); process.exit(2); }
  const outBase = isPublic ? join("content", section) : join("content", "_private", section);
  const stub = dry || mapOnly;
  if (!stub) mkdirSync(join(outBase, "media"), { recursive: true });
  const mapFile = join(outBase, "import-map.json");
  const map = existsSync(mapFile) ? JSON.parse(readFileSync(mapFile, "utf8")) : {};
  let unmatched = 0;
  let done = 0, failed = 0, images = 0;
  const used = new Set();                                       // "<lang>/<slug>": two posts must not share one (the site refuses that)
  for (const f of readdirSync(postsDir).filter((x) => x.endsWith(".html") && (withDrafts || !x.startsWith("draft_"))).sort()) {
    let slug = slugFromFilename(f);
    try {
      const raw = readFileSync(join(postsDir, f), "utf8");
      const r = await convertMedium(raw, { mediaDir: `/media/${section}/${slug}`, fetchImage: stub ? async () => ({ bytes: Buffer.alloc(0), type: "image/jpeg" }) : fetchImage, maxWidth });
      const date = r.date || /^(\d{4}-\d{2}-\d{2})_/.exec(f)?.[1] || (f.startsWith("draft_") ? todayIn(site.timezone) : null);
      if (!date) throw new Error("no publication date (neither in the file nor in its name)");
      const lang = guessLang(r.title + r.summary);
      for (let n = 2; used.has(`${lang}/${slug}`); n++) slug = `${slugFromFilename(f)}-${n}`;
      used.add(`${lang}/${slug}`);
      const record = (names) => {
        map[`${lang}/${slug}`] = {
          slug, lang, section, date, title: r.title, exportFile: f, mediumId: /([0-9a-f]{10,14})\.html$/.exec(f)?.[1] || "", canonical: r.canonical,
          unpublishedInMedium: f.startsWith("draft_"), images: r.files.map((file, k) => ({ file: names[k], from: file.url })),
        };
      };
      if (mapOnly) {
        const present = existsSync(join(outBase, "media", slug)) ? readdirSync(join(outBase, "media", slug)) : [];
        const names = r.files.map((file) => present.find((x) => x.startsWith(file.name.replace(/\.[^.]+$/, "") + ".")) ?? (unmatched++, file.name));
        record(names); done++; continue;
      }
      if (dry) { console.log(`plan   ${date} ${lang} ${slug}  "${r.title}"  (${r.files.length} images${r.notes.length ? ", " + r.notes.length + " notes" : ""})`); images += r.files.length; done++; continue; }
      const out = join(outBase, `${date}-${slug}.${lang}.html`);
      if (existsSync(out)) { console.log(`skip   ${out} (exists)`); continue; }
      const fm = `---\ntitle: ${JSON.stringify(r.title)}\nsummary: ${JSON.stringify(r.summary || r.title)}\ndraft: true\n---\n`;
      writeFileSync(out, fm + r.body + "\n");
      if (r.files.length) mkdirSync(join(outBase, "media", slug), { recursive: true });
      for (const file of r.files) writeFileSync(join(outBase, "media", slug, file.name), file.bytes);
      record(r.files.map((file) => file.name));
      console.log(`ok     ${out}  (${lang}, ${r.files.length} images)${r.notes.length ? "\n         " + r.notes.join("\n         ") : ""}`);
      done++;
    } catch (e) {
      console.log(`FAILED ${f}: ${e.message}`);
      failed++;
    }
  }
  if (!dry && done) { writeFileSync(mapFile, JSON.stringify(map, null, 2) + "\n"); console.log(`wrote ${mapFile} (${Object.keys(map).length} posts)${unmatched ? `; ${unmatched} pictures could not be matched to a file on disk` : ""}`); }
  if (dry) console.log(`dry run: ${done} posts, ${images} pictures would be downloaded (max width ${maxWidth}), ${failed} failed`);
  console.log(`${done} imported, ${failed} failed. Imported posts are marked draft: true; review each, then remove that line.`);
  process.exit(failed ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
