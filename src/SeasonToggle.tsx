import { useEffect, useState } from "react";

export const SEASON_ISLAND_ID = "season-island";

/** Fixed, deterministic flight plans (vw / vh waypoints). Decorative only; CSS hides the whole layer under reduced motion. */
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

function Sky() {
  return (
    <div className="season-sky" aria-hidden="true">
      {FLIERS.map((f, i) => {
        const style: Record<string, string | number> = { "--s": `${f.s}px`, "--dur": `${f.dur}s`, "--delay": `${f.delay}s`, "--o": f.o };
        f.w.forEach(([x, y], n) => { style[`--x${n}`] = `${x}vw`; style[`--y${n}`] = `${y}vh`; });
        return <span key={i} className={`flier ${f.k}`} style={style}><i /></span>;
      })}
    </div>
  );
}

/**
 * Shown only in the Halloween window (or with ?season=halloween), and only when JavaScript runs.
 * Server and first client render are both empty, so hydration always matches.
 */
export function SeasonToggle({ label }: { label: string }) {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => {
    const d = document.documentElement.dataset;
    setOn(d.seasonWindow === "1" ? d.season === "halloween" : null);
  }, []);
  if (on === null) return null;
  function toggle() {
    const next = !on;
    setOn(next);
    if (next) document.documentElement.dataset.season = "halloween";
    else delete document.documentElement.dataset.season;
    try { localStorage.setItem("season", next ? "on" : "off"); } catch { /* the choice just isn't remembered */ }
  }
  return (
    <>
      {on && <Sky />}
      <button type="button" className="theme season-toggle" onClick={toggle} aria-label={label} title={label} aria-pressed={on}>
        <span aria-hidden="true">🎃</span>
      </button>
    </>
  );
}
