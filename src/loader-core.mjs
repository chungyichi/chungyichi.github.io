// Timing of the loading indicator (src/loader.ts), pure so that it can be tested. Two rules against flicker, which is worse than no indicator at all:
//   - a load that is over before `delay` ms never shows anything;
//   - once shown, it stays at least `min` ms, and the water takes at least `fill` ms to go from empty to full, so that the picture can be seen even when the data
//     arrives at once. `real` (0..100) is the true progress when a caller knows it; the water never runs ahead of it (and never shows 100 before the load is over).
// loaderState returns { visible, pct (0..100, integer), over } for a moment `elapsed` ms after the load started; doneAt = when it finished (null = still running).

/** @param {{ elapsed: number, doneAt?: number | null, real?: number | null, delay?: number, min?: number, fill?: number }} a */
export const loaderState = ({ elapsed, doneAt = null, real = null, delay = 200, min = 700, fill = min }) => {
  const done = doneAt !== null;
  if (done && doneAt <= delay) return { visible: false, pct: 100, over: true };
  const endAt = done ? Math.max(doneAt, delay + Math.max(min, fill)) : Infinity;
  const target = done ? 100 : real === null ? 99 : Math.max(0, Math.min(99, real));   // no true progress known: the clock alone drives the water, up to 99
  const eased = Math.max(0, ((elapsed - delay) / fill) * 100);
  const pct = Math.round(Math.min(target, eased, 100));
  return { visible: elapsed >= delay && elapsed < endAt, pct, over: done && elapsed >= endAt };
};
