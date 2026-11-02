// The maths of the 3D word cloud (src/WordCloud.tsx) on a hollow sphere. Pure: no DOM, no clock, no random, so the server and the browser
// compute the same static pose and the tests can pin it down.
// World: units of the cloud radius, y up, x right, z towards the camera.
// Screen y points down.

export const TAU = Math.PI * 2;
/** The look and the motion; every number the page can tune. Angles in radians, times in seconds. */
export const DEFAULTS = {
  perspective: 4,        // camera distance in cloud radii: smaller = stronger depth
  minRem: 0.8, maxRem: 1.6,   // font size of the lightest / the heaviest word
  minWeight: 400, maxWeight: 700,
  spin: 0.35,            // auto-spin, rad/s about the vertical axis (about 18 s a turn)
  inertiaTau: 0.9,       // seconds for a flick's extra speed to fade to 1/e
  restPitch: 0.22,       // the resting tilt (the camera looks a little from above)
  pitchEase: 0.8,        // seconds for the tilt to come back to restPitch
  maxPitch: 1.1,         // the most the cloud can be tilted by dragging
  maxSpeed: 8,           // cap of a flick, rad/s
  dragRad: 0.012,        // rad per dragged pixel
  boxR: 6.5,             // the cloud's radius in rem that the overlap check assumes (--wc-R is 9.5rem at most, 26vw on a phone)
  fitFrom: 20, fitMin: 0.72,   // above this many words the labels shrink by sqrt(fitFrom / n), not below fitMin
  nearDepth: 0.4,        // words nearer than this (0 far .. 1 near) are kept apart at rest
  fade: 0.14,            // the opacity of the farthest word (the nearest is 1)
  avoid: null,           // { w, h } in cloud radii: a box in the middle that the near words keep out of at rest (the `center` of the cloud), or null
};
/** The box that a cloud with a `center` keeps free (cloud radii; the figure is about 0.66 wide and 0.84 tall). */
export const CENTER_BOX = { w: 0.95, h: 0.9 };
/** The z-index of the centre: words with a bigger one (z = depth * 1000, so the near half) pass in front of it, the far half behind. */
export const CENTER_Z = 500;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const wrapAngle = (a) => { const w = ((a + Math.PI) % TAU + TAU) % TAU - Math.PI; return w; };

/** Font size in rem and weight from a count within [min, max] of all counts (sqrt scale: the biggest do not swamp the rest). */
export function sizeOf(count, min, max, o = DEFAULTS, fit = 1) {
  const t = max > min ? Math.sqrt(clamp((count - min) / (max - min), 0, 1)) : 0.5;
  return { rem: (o.minRem + (o.maxRem - o.minRem) * t) * fit, weight: Math.round((o.minWeight + (o.maxWeight - o.minWeight) * t) / 100) * 100 };
}

const GOLDEN = 2.399963;
const yawPoint = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return { ...p, x: p.x * c + p.z * s, z: p.z * c - p.x * s }; };
const norm = (v) => { const l = Math.hypot(v.x, v.y, v.z) || 1; return { ...v, x: v.x / l, y: v.y / l, z: v.z / l }; };

/** n points on a hollow sphere (Fibonacci), the ones nearest the equator first (the heavy words go there). */
function spherePoints(n) {
  const pts = Array.from({ length: n }, (_, k) => {
    const y = 0.9 * (1 - (2 * (k + 0.5)) / n), r = Math.sqrt(1 - y * y), a = k * GOLDEN;
    return { k, x: r * Math.sin(a), y, z: r * Math.cos(a) };
  });
  return pts.sort((a, b) => Math.abs(a.y) - Math.abs(b.y) || a.k - b.k);
}

/** The size of a word's label in rem (without the perspective scale): CJK characters are 1 em wide, others about 0.56 em; the padding is 0.5 em. */
export function boxOf(it) {
  let w = 0.5;
  for (const ch of it.label) w += ch.codePointAt(0) >= 0x2e80 ? 1 : it.weight >= 600 ? 0.6 : 0.56;
  return { w: w * it.rem, h: 1.4 * it.rem };
}

