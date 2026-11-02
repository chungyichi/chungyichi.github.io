import test from "node:test";
import assert from "node:assert/strict";
import { OVERVIEW_TUNE } from "../src/gear.mjs";
import { maxOverlap, layoutWords, project, sizeOf, dragRotate, step, settled, faceYaw, flickSpeed, wrapAngle, wordStyle, DEFAULTS, REST, TAU, CENTER_BOX, CENTER_Z, maxIntrusion } from "../src/wordcloud.mjs";

const words = (n) => Array.from({ length: n }, (_, i) => ({ label: `w${i}`, count: 1 + ((i * 7) % 11) }));

test("layout: deterministic, one item per word in input order, finite numbers", () => {
  for (const n of [0, 1, 2, 5, 17, 60]) {
    const a = layoutWords(words(n)), b = layoutWords(words(n));
    assert.deepEqual(a, b);
    assert.equal(a.length, n);
    a.forEach((it, i) => { assert.equal(it.i, i); assert.equal(it.label, `w${i}`); for (const k of ["theta", "y", "r", "rem", "weight"]) assert.ok(Number.isFinite(it[k]), `${k}`); });
  }
});

test("layout: deterministic and on the sphere", () => {
  const items = layoutWords(words(30));
  assert.deepEqual(items, layoutWords(words(30)));
  for (const it of items) {
    assert.ok(Math.abs(it.theta - Math.atan2(it.x, it.z)) < 1e-9);
    assert.ok(Math.abs(Math.hypot(it.x, it.y, it.z) - 1) < 1e-9);
  }
});

test("layout: the heaviest word starts at the front; heavy words are nearer the middle of the sphere", () => {
  const it = layoutWords(words(30)), h = it.reduce((a, x) => (x.count > a.count ? x : a));
  assert.ok(Math.abs(h.theta) < 0.6);
  const avg = (l) => l.reduce((a, x) => a + Math.abs(x.y), 0) / l.length;
  assert.ok(avg(it.filter((x) => x.count >= 9)) < avg(it.filter((x) => x.count <= 2)));
});

test("sphere: the far side is smaller and fainter than the near side (hollow)", () => {
  const items = layoutWords(words(30)), ps = items.map((it) => project(it, 0, DEFAULTS.restPitch));
  const near = ps.filter((p) => p.depth > 0.7), far = ps.filter((p) => p.depth < 0.3);
  assert.ok(near.length && far.length);
  assert.ok(Math.min(...near.map((p) => p.scale)) > Math.max(...far.map((p) => p.scale)));
  assert.ok(Math.min(...near.map((p) => p.opacity)) > Math.max(...far.map((p) => p.opacity)));
});

// the real data: the brother's cloud has 18 tags, the heaviest with count 29 and most of the others 2; at most 40 words
const real = (n) => Array.from({ length: n }, (_, i) => ({ label: ["戰鬥陀螺", "Beyblade X", "樂高", "Gundam", "鋼彈", "Transformers", "變形金剛", "Hot Wheels", "風火輪", "Pokemon", "寶可夢", "Tamiya", "四驅車", "Marvel", "Mega Bloks", "Nerf", "Bakugan", "Funko"][i] ?? `Tag word ${i}`, count: i === 0 ? 29 : i < 5 ? 5 : 2 }));

test("collisions: 18 words do not overlap at the rest pose", () => {
  assert.ok(maxOverlap(layoutWords(real(18))) <= 0.05, `${maxOverlap(layoutWords(real(18)))}`);
});

test("collisions: 40 words overlap only a little at the rest pose, the big ones never", () => {
  const items = layoutWords(real(40));
  assert.ok(maxOverlap(items) <= 0.35, `${maxOverlap(items)}`);
  assert.ok(maxOverlap(items.filter((x) => x.rem >= 1)) <= 0.05, "big");
});

