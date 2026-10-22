// npm run import:medium -- <export-dir> --section tech|life [--public]
// Reads <export-dir>/posts/*.html (Medium's "Download your information" export, unzipped) and writes one .html post each,
// plus its pictures, into content/_private/<section>/ (git-ignored: review first). --public writes into content/<section>/ instead.
// Drafts in the export (drafts/) are ignored. Nothing is overwritten: an existing file is reported and skipped.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { site } from "../site.config.mjs";
import { convertMedium, slugFromFilename, guessLang } from "./medium.mjs";

const HOSTS = /(^|\.)medium\.com$/i;               // Medium's image hosts (cdn-images-1.medium.com, miro.medium.com)
const MAX_IMAGE = 25 * 1024 * 1024;

export async function fetchImage(url) {
  const u = new URL(url);
  if (u.protocol !== "https:" || !HOSTS.test(u.hostname)) throw new Error(`refusing to download from ${u.hostname}`);
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
  const isPublic = args.includes("--public");
  if (!dir || args.indexOf("--section") < 0 || !site.sections.some((s) => s.id === section)) {
    console.error(`usage: npm run import:medium -- <export-dir> --section ${site.sections.map((s) => s.id).join("|")} [--public]`);
    process.exit(2);
  }
  const postsDir = join(dir, "posts");
  if (!existsSync(postsDir)) { console.error(`${postsDir} not found (unzip the Medium export first)`); process.exit(2); }
  const outBase = isPublic ? join("content", section) : join("content", "_private", section);
  mkdirSync(join(outBase, "media"), { recursive: true });
  let done = 0, failed = 0;
  for (const f of readdirSync(postsDir).filter((x) => x.endsWith(".html")).sort()) {
    const slug = slugFromFilename(f);
    try {
      const r = await convertMedium(readFileSync(join(postsDir, f), "utf8"), { mediaDir: `/media/${section}/${slug}`, fetchImage });
      const date = r.date || /^(\d{4}-\d{2}-\d{2})_/.exec(f)?.[1];
      if (!date) throw new Error("no publication date (neither in the file nor in its name)");
      const lang = guessLang(r.title + r.summary);
      const out = join(outBase, `${date}-${slug}.${lang}.html`);
      if (existsSync(out)) { console.log(`skip   ${out} (exists)`); continue; }
      const fm = `---\ntitle: ${JSON.stringify(r.title)}\nsummary: ${JSON.stringify(r.summary || r.title)}\ndraft: true\n---\n`;
      writeFileSync(out, fm + r.body + "\n");
      if (r.files.length) mkdirSync(join(outBase, "media", slug), { recursive: true });
      for (const file of r.files) writeFileSync(join(outBase, "media", slug, file.name), file.bytes);
      console.log(`ok     ${out}  (${lang}, ${r.files.length} images)${r.notes.length ? "\n         " + r.notes.join("\n         ") : ""}`);
      done++;
    } catch (e) {
      console.log(`FAILED ${f}: ${e.message}`);
      failed++;
    }
  }
  console.log(`${done} imported, ${failed} failed. Imported posts are marked draft: true; review each, then remove that line.`);
  process.exit(failed ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
