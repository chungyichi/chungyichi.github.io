import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, existsSync, copyFileSync, chmodSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// A fake `gh` that keeps release assets in a folder, so media.sh runs for real without touching GitHub.
const FAKE_GH = `#!/usr/bin/env node
const fs = require("fs"), path = require("path"), { spawnSync } = require("child_process");
const S = process.env.STORE, a = process.argv.slice(2); fs.mkdirSync(S, { recursive: true });
const opt = (n) => { const i = a.indexOf(n); return i < 0 ? "" : a[i + 1]; };
const assets = () => fs.readdirSync(S).sort().map((name) => ({ name, size: fs.statSync(path.join(S, name)).size }));
const cmd = a[0] + " " + a[1];
if (cmd === "release view") {
  const q = opt("-q");
  if (!q) { console.log(JSON.stringify({ assets: assets() })); process.exit(0); }
  let m;
  if (q === ".assets[].name") assets().forEach((x) => console.log(x.name));
  else if ((m = /select\\(\\.name==\\"(.+?)\\"\\) \\| \\.size/.exec(q))) assets().filter((x) => x.name === m[1]).forEach((x) => console.log(x.size));
  else { console.error("fake gh: query " + q); process.exit(1); }
} else if (cmd === "release create") {
} else if (cmd === "release upload") fs.copyFileSync(a[3], path.join(S, path.basename(a[3])));
else if (cmd === "release delete-asset") fs.rmSync(path.join(S, a[3]), { force: true });
else if (cmd === "release download") {
  const re = new RegExp("^" + opt("--pattern").replace(/[.]/g, "\\\\.").replace(/\\*/g, ".*") + "$");
  for (const x of assets()) if (re.test(x.name)) fs.copyFileSync(path.join(S, x.name), path.join(opt("--dir"), x.name));
} else { console.error("fake gh: unsupported: " + a.join(" ")); process.exit(1); }
`;
const repo = resolve(".");
function setup() {
  const d = mkdtempSync(join(tmpdir(), "msh-"));
  mkdirSync(join(d, "bin")); writeFileSync(join(d, "bin/gh"), FAKE_GH); chmodSync(join(d, "bin/gh"), 0o755);
  mkdirSync(join(d, "scripts")); for (const f of ["media.sh", "media-extract.sh"]) copyFileSync(join(repo, "scripts", f), join(d, "scripts", f));
  mkdirSync(join(d, "content")); mkdirSync(join(d, "store"));
  return d;
}
const media = (d, ...args) => spawnSync("bash", ["scripts/media.sh", ...args], { cwd: d, encoding: "utf8", env: { ...process.env, PATH: `${join(d, "bin")}:${process.env.PATH}`, STORE: join(d, "store") } });
const pic = (d, section, slug, name = "a.webp") => { const p = join(d, "content", section, "media", slug); mkdirSync(p, { recursive: true }); writeFileSync(join(p, name), slug + name); };
const store = (d) => readdirSync(join(d, "store")).sort();
const wait = () => new Promise((r) => setTimeout(r, 1100));   // bundle names carry seconds

test("push puts pictures of different sections in one bundle; pull restores them all", async () => {
  const d = setup();
  pic(d, "toys", "car"); assert.equal(media(d, "push", "toys", "car").status, 0);
  await wait(); pic(d, "life", "trip"); assert.equal(media(d, "push", "life", "trip").status, 0);
  const bundles = store(d).filter((n) => n.startsWith("media-all-"));
  assert.equal(bundles.length, 2, store(d).join());                       // newest + the previous one as a way back
  cpSync(join(d, "content"), join(d, "content-old"), { recursive: true });
  spawnSync("rm", ["-rf", join(d, "content")]); mkdirSync(join(d, "content"));
  const r = media(d, "pull"); assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(join(d, "content/toys/media/car/a.webp")) && existsSync(join(d, "content/life/media/trip/a.webp")));
});

test("delete really removes the pictures from every bundle left", async () => {
  const d = setup();
  pic(d, "toys", "car"); media(d, "push", "toys", "car");
  await wait(); pic(d, "toys", "bus"); media(d, "push", "toys", "bus");
  await wait(); const r = media(d, "delete", "toys", "car"); assert.equal(r.status, 0, r.stderr);
  const left = store(d); assert.equal(left.length, 1, left.join());
  spawnSync("rm", ["-rf", join(d, "content")]); mkdirSync(join(d, "content")); media(d, "pull");
  assert.ok(!existsSync(join(d, "content/toys/media/car")) && existsSync(join(d, "content/toys/media/bus/a.webp")));
});

test("migrate turns per-post archives into a bundle and keeps them until prune-old", () => {
  const d = setup();
  for (const [s, n] of [["toys", "car"], ["life", "trip"]]) {
    pic(d, s, n);
    spawnSync("tar", ["-cf", join(d, "store", `media-${s}-${n}.tar`), "-C", join(d, "content"), `${s}/media/${n}/a.webp`]);
  }
  let r = media(d, "migrate"); assert.equal(r.status, 0, r.stderr);
  assert.equal(store(d).filter((n) => n.startsWith("media-all-")).length, 1);
  assert.equal(store(d).length, 3);
  r = media(d, "prune-old"); assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(store(d).filter((n) => !n.startsWith("media-all-")), []);
  spawnSync("rm", ["-rf", join(d, "content")]); mkdirSync(join(d, "content")); media(d, "pull");
  assert.ok(existsSync(join(d, "content/toys/media/car/a.webp")) && existsSync(join(d, "content/life/media/trip/a.webp")));
});

test("prune-old refuses when there is no bundle", () => {
  const d = setup(); writeFileSync(join(d, "store/media-toys-car.tar"), "x");
  assert.notEqual(media(d, "prune-old").status, 0);
  assert.deepEqual(store(d), ["media-toys-car.tar"]);
});
