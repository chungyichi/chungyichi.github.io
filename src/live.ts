/**
 * "Live" = the element is on screen AND the tab is visible. `on(live)` is called once at the start and then whenever that changes. Returns the cleanup.
 * Used by the animated figures of the gear overview (src/WordCloud.tsx for the frame timer, src/sharkfx/mount.ts for the shark loop).
 */
export function watchLive(el: Element, on: (live: boolean) => void): () => void {
  let onScreen = true, shown = !document.hidden, last: boolean | null = null;
  const emit = () => { const live = onScreen && shown; if (live !== last) { last = live; on(live); } };
  const io = new IntersectionObserver((en) => { onScreen = en.at(-1)?.isIntersecting ?? true; emit(); });
  io.observe(el);
  const vis = () => { shown = !document.hidden; emit(); };
  document.addEventListener("visibilitychange", vis);
  emit();
  return () => { io.disconnect(); document.removeEventListener("visibilitychange", vis); };
}
