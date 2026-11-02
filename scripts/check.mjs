// Run after `npm run build`: broken internal links, missing translations, dependency advisories.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, posix } from "node:path";
import { spawnSync } from "node:child_process";
import { site } from "../site.config.mjs";
import { loadPosts } from "./load.mjs";
import { buildModel, externalHosts, selectPublished, todayIn } from "./content.mjs";
import { resolveAuthors, isAdultText as adultText, gridOf, TOYS_SECTION } from "../src/toys.mjs";
import { validateGear } from "../src/gear.mjs";
import { validateAchievements, lockedTitleProblems } from "../src/achievements.mjs";

// Known advisories we accept for a limited time, with the reason. An expired entry fails the check.
const ACCEPTED_ADVISORIES = [
  // { id: "GHSA-xxxx-xxxx-xxxx", until: "YYYY-MM-DD", why: "..." },
];

let failed = false;
const fail = (m) => { console.error(`FAIL  ${m}`); failed = true; };
const warn = (m) => console.log(`warn  ${m}`);

// 1. internal links and assets (a ?query or #fragment is cut off: /zh/tags/?tag=x must find /zh/tags/)
function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? htmlFiles(join(dir, e.name)) : e.name.endsWith(".html") ? [join(dir, e.name)] : []));
}
if (!existsSync("dist")) fail("dist/ is missing; run `npm run build` first");
else {
  let links = 0;
  for (const f of htmlFiles("dist")) {
    const text = readFileSync(f, "utf8");
    for (const m of text.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const u = m[1];
      if (/^(https?:|mailto:|#|data:)/.test(u)) continue;
      if (!u.startsWith("/")) { fail(`${f}: relative URL ${u} (use root-relative paths)`); continue; }
      links++;
      let path;
      try { path = posix.normalize(decodeURIComponent(u.split("#")[0].split("?")[0])); } catch { fail(`${f}: malformed URL ${u}`); continue; }   // like the server: decode, then look at the disk
      const target = join("dist", path);
      const ok = (existsSync(target) && statSync(target).isFile()) || existsSync(join(target, "index.html"));
      if (!ok) fail(`${f}: broken link ${u}`);
    }
  }
  // the grid pages and the tag page filter in the browser on the data file named by data-index (hashed, written by the build)
  let browsers = 0;
  for (const f of htmlFiles("dist")) {
    const m = /id="browse"[^>]*\sdata-index="([^"]+)"/.exec(readFileSync(f, "utf8"));
    if (!m) continue;
    browsers++;
    if (!existsSync(join("dist", m[1]))) fail(`${f}: data file ${m[1]} is missing`);
  }
  if (browsers === 0) fail("no grid or tag page names its data file (data-index)");
  console.log(`checked ${links} internal links, ${browsers} filter pages`);
}

// 2. translations (a reminder, not a failure)
const all = loadPosts();
const { missing } = buildModel(all, site.langs, site.sections);
if (site.languageSwitcher !== false) for (const p of missing) warn(`${p.section}/${p.date}-${p.slug}.${p.lang} has no translation`);
for (const p of all.filter((p) => !p.draft && !p.tags?.length)) fail(`${p.section}/${p.date}-${p.slug}.${p.lang} has no tag (every published post needs 1 to 3)`);
for (const p of all.filter((p) => p.draft)) warn(`${p.section}/${p.date}-${p.slug}.${p.lang} is a draft (not published)`);


// 2a. picture grids (toys, books): a published post has an owner from the section's config; a toy also at least one picture (books and games none) (the grid needs thumb.webp; the page a picture in the body). A book needs none.
// `source` is checked when the post is parsed. Pictures come from the media release, so this runs after `scripts/media.sh pull` in the deploy.
for (const sec of site.sections.filter((s) => s.grid)) {
  const owners = (sec.grid.owners ?? []).map((o) => o.id);
  for (const p of all.filter((p) => p.section === sec.id && !p.draft)) {
    const name = `${p.section}/${p.date}-${p.slug}.${p.lang}`;
    if (!owners.length) { /* no owners in this grid (games) */ }
    else if (!p.owner) fail(`${name} has no owner (add owner: ${owners.join(" | ")})`);
    else if (!owners.includes(p.owner)) fail(`${name}: owner '${p.owner}' is not in site.config.mjs ${sec.id} grid.owners (${owners.join(", ")})`);
    if (sec.grid.platforms && !p.platform?.length) fail(`${name} has no platform (add platform: ${sec.grid.platforms.map((x) => x.id).join(" | ")}, several comma separated)`);
    const dir = join("content", sec.id, "media", p.slug);
    const onDisk = existsSync(dir) ? readdirSync(dir).filter((f) => /\.(webp|jpe?g|png)$/i.test(f)) : [];
    if (adultText(p) || sec.id !== "toys") continue;           // a book or a game needs no cover (the card shows its title); toys keep the rule
    if (!new RegExp(`<img\\b[^>]*\\ssrc="/media/${sec.id}/${p.slug}/`).test(p.html) && !onDisk.length) fail(`${name} has no picture (put one in ${dir}/ and show it in the post)`);
    if (!onDisk.includes("thumb.webp")) warn(`${name} has no ${dir}/thumb.webp (scripts/og-image.sh); the grid shows a blank card`);
  }
}

