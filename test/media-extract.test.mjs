import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const sh = (args, opts = {}) => spawnSync(args[0], args.slice(1), { encoding: "utf8", ...opts });
function workdir() {
  const d = mkdtempSync(join(tmpdir(), "mx-"));
  mkdirSync(join(d, "src/life/media/trip"), { recursive: true });
  writeFileSync(join(d, "src/life/media/trip/a.webp"), "x");
  mkdirSync(join(d, "out"));
  return d;
}
const extract = (d, tar) => sh(["bash", "scripts/media-extract.sh", join(d, tar), join(d, "out")]);

test("a well-formed archive is unpacked", () => {
  const d = workdir();
  assert.equal(sh(["tar", "-cf", join(d, "ok.tar"), "-C", join(d, "src"), "life/media/trip/a.webp"]).status, 0);
  const r = extract(d, "ok.tar");
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(join(d, "out/life/media/trip/a.webp")));
});

test("directories, links and odd paths are refused before anything is extracted", () => {
  const d = workdir();
  symlinkSync("/etc/passwd", join(d, "src/life/media/trip/link.webp"));
  writeFileSync(join(d, "src/life/media/trip/script.js"), "x");
  writeFileSync(join(d, "src/evil.webp"), "x");
  const cases = {
    "dir.tar": ["life/media/trip"],                              // directory entries
    "link.tar": ["life/media/trip/link.webp"],                   // symlink
    "ext.tar": ["life/media/trip/script.js"],                    // not a picture
    "shallow.tar": ["evil.webp"],                                // not under <section>/media/<slug>/
  };
  for (const [name, files] of Object.entries(cases)) {
    sh(["tar", "-cf", join(d, name), "-C", join(d, "src"), ...files]);
    const r = extract(d, name);
    assert.notEqual(r.status, 0, name);
    assert.match(r.stderr, /refusing/, name);
  }
  assert.ok(!existsSync(join(d, "out/life")), "nothing was extracted");
});

test("a path-traversal archive is refused", () => {
  const d = workdir();
  const r0 = sh(["tar", "-cf", join(d, "t.tar"), "-C", join(d, "src/life/media/trip"), "--transform", "s#a.webp#../../../x.webp#", "a.webp"]);
  assert.equal(r0.status, 0, r0.stderr);
  const r = extract(d, "t.tar");
  assert.notEqual(r.status, 0);
  assert.ok(!existsSync(join(d, "x.webp")));
});
