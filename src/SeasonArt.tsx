import { createPortal } from "react-dom";

/**
 * The decoration layers of the seasons (site.config.mjs `seasons[].art`). Rendered only in the browser, after the toggle has looked at the season,
 * and portalled to <body> (or the site header for the string of lights). Everything is deterministic (no Math.random) and decorative: aria-hidden,
 * no pointer events except the lanterns and lights, and season-art.css hides all of it under prefers-reduced-motion. At most 30 moving elements.
 */

type Vars = Record<string, string | number>;

/** Small fixed pseudo-random sequence so a layer looks the same every time. */
function rng(seed: number) {
  let s = seed;
  return (lo: number, hi: number) => { s = (s * 1664525 + 1013904223) % 4294967296; return lo + (s / 4294967296) * (hi - lo); };
}

/** Halloween: fixed, deterministic flight plans (vw / vh waypoints). */
const FLIERS = [
  { k: "bat", s: 34, dur: 38, delay: -4, o: 0.55, w: [[-12, 20], [30, 8], [55, 38], [80, 14], [112, 30]] },
  { k: "bat", s: 26, dur: 31, delay: -19, o: 0.5, w: [[112, 60], [78, 72], [50, 50], [22, 80], [-12, 64]] },
  { k: "bat", s: 40, dur: 52, delay: -30, o: 0.45, w: [[-12, 78], [24, 60], [48, 86], [74, 58], [112, 82]] },
  { k: "bat", s: 22, dur: 27, delay: -9, o: 0.55, w: [[112, 10], [84, 30], [58, 12], [30, 36], [-12, 18]] },
  { k: "bat", s: 30, dur: 44, delay: -36, o: 0.5, w: [[30, 112], [20, 80], [46, 56], [38, 26], [60, -12]] },
  { k: "pumpkin", s: 34, dur: 62, delay: -12, o: 0.55, w: [[-12, 40], [18, 52], [44, 34], [70, 48], [112, 36]] },
  { k: "pumpkin", s: 26, dur: 74, delay: -46, o: 0.5, w: [[112, 88], [82, 70], [58, 90], [28, 72], [-12, 92]] },
  { k: "pumpkin", s: 42, dur: 90, delay: -58, o: 0.4, w: [[70, 112], [76, 84], [62, 62], [86, 40], [92, -12]] },
] as const;

function Halloween() {
  return (
    <div className="season-layer art-halloween" aria-hidden="true">
      {FLIERS.map((f, i) => {
        const style: Vars = { "--s": `${f.s}px`, "--dur": `${f.dur}s`, "--delay": `${f.delay}s`, "--o": f.o };
        f.w.forEach(([x, y], n) => { style[`--x${n}`] = `${x}vw`; style[`--y${n}`] = `${y}vh`; });
        return <span key={i} className={`flier ${f.k}`} style={style}><i /></span>;
      })}
    </div>
  );
}

/** Things that fall: leaf > b (pushed sideways by the pointer) > i (the picture, swaying). */
function Falling({ cls, n, seed, kinds, size, dur, drift, o, inner = true }: { cls: string; n: number; seed: number; kinds: number; size: [number, number]; dur: [number, number]; drift: [number, number]; o: [number, number]; inner?: boolean }) {
  const r = rng(seed);
  return (
    <div className={`season-layer art-${cls}`} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => {
        const d = r(dur[0], dur[1]);
        const style: Vars = { "--l": `${((i + r(0.1, 0.9)) / n * 100).toFixed(1)}vw`, "--s": `${r(size[0], size[1]).toFixed(0)}px`, "--dur": `${d.toFixed(1)}s`, "--delay": `${(-r(0, d)).toFixed(1)}s`,
          "--dx": `${r(drift[0], drift[1]).toFixed(0)}vw`, "--o": r(o[0], o[1]).toFixed(2), "--sw": `${r(3, 6).toFixed(1)}s`, "--swd": `${(-r(0, 5)).toFixed(1)}s` };
        return <span key={i} className={`fall k${i % kinds}`} style={style}>{inner ? <b><i /></b> : <i />}</span>;
      })}
    </div>
  );
}

const LANTERNS = [[8, 24, 8], [29, 30, 2], [52, 26, 12], [71, 30, 4], [91, 24, 10]] as const; // left %, width px, string px

function Lanterns() {
  const r = rng(11);
  return (
    <>
      <div className="season-hang" aria-hidden="true">
        {LANTERNS.map(([l, w, str], i) => (
          <span key={i} className="season-lantern" style={{ "--l": `${l}%`, "--w": `${w}px`, "--str": `${str}px`, "--sw": `${(4 + i * 0.7).toFixed(1)}s`, "--swd": `${(-i * 1.3).toFixed(1)}s` } as Vars}><i /></span>
        ))}
      </div>
      <div className="season-layer art-envelopes" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => {
          const d = r(22, 34);
          return <span key={i} className="fall" style={{ "--l": `${(((i + r(0.1, 0.9)) / 6) * 100).toFixed(1)}vw`, "--s": `${r(16, 24).toFixed(0)}px`, "--dur": `${d.toFixed(1)}s`, "--delay": `${(-r(0, d)).toFixed(1)}s`, "--dx": `${r(-8, 8).toFixed(0)}vw`, "--o": r(0.4, 0.6).toFixed(2), "--sw": `${r(4, 7).toFixed(1)}s`, "--swd": `${(-r(0, 5)).toFixed(1)}s` } as Vars}><b><i /></b></span>;
        })}
      </div>
    </>
  );
}

/** A string of small lights under the site header's rule: tap one to change its colour (season-client.ts). */
function Lights() {
  const header = document.querySelector(".site-header");
  if (!header) return null;
  return createPortal(
    <div className="season-lights" aria-hidden="true">
      {Array.from({ length: 18 }, (_, i) => <i key={i} data-c={i % 4} style={{ "--d": `${((i * 7) % 11) * -0.3}s` } as Vars} />)}
    </div>, header);
}

export function SeasonArt({ art }: { art: string }) {
  let layer = null;
  if (art === "halloween") layer = <Halloween />;
  else if (art === "leaves") layer = <Falling cls="leaves" n={14} seed={3} kinds={4} size={[20, 32]} dur={[16, 28]} drift={[-12, 12]} o={[0.4, 0.6]} />;
  else if (art === "snow") layer = <><Falling cls="snow" n={24} seed={7} kinds={1} size={[8, 18]} dur={[9, 20]} drift={[-6, 6]} o={[0.35, 0.65]} inner={false} /><Lights /></>;
  else if (art === "lanterns") layer = <Lanterns />;
  else if (art === "petals") layer = <Falling cls="petals" n={22} seed={5} kinds={2} size={[12, 20]} dur={[12, 22]} drift={[14, 34]} o={[0.4, 0.65]} inner={false} />;
  return layer ? createPortal(layer, document.body) : null;
}
