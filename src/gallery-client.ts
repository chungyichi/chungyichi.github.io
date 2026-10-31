// The picture strip of a toy page with several pictures. Runs only on pages that have [data-gallery].
// The strip is a scroll-snap box, so it already scrolls by swipe, scrollbar and arrow keys; this script shows the round
// buttons, keeps the current dot and the buttons' disabled state in step with the scroll, and opens #pic-N from the address.
import { clampSlide, slideAt, deepLink, keyTarget } from "./gallery-core.mjs";

const panel = document.querySelector<HTMLElement>("[data-gallery]");
if (panel) {
  const strip = panel.querySelector<HTMLElement>(".toy-slides")!;
  const count = strip.children.length;
  const prev = panel.querySelector<HTMLButtonElement>("[data-prev]")!;
  const next = panel.querySelector<HTMLButtonElement>("[data-next]")!;
  const dots = [...panel.querySelectorAll<HTMLAnchorElement>("[data-dot]")];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let current = 0;
  let pending = -1, timer = 0;                             // the slide a smooth scroll is on its way to: ignore the slides it passes

  function mark(i: number) {
    current = i;
    prev.disabled = i === 0;
    next.disabled = i === count - 1;
    dots.forEach((d, k) => { if (k === i) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current"); });
  }

  function go(i: number, instant = false) {
    i = clampSlide(i, count);
    pending = i; mark(i);
    window.clearTimeout(timer);
    timer = window.setTimeout(() => { pending = -1; }, 800);
    strip.scrollTo({ left: i * strip.clientWidth, behavior: instant || reduced.matches ? "instant" : "smooth" });
  }

  let raf = 0;
  strip.addEventListener("scroll", () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const at = slideAt(strip.scrollLeft, strip.clientWidth, count);
      if (pending >= 0 && at !== pending) return;
      pending = -1; mark(at);
    });
  }, { passive: true });

  prev.addEventListener("click", () => go(current - 1));
  next.addEventListener("click", () => go(current + 1));
  dots.forEach((d, i) => d.addEventListener("click", (e) => { e.preventDefault(); go(i); }));   // a plain scroll, not a jump to the anchor
  strip.addEventListener("keydown", (e) => {
    const i = keyTarget(e.key, current, count);
    if (i !== null) { e.preventDefault(); go(i); }
  });

  const asked = deepLink(location.hash, count);
  if (asked >= 0) go(asked, true);
  else mark(slideAt(strip.scrollLeft, strip.clientWidth, count));   // a reload may keep the strip's scroll position
  prev.hidden = next.hidden = false;
  panel.dataset.gallery = "on";
}
export {};