// 2d. equipment slots (site.config.mjs gear): known people, slots and rarities; every item is a published toy or game (a book is refused: it is read, not equipped); an item once per person;
// profiles (level, title, mood) and the achievements list (rule kinds, fields, items)
{
  const owners = (gridOf(TOYS_SECTION)?.owners ?? []).map((o) => o.id), published = selectPublished(all, todayIn(site.timezone)), keys = published.map((p) => `${p.section}/${p.slug}`);
  const achievementIds = (site.achievements ?? []).map((a) => a.id);
  for (const m of validateAchievements(site.achievements, { owners, published: keys })) fail(m);
  for (const m of validateGear(site.gear, { owners, published: keys, achievementIds })) fail(m);
  // a profile title "ach:<id>" must be unlocked (zh posts: the default language)
  for (const m of lockedTitleProblems(site.gear, site.achievements, published.filter((p) => p.lang === site.defaultLang), owners)) fail(m);
}

// 2c. adult books you only read (own: no, tag 成人) are text only: no source link and no picture (body or media folder), draft or not.
for (const p of all.filter((p) => adultText(p))) {
  const name = `${p.section}/${p.date}-${p.slug}.${p.lang}`, dir = join("content", p.section, "media", p.slug);
  if (p.source) fail(`${name}: an adult book (own: no, tag 成人) has no source link (text only)`);
  if (/<img\b/.test(p.html) || (existsSync(dir) && readdirSync(dir).some((f) => /\.(webp|jpe?g|png)$/i.test(f)))) fail(`${name}: an adult book (own: no, tag 成人) has no picture (text only)`);
}

// 2b. books: every author is in the list in site.config.mjs (one spelling per author)
for (const p of all.filter((p) => p.author)) {
  for (const u of resolveAuthors(p.author).unknown) fail(`${p.section}/${p.date}-${p.slug}.${p.lang}: author "${u.name}" is not in site.config.mjs (sections books, grid.authors). Nearest: ${u.nearest.join(", ") || "(none)"}. A new author is a new entry there: { name: "${u.name}", aliases: [] }`);
}

// 3. private material must never be tracked or built
{
  const ls = spawnSync("git", ["ls-files", "content/_private", "backup"], { encoding: "utf8" });
  if (ls.status === 0 && ls.stdout.trim()) fail(`private files are tracked by git (they would be public): ${ls.stdout.trim().split("\n").slice(0, 5).join(", ")}`);
  const leaked = existsSync("dist") ? htmlFiles("dist").filter((f) => /Private \(will not be published\)|私有（不會發佈）/.test(readFileSync(f, "utf8"))) : [];
  if (leaked.length) fail(`private posts appear in the build: ${leaked.join(", ")}`);
  const privatePosts = loadPosts({ includePrivate: true }).filter((p) => p.private);
  const indexFiles = existsSync("dist/search") ? readdirSync("dist/search").map((f) => join("dist/search", f)) : [];
  for (const f of indexFiles) for (const p of privatePosts) if (readFileSync(f, "utf8").includes(JSON.stringify(p.title).slice(1, -1))) fail(`private post "${p.title}" appears in the search index ${f}`);
  const priv = privatePosts.length;
  if (priv) warn(`${priv} private post(s) exist locally (not published, not tracked)`);
}

// 3a. pictures must never be committed (they live in the "media" release so that a deleted post leaves no blob in git history)
{
  const ls = spawnSync("git", ["ls-files", "content"], { encoding: "utf8" });
  const pics = ls.status === 0 ? ls.stdout.split("\n").filter((f) => /\.(webp|jpe?g|png|gif|avif|heic)$/i.test(f)) : [];
  if (pics.length) fail(`pictures are tracked by git (${pics.slice(0, 3).join(", ")}${pics.length > 3 ? ", ..." : ""}); keep them out: scripts/media.sh push <section> <slug>, and git rm --cached`);
}

// 3b. trusted (hand-written, unsanitized) posts: list them and the outside hosts they use
for (const p of loadPosts({ includePrivate: true }).filter((p) => p.trusted)) {
  const hosts = externalHosts([p.html, p.css, p.js].join("\n"));
  warn(`${p.section}/${p.date}-${p.slug}.${p.lang} is trusted (not sanitized)${p.js ? ", has its own script" : ""}${hosts.length ? `; talks to: ${hosts.join(", ")}` : ""}`);
}

// 4. dependency advisories
// npm's audit endpoint can hang (it did on 2026-10-22 and stalled a deploy for 12+ minutes): give up after 60 s and say so.
const r = spawnSync("npm", ["audit", "--json"], { encoding: "utf8", timeout: 60_000, killSignal: "SIGKILL" });
let report;
try { report = JSON.parse(r.stdout || "{}"); } catch { report = null; }
if (r.error?.code === "ETIMEDOUT") warn("npm audit timed out after 60 s (npm audit service not answering); skipped, run it again later");
else if (!report || report.error) warn("npm audit could not run (offline?); skipped");
else {
  const today = new Date().toISOString().slice(0, 10);
  for (const [name, v] of Object.entries(report.vulnerabilities || {})) {
    if (!["high", "critical"].includes(v.severity)) continue;
    const ids = (v.via || []).filter((x) => typeof x === "object" && x.url).map((x) => x.url.split("/").pop());
    const unaccepted = ids.filter((id) => !ACCEPTED_ADVISORIES.some((a) => a.id === id && a.until >= today));
    const expired = ids.filter((id) => ACCEPTED_ADVISORIES.some((a) => a.id === id && a.until < today));
    if (ids.length === 0 || unaccepted.length) fail(`${name}: ${v.severity} advisory ${unaccepted.join(", ") || "(transitive)"}${expired.length ? " (acceptance EXPIRED)" : ""}; run npm audit`);
    else warn(`${name}: accepted advisory ${ids.join(", ")} until ${ACCEPTED_ADVISORIES.find((a) => ids.includes(a.id)).until}`);
  }
}

console.log(failed ? "check FAILED" : "check ok");
process.exit(failed ? 1 : 0);
