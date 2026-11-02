// Touch / pointer play for the seasons that have an `interaction` (site.config.mjs). Fetched on demand by SeasonToggle; attach() returns the cleanup.
// Every interaction is small and optional: the decoration works without it, and none of this runs under prefers-reduced-motion (the layers are hidden).

const mq = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;

/** Winter: tapping a light of the header string cycles its colour. */
function lights(): () => void {
  const on = (e: Event) => {
    const el = (e.target as Element | null)?.closest?.(".season-lights i") as HTMLElement | null;
    if (el) el.dataset.c = String((Number(el.dataset.c) + 1) % 4);
  };
  document.addEventListener("click", on);
  return () => document.removeEventListener("click", on);
}

/** Lunar New Year: tapping a lantern sets off a small burst of dots; one burst at a time, removed again when it ends. */
function lanternBurst(): () => void {
  let burst: HTMLElement | null = null, timer = 0;
  const clear = () => { clearTimeout(timer); burst?.remove(); burst = null; };
  const on = (e: Event) => {
    const lantern = (e.target as Element | null)?.closest?.(".season-lantern") as HTMLElement | null;
    if (!lantern || burst || mq?.matches) return;
    const r = lantern.getBoundingClientRect();
    burst = document.createElement("div");
    burst.className = "season-burst";
    burst.setAttribute("aria-hidden", "true");
    burst.style.left = `${r.left + r.width / 2}px`;
    burst.style.top = `${r.top + r.height * 0.55}px`;
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2, d = i % 2 ? 46 : 84, dot = document.createElement("i");
      dot.style.setProperty("--dx", `${Math.round(Math.cos(a) * d)}px`);
      dot.style.setProperty("--dy", `${Math.round(Math.sin(a) * d)}px`);
      dot.dataset.c = String(i % 4);
      burst.appendChild(dot);
    }
    document.body.appendChild(burst);
    timer = window.setTimeout(clear, 1400);
  };
  document.addEventListener("click", on);
  return () => { document.removeEventListener("click", on); clear(); };
}

/** Autumn: a pointer moving close to a leaf gives it a brief sideways push (at most every 60 ms; only reads positions, then sets one CSS variable). */
function leafPush(): () => void {
  let last = 0;
  const timers = new Map<HTMLElement, number>();
  const on = (e: PointerEvent) => {
    if (e.timeStamp - last < 60) return;
    last = e.timeStamp;
    document.querySelectorAll<HTMLElement>(".art-leaves .fall").forEach((leaf) => {
      const r = leaf.getBoundingClientRect(), dx = r.left + r.width / 2 - e.clientX, dy = r.top + r.height / 2 - e.clientY;
      const b = leaf.firstElementChild as HTMLElement | null;
      if (!b || dx * dx + dy * dy > 90 * 90) return;
      b.style.setProperty("--push", `${(dx < 0 ? -1 : 1) * (36 + (90 - Math.hypot(dx, dy)) / 2)}px`);
      clearTimeout(timers.get(b));
      timers.set(b, window.setTimeout(() => b.style.setProperty("--push", "0px"), 700));
    });
  };
  window.addEventListener("pointermove", on, { passive: true });
  return () => { window.removeEventListener("pointermove", on); timers.forEach((t) => clearTimeout(t)); };
}

const KINDS: Record<string, () => () => void> = { lights, "lantern-burst": lanternBurst, "leaf-push": leafPush };

export function attach(kind: string): () => void {
  return KINDS[kind]?.() ?? (() => {});
}
