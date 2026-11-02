import { useEffect, useState } from "react";
import { SeasonArt } from "./SeasonArt";

export const SEASON_ISLAND_ID = "season-island";

type Info = { id: string; icon: string; name: string; art: string; interaction: string };

/** The seasons table of this page: the JSON that scripts/template.mjs writes and the inline script already read. */
function readInfo(): Info | null {
  const id = document.documentElement.dataset.seasonWindow;
  try {
    const m = JSON.parse(document.getElementById("season-data")?.textContent ?? "{}").m as Record<string, string[]> | undefined;
    const row = id && m && Object.hasOwn(m, id) ? m[id] : null;
    return row && id ? { id, icon: row[0] ?? "", name: row[1] ?? id, art: row[2] ?? "", interaction: row[3] ?? "" } : null;
  } catch { return null; }
}

/**
 * One button for whichever season is current: shown only inside a season's window (or with ?season=<id>), and only when JavaScript runs.
 * Server and first client render are both empty, so hydration always matches. The inline script (src/season-core.mjs) sets
 * data-season (decoration on) and data-season-window (which season this button belongs to); this component draws the layer and keeps both in step.
 */
export function SeasonToggle({ label }: { label: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const i = readInfo();
    setInfo(i);
    setOn(!!i && document.documentElement.dataset.season === i.id);
  }, []);
  // Animations stop while the tab is hidden (the layers' CSS reads this class).
  useEffect(() => {
    if (!on) return;
    const sync = () => document.documentElement.classList.toggle("season-paused", document.hidden);
    document.addEventListener("visibilitychange", sync);
    return () => { document.removeEventListener("visibilitychange", sync); document.documentElement.classList.remove("season-paused"); };
  }, [on]);
  // Touch and pointer interactions live in a small module that is fetched only for a season that has one.
  useEffect(() => {
    if (!on || !info?.interaction) return;
    let stop = () => {}, gone = false;
    void import("./season-client").then((m) => { if (!gone) stop = m.attach(info.interaction); });
    return () => { gone = true; stop(); };
  }, [on, info]);
  if (!info) return null;
  function toggle() {
    if (!info) return;
    const next = !on;
    setOn(next);
    if (next) document.documentElement.dataset.season = info.id;
    else delete document.documentElement.dataset.season;
    try { if (next) localStorage.removeItem("season-off"); else localStorage.setItem("season-off", info.id); } catch { /* the choice just isn't remembered */ }
  }
  const text = label.replace("{name}", info.name);
  return (
    <>
      {on && <SeasonArt art={info.art} />}
      <button type="button" className="theme season-toggle" onClick={toggle} aria-label={text} title={text} aria-pressed={on}>
        <span aria-hidden="true">{info.icon}</span>
      </button>
    </>
  );
}
