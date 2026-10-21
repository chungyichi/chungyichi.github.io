// npm run new -- "Post title" [--lang zh|en] [--slug my-slug] [--date YYYY-MM-DD]
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { site } from "../site.config.mjs";
import { todayIn } from "./content.mjs";

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const lang = opt("lang") ?? site.defaultLang;
const date = opt("date") ?? todayIn(site.timezone);
let slug = opt("slug");
const title = args.join(" ").trim();

const die = (m) => { console.error(`error: ${m}`); process.exit(1); };
if (!title) die('usage: npm run new -- "Post title" [--lang zh|en] [--slug my-slug] [--date YYYY-MM-DD]');
if (!site.langs.includes(lang)) die(`--lang must be one of ${site.langs.join(", ")}`);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) die("--date must be YYYY-MM-DD");
slug ??= title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) die(`cannot derive an ASCII slug from "${title}"; pass --slug some-words (lowercase, hyphens)`);

const file = join("content/posts", `${date}-${slug}.${lang}.md`);
if (existsSync(file)) die(`${file} already exists`);
mkdirSync("content/posts", { recursive: true });
writeFileSync(file, `---\ntitle: ${JSON.stringify(title)}\nsummary: ""\ndraft: true\n---\n\n`);
console.log(`created ${file}\nfill in 'summary', write the post, then set draft: false (or delete that line) to publish.`);
const other = site.langs.find((l) => l !== lang);
if (other) console.log(`for a ${other} version, create ${date}-${slug}.${other}.md with the same slug (or any date; the slug links them).`);