/** Overlap of two labels on screen at a pose, as a share of the smaller one's area (0 = apart), and the pair's boxes. */
function overlapOf(a, b, pa, pb, o) {
  const A = boxOf(a), B = boxOf(b), k = 1 / o.boxR;
  const w1 = A.w * pa.scale * k, h1 = A.h * pa.scale * k, w2 = B.w * pb.scale * k, h2 = B.h * pb.scale * k;
  const ox = (w1 + w2) / 2 - Math.abs(pa.x - pb.x), oy = (h1 + h2) / 2 - Math.abs(pa.y - pb.y);
  return { ox, oy, share: ox > 0 && oy > 0 ? (ox * oy) / Math.min(w1 * h1, w2 * h2) : 0, a1: w1 * h1, a2: w2 * h2 };
}

/** The worst overlap (share of the smaller label) between two words that are both on the near side at the rest pose; the tests use it. */
export function maxOverlap(items, o = DEFAULTS) {
  const ps = items.map((it) => project(it, REST_YAW, o.restPitch, o));
  let worst = 0;
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    if (ps[i].depth < o.nearDepth || ps[j].depth < o.nearDepth) continue;
    worst = Math.max(worst, overlapOf(items[i], items[j], ps[i], ps[j], o).share);
  }
  return worst;
}
const REST_YAW = 0;

/** How far the near labels reach into the box `o.avoid` at the rest pose, as a share of the label's smaller side (0 = all outside; no box = 0); the tests use it. */
export function maxIntrusion(items, o = DEFAULTS) {
  if (!o.avoid) return 0;
  let worst = 0;
  for (const it of items) {
    const p = project(it, REST_YAW, o.restPitch, o);
    if (p.depth < o.nearDepth) continue;
    const b = boxOf(it), hw = (b.w * p.scale) / o.boxR / 2, hh = (b.h * p.scale) / o.boxR / 2;
    const ox = hw + o.avoid.w / 2 - Math.abs(p.x), oy = hh + o.avoid.h / 2 - Math.abs(p.y);
    if (ox > 0 && oy > 0) worst = Math.max(worst, Math.min(ox, oy) / Math.min(hw * 2, hh * 2));
  }
  return worst;
}

