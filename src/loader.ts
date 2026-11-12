// The loading indicator of the whole site: a fish tank in which the ASCII shark of the gear overview (src/gearfigure.mjs, the brother's figure) swims while the water
// rises to the share that is loaded. One component, three uses: inline under a search box or a grid while its index data is fetched, full screen (the island game),
// and anywhere else a promise is waited for. Timing rules (no flash for fast loads, a minimum time, the water never ahead of the truth) live in src/loader-core.mjs.
//   const l = showLoader(host, { label: "Loading" });  ...await the data...  await l.done();     l.set(40) when the true progress is known.
// The shark swims with CSS (transform only, so it keeps moving while the main thread is busy); the water is a transform too. prefers-reduced-motion: the shark stays.
import { figureOf } from "./gearfigure.mjs";
import { loaderState } from "./loader-core.mjs";
import "./styles/loader.css";   // its own style: pages that never call showLoader() do not load it

export type Loader = {
  /** The true progress, 0..100 (optional: without it the water follows the clock up to 99 until done()). */
  set(percent: number): void;
  /** The load is over: the water fills up, the indicator leaves (after its minimum time) and the promise resolves. */
  done(): Promise<void>;
};
export type LoaderOptions = { label?: string; full?: boolean; delay?: number; min?: number; fill?: number };

// the seaweed: [ASCII art, left, animation delay]
const WEEDS: [string, string, string][] = [[" )\n(\n )\n(\n )", "8%", "0s"], ["(\n )\n(\n )", "36%", "-1.1s"], [" )\n(\n )\n(\n )\n(", "84%", "-2.2s"], ["(\n )\n(", "92%", "-0.6s"]];

export function showLoader(host: HTMLElement, o: LoaderOptions = {}): Loader {
  const full = !!o.full, min = o.min ?? (full ? 2400 : 700), delay = o.delay ?? (full ? 0 : 200), fill = o.fill ?? min;
  const el = document.createElement("div");
  el.className = full ? "ld ld-full" : "ld"; el.hidden = true;
  el.setAttribute("role", "progressbar"); el.setAttribute("aria-label", o.label ?? "Loading");
  el.setAttribute("aria-valuemin", "0"); el.setAttribute("aria-valuemax", "100"); el.setAttribute("aria-valuenow", "0");
  const tank = document.createElement("div"); tank.className = "ld-tank";
  const water = document.createElement("div"); water.className = "ld-water";
  const weeds = WEEDS.map(([art, left, delay]) => {   // under the water layer, so the rising water tints them; they sway a little all the time
    const w = document.createElement("pre"); w.className = "ld-weed"; w.setAttribute("aria-hidden", "true"); w.textContent = art;
    w.style.left = left; w.style.animationDelay = delay; return w;
  });
  const shark = document.createElement("pre"); shark.className = "ld-shark"; shark.setAttribute("aria-hidden", "true"); shark.textContent = figureOf("brother");
  const pct = document.createElement("b"); pct.className = "ld-pct"; pct.textContent = "0%";
  tank.append(...weeds, water, shark); el.append(tank, pct);
  host.setAttribute("aria-busy", "true"); host.appendChild(el);

  const t0 = performance.now();
  let real: number | null = null, doneAt: number | null = null, finish!: () => void;
  const finished = new Promise<void>((r) => { finish = r; });
  const tick = () => {
    const s = loaderState({ elapsed: performance.now() - t0, doneAt, real, delay, min, fill });
    el.hidden = !s.visible;
    el.style.setProperty("--ld-p", String(s.pct / 100)); pct.textContent = `${s.pct}%`; el.setAttribute("aria-valuenow", String(s.pct));
    if (s.over) { el.remove(); host.removeAttribute("aria-busy"); finish(); return; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return {
    set(p) { real = p; },
    done() { doneAt ??= performance.now() - t0; return finished; },
  };
}
