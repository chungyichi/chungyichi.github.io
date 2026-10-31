// The arithmetic of the toy page's picture strip (pure, tested); the DOM part is gallery-client.ts.
// Slides are `count` boxes of one `width` each, side by side; the strip's scroll offset says which one is in view.

/** Clamp a slide index to 0 .. count-1 (0 when there are no slides). */
export const clampSlide = (i, count) => Math.min(Math.max(0, i), Math.max(0, count - 1));

/** The slide the strip shows at a scroll offset: the nearest whole slide. A width of 0 (not laid out yet) means the first. */
export const slideAt = (scrollLeft, width, count) => (width > 0 ? clampSlide(Math.round(scrollLeft / width), count) : 0);

/** The slide a #pic-N address asks for (1-based in the address, 0-based here), or -1 when the hash is not one or N is out of range. */
export function deepLink(hash, count) {
  const m = /^#pic-([1-9]\d*)$/.exec(hash || "");
  if (!m) return -1;
  const i = Number(m[1]) - 1;
  return i < count ? i : -1;
}

/** Where a key takes the strip from `current`: Left/Right one step (held at the ends), Home/End the first/last; null for other keys. */
export function keyTarget(key, current, count) {
  switch (key) {
    case "ArrowLeft": return clampSlide(current - 1, count);
    case "ArrowRight": return clampSlide(current + 1, count);
    case "Home": return 0;
    case "End": return clampSlide(count - 1, count);
    default: return null;
  }
}
