// Run after `npm run build`: broken internal links, missing translations, dependency advisories.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, posix } from "node:path";
import { spawnSync } from "node:child_process";
import { site } from "../site.config.mjs";
import { loadPosts } from "./load.mjs";
import { buildModel } from "./content.mjs";

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
      const path = posix.normalize(u.split("#")[0].split("?")[0]);
      const target = join("dist", path);
      const ok = (existsSync(target) && statSync(target).isFile()) || existsSync(join(target, "index.html"));
      if (!ok) fail(`${f}: broken link ${u}`);
    }
  }
  console.log(`checked ${links} internal links`);
}

// 2. translations (a reminder, not a failure)
const all = loadPosts();
const { missing } = buildModel(all, site.langs);
for (const p of missing) warn(`${p.date}-${p.slug}.${p.lang}.md has no translation`);
for (const p of all.filter((p) => p.draft)) warn(`${p.date}-${p.slug}.${p.lang}.md is a draft (not published)`);

// 3. dependency advisories
const r = spawnSync("npm", ["audit", "--json"], { encoding: "utf8" });
let report;
try { report = JSON.parse(r.stdout || "{}"); } catch { report = null; }
if (!report || report.error) warn("npm audit could not run (offline?); skipped");
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