test("collisions: the brother's real 18 tags (29, 29, 14, 10, 5, 3, 2, 2, 2, then 1s)", () => {
  const labels = ["Beyblade X", "戰鬥陀螺", "UX", "CX", "BX", "爆米花桶", "環球影城", "福音戰士", "迪士尼", "CookieAnn", "小小兵", "怪獸電力公司", "機器人", "水壺", "海賊王", "變形", "超合金", "麥當勞"];
  const counts = [29, 29, 14, 10, 5, 3, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  assert.ok(maxOverlap(layoutWords(labels.map((label, i) => ({ label, count: counts[i] })))) <= 0.05);
});

test("collisions: the relaxation does not move words that are already apart", () => {
  const a = layoutWords([{ label: "a", count: 1 }, { label: "b", count: 1 }]);
  assert.ok(maxOverlap(a) === 0);
});

test("size: grows with count within min..max rem, equal counts give the middle", () => {
  const a = sizeOf(1, 1, 9), b = sizeOf(5, 1, 9), c = sizeOf(9, 1, 9);
  assert.equal(a.rem, DEFAULTS.minRem); assert.equal(c.rem, DEFAULTS.maxRem);
  assert.ok(a.rem < b.rem && b.rem < c.rem);
  assert.ok(a.weight <= b.weight && b.weight <= c.weight);
  assert.ok(Math.abs(sizeOf(4, 4, 4).rem - (DEFAULTS.minRem + DEFAULTS.maxRem) / 2) < 1e-9);
});

test("project: near is bigger, brighter and on top; no NaN at any turn or tilt", () => {
  const it = { x: 0, y: 0.1, z: 1 };
  const near = project(it, 0, 0), far = project(it, Math.PI, 0);
  assert.ok(near.scale > far.scale && near.opacity > far.opacity && near.z > far.z && near.depth > far.depth);
  assert.ok(near.live && !far.live);
  for (let yaw = -7; yaw < 7; yaw += 0.7) for (const pitch of [-1.1, 0, 0.22, 1.1]) for (const p of Object.values(project(it, yaw, pitch))) assert.ok(typeof p === "boolean" || Number.isFinite(p));
  const s = wordStyle(near);
  assert.equal(s["--s"], near.scale.toFixed(3));
});

test("project: a quarter turn moves the word from the front to the side", () => {
  const p = project({ x: 0, y: 0, z: 1 }, Math.PI / 2, 0);
  assert.ok(Math.abs(p.x - 1 * p.scale) < 1e-9 && p.depth < 0.6);
});

test("drag: pixels turn and tilt, pitch is clamped, yaw wraps", () => {
  const r = dragRotate({ yaw: 0, pitch: 0 }, 100, 50);
  assert.ok(Math.abs(r.yaw - 100 * DEFAULTS.dragRad) < 1e-9 && Math.abs(r.pitch - 50 * DEFAULTS.dragRad) < 1e-9);
  assert.equal(dragRotate({ yaw: 0, pitch: 0 }, 0, 1e6).pitch, DEFAULTS.maxPitch);
  assert.equal(dragRotate({ yaw: 0, pitch: 0 }, 0, -1e6).pitch, -DEFAULTS.maxPitch);
  assert.ok(Math.abs(dragRotate({ yaw: 3, pitch: 0 }, 100, 0).yaw) <= Math.PI);
  assert.equal(flickSpeed(0, 1e6, 0.016), DEFAULTS.maxSpeed);
});

test("inertia: a flick decays back to the auto-spin speed and the tilt eases to rest", () => {
  let s = { yaw: 0, pitch: 0.9, vyaw: 6, vpitch: 0, target: null };
  for (let i = 0; i < 60 * 12; i++) s = step(s, 1 / 60);
  assert.ok(Math.abs(s.vyaw - DEFAULTS.spin) < 1e-3);
  assert.ok(Math.abs(s.pitch - DEFAULTS.restPitch) < 1e-2);
  let t = { ...REST, vyaw: 6 }; const v0 = Math.abs(t.vyaw - DEFAULTS.spin);
  t = step(t, 0.5); assert.ok(Math.abs(t.vyaw - DEFAULTS.spin) < v0);
});

test("reduced motion: no spin, no inertia; settled without a loop", () => {
  const s = step({ yaw: 1, pitch: 0.5, vyaw: 6, vpitch: 3, target: null }, 0.016, { reduced: true });
  assert.deepEqual(s, { yaw: 1, pitch: 0.5, vyaw: 0, vpitch: 0, target: null });
  assert.ok(settled(s, { reduced: true }));
  assert.ok(!settled(REST));
  assert.ok(settled({ yaw: 1, pitch: DEFAULTS.restPitch, vyaw: 0, vpitch: 0, target: null }, { spin: 0 }));
});

test("focus: faceYaw brings a word to the front by the short way and step arrives", () => {
  const theta = 2, from = 0.3, y = faceYaw(theta, from);
  assert.ok(Math.abs(wrapAngle(theta + y)) < 1e-9);
  assert.ok(Math.abs(y - from) <= Math.PI + 1e-9);
  let s = { ...REST, target: y };
  for (let i = 0; i < 300 && s.target != null; i++) s = step(s, 1 / 60);
  assert.equal(s.target, null);
  assert.ok(Math.abs(wrapAngle(theta + s.yaw)) < 0.01);
  assert.ok(TAU > 6);
});

test("center: the near words keep out of the middle box at rest, nothing overlaps much, the layout is deterministic and stays on the sphere", () => {
  const labels = ["MAYDAY MAX", "迪士尼美語世界…", "Microsoft Flight…", "超合金 佛朗基將軍", "CX-16 龍王閃擊 異…", "環球影城 初號機爆米…", "模擬飛行2020", "Elden Ring", "Death Stranding", "UPPSTA", "Dave the Diver", "香港迪士尼…", "MiVi 1/6 破壞之王…", "小小兵水壺", "BX-01 戰神之劍", "費雪牌 動物鋼琴", "POPCORN 麥當勞變…", "一二三四五六七八九十…"];
  const ws = labels.map((label, i) => ({ label, count: 1 + ((i * 5) % 6) }));
  for (const n of [1, 3, 6, 10, 18]) {
    const set = ws.slice(0, n), o = { ...DEFAULTS, ...OVERVIEW_TUNE, avoid: CENTER_BOX }, a = layoutWords(set, o);
    assert.deepEqual(a, layoutWords(set, o));
    assert.ok(maxIntrusion(a, o) < 0.05, `n=${n}: intrusion ${maxIntrusion(a, o)}`);
    assert.ok(maxOverlap(a, o) < 0.3, `n=${n}: overlap ${maxOverlap(a, o)}`);
    for (const it of a) assert.ok(Math.abs(Math.hypot(it.x, it.y, it.z) - 1) < 1e-9, "still on the sphere");
  }
  // the box is what makes the difference: without it a word may sit in the middle
  const one = layoutWords([{ label: "Solo", count: 1 }], { ...DEFAULTS, ...OVERVIEW_TUNE });
  assert.ok(maxIntrusion(one, { ...DEFAULTS, avoid: CENTER_BOX }) > 0.5);
});

test("center: it sits between the near half and the far half of the words (z-index), and maxIntrusion is 0 without a box", () => {
  const items = layoutWords(words(18));
  assert.equal(maxIntrusion(items), 0);
  const zs = items.map((it) => wordStyle(project(it, REST.yaw, REST.pitch)).zIndex);
  assert.ok(zs.some((z) => z > CENTER_Z) && zs.some((z) => z < CENTER_Z), "some words in front of the centre, some behind");
  assert.ok(CENTER_BOX.w < 1.4 && CENTER_BOX.h < 1.6);
});
