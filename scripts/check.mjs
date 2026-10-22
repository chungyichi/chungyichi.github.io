// Run after `npm run build`: broken internal links, missing translations, dependency advisories.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, posix } from "node:path";
import { spawnSync } from "node:child_process";
import { site } from "../site.config.mjs";
import { loadPosts } from "./load.mjs";
import { buildModel, externalHosts } from "./content.mjs";

// Known advisories we accept for a limited time, with the reason. An expired entry fails the check.
const ACCEPTED_ADVISORIES = [
  { id: "GHSA-vfgh-jcmw-g37q", until: "2026-10-24", why: "markdown-it 15.0.2 DoS needs hostile Markdown; we render only our own posts with raw HTML off. 15.0.3 is under the 7-day release-age rule until 2026-10-23." },
  { id: "GHSA-gfr2-rv44-r23c", until: "2026-10-24", why: "same as above" },
];

let failed = false;
const fail = (m) => { console.error(`FAIL  ${m}`); failed = true; };
const warn = (m) => console.log(`warn  ${m}`);

// 1. internal links and assets
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
  console.log(`checked ${links} internal links`);
}

// 2. translations (a reminder, not a failure)
const all = loadPosts();
const { missing } = buildModel(all, site.langs, site.sections);
for (const p of missing) warn(`${p.section}/${p.date}-${p.slug}.${p.lang} has no translation`);
for (const p of all.filter((p) => p.draft)) warn(`${p.section}/${p.date}-${p.slug}.${p.lang} is a draft (not published)`);

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
