// Where the one swimming shark of the gear overview is, at time t (seconds), in a box of w x h pixels. Pure maths, no DOM; src/sharkfx/mount.ts writes the numbers into the
// vendored world (vendor/ascii-sharks/world.ts) instead of calling its step(): the shark swims in place, drifts a little, sways its heading, and never leaves the box.
// The spine is 20 nodes, snout first, as in the vendored world (SHARK_NODES).
export const NODES = 20;
/** The renderer draws fins up to this far (a fraction of the length) either side of the spine, and the tail beat adds a little. */
export const SIDE_REACH = 0.3;
export const END_REACH = 0.05;

/** Length of the shark in a box: most of the width, but its fins must fit the height. */
export const sharkLength = (w, h) => Math.max(10, Math.min(w * 0.86, h * 1.05));

export function sharkPose(t, w, h) {
  const L = sharkLength(w, h), seg = L / (NODES - 1);
  const heading = 0.1 * Math.sin(t * 0.37 + 2) + 0.03 * Math.sin(t * 0.9);                    // radians, 0 = swimming right
  const turn = 0.1 * 0.37 * Math.cos(t * 0.37 + 2) + 0.03 * 0.9 * Math.cos(t * 0.9);           // rad/s: the renderer banks the fins into it
  const nodes = new Array(NODES * 2);
  let x = w / 2 + L / 2 + Math.sin(t * 0.45) * w * 0.04, y = h / 2 + Math.sin(t * 0.31 + 1) * h * 0.06;
  let a = heading + Math.PI;
  nodes[0] = x; nodes[1] = y;
  for (let k = 1; k < NODES; k++) {
    a += 0.025 * Math.sin(t * 1.6 - k * 0.45);   // a hint of body curve; the renderer adds the travelling wave
    x += Math.cos(a) * seg; y += Math.sin(a) * seg;
    nodes[k * 2] = x; nodes[k * 2 + 1] = y;
  }
  // Keep the whole drawing (spine plus fins) inside the box by sliding the shark.
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let k = 0; k < NODES; k++) { x0 = Math.min(x0, nodes[k * 2]); x1 = Math.max(x1, nodes[k * 2]); y0 = Math.min(y0, nodes[k * 2 + 1]); y1 = Math.max(y1, nodes[k * 2 + 1]); }
  const mx = L * END_REACH, my = L * SIDE_REACH;
  const dx = x0 - mx < 0 ? mx - x0 : x1 + mx > w ? w - mx - x1 : 0, dy = y0 - my < 0 ? my - y0 : y1 + my > h ? h - my - y1 : 0;
  if (dx || dy) for (let k = 0; k < NODES; k++) { nodes[k * 2] += dx; nodes[k * 2 + 1] += dy; }
  return { nodes, length: L, heading, turn, speed: 48, phase: t * 3.4 };
}

/** The bounding box that the drawing may use (spine nodes plus the reach of the fins), for the tests. */
export const sharkBounds = (pose) => {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let k = 0; k < NODES; k++) { x0 = Math.min(x0, pose.nodes[k * 2]); x1 = Math.max(x1, pose.nodes[k * 2]); y0 = Math.min(y0, pose.nodes[k * 2 + 1]); y1 = Math.max(y1, pose.nodes[k * 2 + 1]); }
  const mx = pose.length * END_REACH, my = pose.length * SIDE_REACH;
  return { x0: x0 - mx, x1: x1 + mx, y0: y0 - my, y1: y1 + my };
};
