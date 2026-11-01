// node scripts/toy-add.mjs <product-url> [--owner me|son] [--tags a,b] [--slug my-toy] [--title "..."] [--image <file> ...] [--date YYYY-MM-DD] [--out backup/toy-tmp]
// Fetches the shop page (https, allowlisted hosts only: TOY_HOSTS in toy.mjs), reads og:title, og:image and the price, downloads the picture
// into <out>/<slug>/ (git-ignored; scripts/toy-add.sh moves it to your originals folder) and writes a DRAFT content/toys/<date>-<slug>.zh.md.
// --image <file> --title "..." skips the network entirely (for shops behind a login or captcha, such as shopee.tw): the file is copied instead.
// Runs in the node container (scripts/docker.sh), which has the network; the picture tools do not, so they run afterwards (printed at the end).
import { writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { lookup } from "node:dns/promises";
import { pathToFileURL } from "node:url";
import { site } from "../site.config.mjs";
import { todayIn, checkSourceUrl, ContentError } from "./content.mjs";
import { TOYS_SECTION } from "../src/toys.mjs";
import { fetchToy, draftText, slugOfTitle, cleanUrl, IMAGE_TYPES } from "./toy.mjs";

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const owner = opt("owner"), tags = (opt("tags") || "").split(/[,，、]/).map((t) => t.trim()).filter(Boolean), title = opt("title"), priceText = opt("price");   // --price "約 NT$7,000": your own words, for a toy with no shop page
const images = [];                                       // --image can be given several times: the first is the cover, the others go below it
for (let i = args.indexOf("--image"); i >= 0; i = args.indexOf("--image")) images.push(args.splice(i, 2)[1]);
const image = images[0];
const date = opt("date") ?? todayIn(site.timezone), out = opt("out") ?? join("backup", "toy-tmp");
let slug = opt("slug");
const url = args.find((a) => !a.startsWith("--"));

const die = (m) => { console.error(`error: ${m}`); process.exit(1); };
const owners = (site.sections.find((s) => s.id === "toys")?.grid?.owners ?? []).map((o) => o.id);
if ((!url && !image) || args.length > 1) die('usage: node scripts/toy-add.mjs <product-url> [--owner me|son] [--tags a,b] [--slug my-toy] [--title "..."] [--image <file>] [--date YYYY-MM-DD]\n       node scripts/toy-add.mjs --image <file> --title "..." [...]    (no link: a toy that is no longer sold)');
if (owner !== undefined && !owners.includes(owner)) die(`--owner must be one of ${owners.join(", ")} (site.config.mjs, toys grid.owners)`);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) die("--date must be YYYY-MM-DD");
if (image && !title) die("--image needs --title (nothing is fetched then)");
for (const f of images) if (!f || !existsSync(f)) die(`${f} not found`);

async function main() {
  let toy;
  if (image) {
    const ext = extname(image).toLowerCase().replace(/^\.jpeg$/, ".jpg");
    if (!Object.values(IMAGE_TYPES).includes(ext)) die(`--image must be a .jpg, .png or .webp file`);
    const extras = images.slice(1).map((f, i) => {
      const e = extname(f).toLowerCase().replace(/^\.jpeg$/, ".jpg");
      if (!Object.values(IMAGE_TYPES).includes(e)) die(`--image must be a .jpg, .png or .webp file`);
      return { name: `extra-${i + 1}${e}`, file: f };
    });
    toy = { title, price: "", source: url ? cleanUrl(checkSourceUrl(url, "product url")) : "", image: { name: `cover${ext}`, file: image }, extras };
    if (priceText) toy.price = priceText;
  } else {
    toy = await fetchToy(url, { fetch, lookup: (host) => lookup(host, { all: true }) });
    if (title) toy.title = title;
    if (priceText) toy.price = priceText;
  }
  slug ??= slugOfTitle(toy.title);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) die(`cannot derive an ASCII slug from "${toy.title}"; pass --slug some-words (lowercase, hyphens)`);

  const dir = join("content", TOYS_SECTION);
  const post = join(dir, `${date}-${slug}.zh.md`);
  const taken = existsSync(dir) ? readdirSync(dir).find((f) => new RegExp(`^\\d{4}-\\d{2}-\\d{2}-${slug}\\.(zh|en)\\.(md|html)$`).test(f)) : "";
  if (taken) die(`${join(dir, taken)} already exists (another --slug?)`);
  const pics = join(out, slug);
  if (existsSync(pics)) die(`${pics} already exists; move or remove it first`);
  if (existsSync(join(dir, "media", slug))) die(`content/${TOYS_SECTION}/media/${slug} already exists`);

  mkdirSync(pics, { recursive: true });
  const file = join(pics, toy.image.name);
  if (toy.image.file) copyFileSync(toy.image.file, file); else writeFileSync(file, toy.image.bytes);
  for (const x of toy.extras ?? []) copyFileSync(x.file, join(pics, x.name));
  mkdirSync(dir, { recursive: true });
  writeFileSync(post, draftText({ title: toy.title, source: toy.source, owner, tags, slug, imageName: toy.image.name, extraNames: (toy.extras ?? []).map((x) => x.name), price: toy.price, date, owners }));

  const orig = `../blog-originals/${TOYS_SECTION}/${slug}`;
  console.log(`title:   ${toy.title}${toy.price ? `\nprice:   ${toy.price}` : ""}\npicture: ${file} (from ${toy.image.file ? basename(toy.image.file) : toy.image.url})\ndraft:   ${post}`);
  console.log(`\nnext (on the host):\n  mkdir -p ../blog-originals/${TOYS_SECTION} && mv ${pics} ${orig}        # originals stay outside git`
    + `\n  scripts/photo.sh ${orig} content/${TOYS_SECTION}/media/${slug}\n  scripts/og-image.sh ${orig}/${toy.image.name} content/${TOYS_SECTION}/media/${slug} --square`
    + `\n  scripts/docker.sh npm run dev        # look at /zh/${TOYS_SECTION}/\n  edit ${post}: ${owner ? "" : "owner, "}${tags.length ? "" : "tags, "}summary; then remove draft: true`
    + `\n  scripts/media.sh push ${TOYS_SECTION} ${slug}; commit the post file`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e instanceof ContentError ? `error: ${e.message}` : e); process.exit(1); });
