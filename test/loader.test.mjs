import test from "node:test";
import assert from "node:assert/strict";
import { loaderState } from "../src/loader-core.mjs";

test("a load that ends before the delay never shows anything (no flash)", () => {
  for (const elapsed of [0, 50, 199, 500, 5000]) {
    const s = loaderState({ elapsed, doneAt: 120 });
    assert.equal(s.visible, false);
    assert.equal(s.over, true);
  }
});

test("nothing is shown before the delay, then the water starts empty", () => {
  assert.equal(loaderState({ elapsed: 100, real: 50 }).visible, false);
  const at = loaderState({ elapsed: 200, real: 50 });
  assert.deepEqual(at, { visible: true, pct: 0, over: false });
});

test("once shown it stays at least `min` ms even if the data arrives right after the delay", () => {
  const o = { doneAt: 250, delay: 200, min: 700 };
  assert.equal(loaderState({ ...o, elapsed: 300 }).visible, true);
  assert.equal(loaderState({ ...o, elapsed: 899 }).visible, true);
  assert.equal(loaderState({ ...o, elapsed: 899 }).over, false);
  assert.equal(loaderState({ ...o, elapsed: 900 }).over, true);
  assert.equal(loaderState({ ...o, elapsed: 900 }).visible, false);
});

test("the water fills over `fill` ms and reaches 100 before the indicator goes away", () => {
  const o = { doneAt: 210, delay: 200, min: 700, fill: 700 };
  const pcts = [200, 300, 500, 700, 899].map((elapsed) => loaderState({ ...o, elapsed }).pct);
  assert.deepEqual(pcts, [0, 14, 43, 71, 100]);
  assert.ok(pcts.every((p, i) => i === 0 || p >= pcts[i - 1]), "never goes down");
});

test("while running, the water never passes the real progress and never shows 100", () => {
  assert.equal(loaderState({ elapsed: 5000, real: 30 }).pct, 30);
  assert.equal(loaderState({ elapsed: 5000, real: 100 }).pct, 99);
  assert.equal(loaderState({ elapsed: 5000, real: -5 }).pct, 0);
  assert.equal(loaderState({ elapsed: 5000, real: 30 }).visible, true);
});

test("without a true progress the clock drives the water, up to 99, never 100 before done", () => {
  assert.deepEqual([200, 560, 1000, 5000].map((elapsed) => loaderState({ elapsed }).pct), [0, 51, 99, 99]);
});

test("a slow load shows for as long as it takes and goes away the moment it is done (the minimum time is long over)", () => {
  const o = { delay: 200, min: 700, doneAt: 3900 };
  assert.deepEqual(loaderState({ ...o, elapsed: 3899 }), { visible: true, pct: 100, over: false });
  assert.deepEqual(loaderState({ ...o, elapsed: 3900 }), { visible: false, pct: 100, over: true });
  assert.equal(loaderState({ delay: 200, min: 700, doneAt: 3000, elapsed: 4000 }).over, true);
});

test("full-screen use: the shark and water play for the full 2.4 s even when the load is instant", () => {
  const o = { doneAt: 300, delay: 0, min: 2400, fill: 2400 };
  assert.equal(loaderState({ ...o, elapsed: 1200 }).pct, 50);
  assert.equal(loaderState({ ...o, elapsed: 2399 }).over, false);
  assert.equal(loaderState({ ...o, elapsed: 2400 }).over, true);
});
