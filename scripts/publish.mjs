// Second half of scripts/publish.sh (runs in the node container): turn a private imported post into a public one.
//   node scripts/publish.mjs <section> <slug> [--allow-unpublished]
// Reads the web-size pictures + manifest.tsv that photo.sh wrote to backup/photo-tmp/<section>/<slug>/, copies the pictures to
// content/<section>/media/<slug>/, points the post at them (.webp, width and height added), removes `draft: true`, moves the post
// from content/_private/<section>/ to content/<section>/ (the private file is kept as backup/published-from-private/...), and notes it in import-map.json.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, existsSync, renameSync } from "node:fs";
import { join } from "node:path";

const [section, slug, ...flags] = process.argv.slice(2);
if (!section || !slug) { console.error("usage: node scripts/publish.mjs <section> <slug> [--allow-unpublished]"); process.exit(2); }
const priv = join("content", "_private", section), pub = join("content", section);
const tmp = join("backup", "photo-tmp", section, slug);
const fail = (m) => { console.error(`publish: ${m}`); process.exit(1); };

const mapFile = join(priv, "import-map.json");
const map = existsSync(mapFile) ? JSON.parse(readFileSync(mapFile, "utf8")) : {};
const entries = Object.values(map).filter((e) => e.slug === slug);
if (entries.some((e) => e.unpublishedInMedium) && !flags.includes("--allow-unpublished")) fail(`'${slug}' was never published on Medium (a draft); pass --allow-unpublished only if you really mean to publish it`);

const files = readdirSync(priv).filter((f) => new RegExp(`^\\d{4}-\\d{2}-\\d{2}-${slug}\\.(zh|en)\\.(html|md)$`).test(f));
if (!files.length) fail(`no private post with slug '${slug}' in ${priv}`);
if (!existsSync(join(tmp, "manifest.tsv"))) fail(`${tmp}/manifest.tsv not found; run scripts/publish.sh, which runs photo.sh first`);
const sizes = new Map(readFileSync(join(tmp, "manifest.tsv"), "utf8").trim().split("\n").slice(1).map((l) => { const [f, w, h] = l.split("\t"); return [f, { w, h }]; }));

// check everything before touching anything
const plan = files.map((f) => {
  let text = readFileSync(join(priv, f), "utf8");
  const refs = [...text.matchAll(/<img\b[^>]*?src="\/media\/([a-z0-9-]+)\/([a-z0-9-]+)\/([^"]+)"[^>]*>/g)];
  for (const r of refs) {
    if (r[1] !== section || r[2] !== slug) fail(`${f}: picture outside /media/${section}/${slug}/: ${r[0].slice(0, 80)}`);
    const web = r[3].replace(/\.[^.]+$/, ".webp");
    if (!sizes.has(`${slug}/${web}`) && !sizes.has(web)) fail(`${f}: no web version for ${r[3]} in the manifest`);
  }
  text = text.replace(/<img\b([^>]*?)src="\/media\/[a-z0-9-]+\/[a-z0-9-]+\/([^"]+)"([^>]*)>/g, (all, pre, name, post) => {
    const web = name.replace(/\.[^.]+$/, ".webp");
    const sz = sizes.get(web) || sizes.get(`${slug}/${web}`);
    const clean = (pre + post).replace(/\s(width|height)="[^"]*"/g, "");
    return `<img${clean} src="/media/${section}/${slug}/${web}" width="${sz.w}" height="${sz.h}">`.replace(/<img\s+/, "<img ").replace(/\s+>/, ">");
  });
  text = text.replace(/^draft:\s*true\s*\n/m, "");
  return { f, text };
});

mkdirSync(join(pub, "media", slug), { recursive: true });
for (const f of readdirSync(tmp).filter((n) => n.endsWith(".webp"))) copyFileSync(join(tmp, f), join(pub, "media", slug, f));
mkdirSync(join("backup", "published-from-private", section), { recursive: true });
for (const { f, text } of plan) {
  writeFileSync(join(pub, f), text);
  renameSync(join(priv, f), join("backup", "published-from-private", section, f));
  console.log(`published ${join(pub, f)}`);
}
for (const e of entries) e.publishedAs = `content/${section}/`;
writeFileSync(mapFile, JSON.stringify(map, null, 2) + "\n");