/** Pushes labels that overlap at the rest pose apart (on the sphere), the lighter label moving more. Deterministic. */
function relax(items, o) {
  const cp = Math.cos(o.restPitch), sp = Math.sin(o.restPitch), gap = 0.03;
  let pts = items;
  for (let iter = 0; iter < 400; iter++) {
    const ps = pts.map((it) => project(it, REST_YAW, o.restPitch, o)), d = pts.map(() => [0, 0]);
    let any = false;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      if (ps[i].depth < o.nearDepth || ps[j].depth < o.nearDepth) continue;
      const q = overlapOf(pts[i], pts[j], ps[i], ps[j], o), ox = q.ox + gap, oy = q.oy + gap;
      if (ox <= 0 || oy <= 0) continue;
      any = true;
      const wi = q.a2 / (q.a1 + q.a2);   // the share of the move taken by i: the smaller i is, the more it moves
      const vertical = oy <= ox;
      const dir = (vertical ? ps[i].y - ps[j].y : ps[i].x - ps[j].x) || ((i + j) % 2 ? 1 : -1), sg = Math.sign(dir), m = (vertical ? oy : ox) * 0.9;
      d[i][vertical ? 1 : 0] += sg * m * wi; d[j][vertical ? 1 : 0] -= sg * m * (1 - wi);
    }
    // keep the near labels out of the box in the middle (o.avoid): the way out with the smaller push; it wins over the pushes of the other labels, or they would push it back in
    if (o.avoid) pts.forEach((it, i) => {
      if (ps[i].depth < o.nearDepth) return;
      const b = boxOf(it), hw = (b.w * ps[i].scale) / o.boxR / 2, hh = (b.h * ps[i].scale) / o.boxR / 2;
      const ox = hw + o.avoid.w / 2 - Math.abs(ps[i].x) + gap, oy = hh + o.avoid.h / 2 - Math.abs(ps[i].y) + gap;
      if (ox <= 0 || oy <= 0) return;
      any = true;
      const sideways = ox < oy && Math.abs(ps[i].x) + ox + hw <= 1.25;   // the way out sideways is only one if the label then still fits in the box
      d[i] = !sideways ? [0, (Math.sign(ps[i].y) || (i % 2 ? 1 : -1)) * oy] : [(Math.sign(ps[i].x) || (i % 2 ? 1 : -1)) * ox, 0];
    });
    // keep every label inside the box (about +-1.25 radii sideways, +-1.1 up and down): push it back by what sticks out
    pts.forEach((it, i) => {
      if (ps[i].depth < o.nearDepth) return;
      const b = boxOf(it), hw = (b.w * ps[i].scale) / o.boxR / 2, hh = (b.h * ps[i].scale) / o.boxR / 2;
      const ex = Math.abs(ps[i].x) + hw - 1.25, ey = Math.abs(ps[i].y) + hh - 1.1;
      if (ex > 0) { d[i][0] -= Math.sign(ps[i].x) * ex; any = true; }
      if (ey > 0) { d[i][1] -= Math.sign(ps[i].y) * ey; any = true; }
    });
    if (!any) break;
    pts = pts.map((it, i) => {
      const s = ps[i].scale, dx = d[i][0] / s, dys = d[i][1] / s;   // dys: screen down
      // a sideways move is a turn about the vertical axis (a point near the side needs a big turn for a small move on screen)
      const zs = Math.abs(it.z) < 0.25 ? 0.25 : it.z, t = yawPoint(it, clamp(dx / zs, -0.4, 0.4));
      return norm({ ...t, y: t.y - dys * cp, z: t.z - dys * sp });
    });
  }
  return pts;
}

/**
 * words: [{ label, count }] in the order to show. Returns one item per word: { i, label, count, x, y, z, theta, r, rem, weight } (x right, y up, z to the camera;
 * theta is the angle of the point round the vertical axis, 0 = the front). The heavy words go where they show best at rest (the equator of the sphere); then a relaxation pass pushes overlapping labels apart at the rest pose.
 */
export function layoutWords(words, o = DEFAULTS) {
  const n = words.length;
  if (n === 0) return [];
  const counts = words.map((w) => w.count);
  const min = Math.min(...counts), max = Math.max(...counts);
  const byWeight = words.map((w, i) => i).sort((a, b) => words[b].count - words[a].count || a - b);
  const fit = n > o.fitFrom ? Math.max(o.fitMin, Math.sqrt(o.fitFrom / n)) : 1;   // many words: smaller labels, or nothing fits
  const pts = spherePoints(n);
  let items = new Array(n);
  byWeight.forEach((i, rank) => { items[i] = { ...pts[rank], i, label: words[i].label, count: words[i].count, ...sizeOf(words[i].count, min, max, o, fit) }; });
  const turn = -Math.atan2(items[byWeight[0]].x, items[byWeight[0]].z);   // the heaviest word starts at the front
  items = relax(items.map((it) => yawPoint(it, turn)), o);
  return items.map((it) => ({ i: it.i, label: it.label, count: it.count, x: it.x, y: it.y, z: it.z, theta: Math.atan2(it.x, it.z), r: Math.hypot(it.x, it.z), rem: it.rem, weight: it.weight }));
}

/** Where an item is on screen for a given turn (yaw about the vertical axis) and tilt (pitch): x, y in cloud radii from the centre (y down), scale (perspective), depth 0 (far) .. 1 (near), opacity, z-index, whether it can be hit. */
export function project(it, yaw, pitch, o = DEFAULTS) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const x = it.x * cy + it.z * sy, z0 = it.z * cy - it.x * sy, y0 = -it.y;   // turn about the vertical axis; y0: screen y, down
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const y = y0 * cp - z0 * sp, z = y0 * sp + z0 * cp;   // tilt about the x axis: positive pitch brings the top of the sphere towards the camera
  const scale = o.perspective / (o.perspective - z);
  const depth = clamp((z + 1.2) / 2.4, 0, 1);
  return { x: x * scale, y: y * scale, scale, depth, opacity: o.fade + (1 - o.fade) * Math.pow(depth, 1.4), z: Math.round(depth * 1000), live: depth > 0.4 };
}

/** The inline style (CSS custom properties read by .wc-word) of a projected word; identical text on the server and in the browser. */
export function wordStyle(p) {
  return { "--x": p.x.toFixed(3), "--y": p.y.toFixed(3), "--s": p.scale.toFixed(3), opacity: p.opacity.toFixed(3), zIndex: p.z, pointerEvents: p.live ? "auto" : "none" };
}

/** A drag of (dx, dy) pixels: the new { yaw, pitch }. Dragging right turns the front to the right; dragging down tips the cloud towards you. */
export function dragRotate(s, dx, dy, o = DEFAULTS) {
  return { yaw: wrapAngle(s.yaw + dx * o.dragRad), pitch: clamp(s.pitch + dy * o.dragRad, -o.maxPitch, o.maxPitch) };
}

/** The speed (rad/s) of a drag step of d pixels in dt seconds, smoothed into the previous speed v and capped. */
export function flickSpeed(v, d, dt, o = DEFAULTS) {
  if (dt <= 0) return v;
  return clamp(v * 0.6 + ((d * o.dragRad) / dt) * 0.4, -o.maxSpeed, o.maxSpeed);
}

/** The yaw that brings a word at angle theta to the front, the nearest turn to `from`. */
export const faceYaw = (theta, from) => from + wrapAngle(-theta - from);

/**
 * One animation step of the free (not dragged) cloud. s: { yaw, pitch, vyaw, vpitch, target }; target is a yaw to ease to (keyboard focus) or null.
 * o.reduced: no auto-spin, no inertia, no easing; the cloud stays where it is.
 */
export function step(s, dt, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  if (o.reduced) return { yaw: s.target == null ? s.yaw : s.target, pitch: s.pitch, vyaw: 0, vpitch: 0, target: null };
  if (s.target != null) {
    const k = 1 - Math.exp(-dt / 0.18), d = s.target - s.yaw;
    const done = Math.abs(d) < 0.003;
    return { yaw: done ? s.target : s.yaw + d * k, pitch: s.pitch + (o.restPitch - s.pitch) * k, vyaw: o.spin, vpitch: 0, target: done ? null : s.target };
  }
  const decay = Math.exp(-dt / o.inertiaTau);
  const vyaw = o.spin + (s.vyaw - o.spin) * decay, vpitch = s.vpitch * decay;
  let pitch = clamp(s.pitch + vpitch * dt, -o.maxPitch, o.maxPitch);
  if (Math.abs(vpitch) < 0.05) pitch += (o.restPitch - pitch) * (1 - Math.exp(-dt / o.pitchEase));
  return { yaw: wrapAngle(s.yaw + vyaw * dt), pitch, vyaw, vpitch, target: null };
}

/** Nothing more will change (so the frame loop can stop): only possible without auto-spin. */
export function settled(s, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  if (o.reduced) return s.target == null;
  return o.spin === 0 && s.target == null && Math.abs(s.vyaw) < 1e-3 && Math.abs(s.vpitch) < 1e-3 && Math.abs(s.pitch - o.restPitch) < 1e-3;
}

/** The pose shown on the server and before the script runs. */
export const REST = { yaw: 0, pitch: DEFAULTS.restPitch, vyaw: DEFAULTS.spin, vpitch: 0, target: null };
