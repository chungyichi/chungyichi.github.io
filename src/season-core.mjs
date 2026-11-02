// Seasons: pure window resolution + the tiny inline script. Shared by scripts/template.mjs (build/dev) and the tests; no DOM here.
// A season (site.config.mjs `seasons`) is { id, icon, label:{zh,en}, window, art, interaction? } and `window` is one of
//   { from: "MM-DD", to: "MM-DD" }                          fixed range every year, both days included (from > to wraps over New Year)
//   { around: "cny", daysBefore: 14, daysAfter: 14 }         days around a date of data/calendar.mjs LUNAR_TABLE (years 2026-2030 only)
// All dates are Asia/Taipei calendar days ("YYYY-MM-DD", compared as strings). A year outside the lunar table has no such window.
import { LUNAR_TABLE } from "../data/calendar.mjs";

const ISO = /^\d{4}-\d{2}-\d{2}$/, MD = /^(\d{2})-(\d{2})$/;
export const SEASON_DATA_ID = "season-data";

export function addDays(iso, n) {
  return new Date(Date.parse(iso + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
}

/** [startISO, endISO] of `win` for `year`, or null (no such window that year). */
export function resolveWindow(win, year, lunar = LUNAR_TABLE) {
  if (win && typeof win.around === "string") {
    const base = lunar[win.around]?.[year];
    if (!base) return null;
    return [addDays(base, -(win.daysBefore ?? 0)), addDays(base, win.daysAfter ?? 0)];
  }
  const a = MD.exec(win?.from ?? ""), b = MD.exec(win?.to ?? "");
  if (!a || !b) return null;
  const wrap = win.from > win.to;
  return [`${year}-${win.from}`, `${wrap ? year + 1 : year}-${win.to}`];
}

/** All windows of the years year-1..year+1 as [id, startISO, endISO], in season-table order (that order is the priority). */
export function resolveSeasons(seasons, year, lunar = LUNAR_TABLE) {
  const out = [];
  for (const s of seasons) for (const y of [year - 1, year, year + 1]) {
    const w = resolveWindow(s.window, y, lunar);
    if (w) out.push([s.id, w[0], w[1]]);
  }
  return out;
}

/** The first season (table order) whose window holds `iso`, or "". */
export function activeSeason(windows, iso) {
  for (const [id, a, b] of windows) if (iso >= a && iso <= b) return id;
  return "";
}

/** The compact JSON the inline script reads: w = windows, k = known ids (valid ?season= values), m = id -> [icon, label in `lang`, art, interaction or ""]. */
export function seasonPayload(seasons, year, lang, lunar = LUNAR_TABLE) {
  return { w: resolveSeasons(seasons, year, lunar), k: seasons.map((s) => s.id), m: Object.fromEntries(seasons.map((s) => [s.id, [s.icon, s.label[lang] ?? s.label.en, s.art, s.interaction ?? ""]])) };
}

/** `?season=<id>` -> id, `?season=off` -> "off", anything else (unknown id, none) -> null. */
export function parsePreview(search, ids) {
  const m = /[?&]season=([\w-]+)/.exec(search ?? "");
  return m && (m[1] === "off" || ids.includes(m[1])) ? m[1] : null;
}

/** Build-time checks of the `seasons` config; returns problem strings. */
export function validateSeasons(seasons, lunar = LUNAR_TABLE) {
  const bad = [], seen = new Set();
  for (const s of seasons ?? []) {
    if (!/^[a-z][a-z0-9-]*$/.test(s.id ?? "") || s.id === "off") bad.push(`seasons: bad id ${JSON.stringify(s.id)}`);
    if (seen.has(s.id)) bad.push(`seasons: duplicate id ${s.id}`);
    seen.add(s.id);
    if (!s.icon || !s.label?.zh || !s.label?.en) bad.push(`seasons.${s.id}: needs icon and label {zh,en}`);
    if (!s.art) bad.push(`seasons.${s.id}: needs art`);
    const w = s.window ?? {};
    if (w.around !== undefined ? !(w.around in lunar) : !(MD.test(w.from ?? "") && MD.test(w.to ?? "") && resolveWindow(w, 2027) && ISO.test(resolveWindow(w, 2027)[0]))) bad.push(`seasons.${s.id}: bad window`);
  }
  return bad;
}

/** `<script type="application/json">` with the payload (must come before the inline script). `<` is escaped so the JSON cannot close the tag. */
export function seasonDataTag(seasons, now, lang, lunar = LUNAR_TABLE) {
  const bad = validateSeasons(seasons, lunar);
  if (bad.length) throw new Error(bad.join("; "));
  const year = new Date(now.getTime() + 288e5).getUTCFullYear();
  return `<script type="application/json" id="${SEASON_DATA_ID}">${JSON.stringify(seasonPayload(seasons, year, lang, lunar)).replace(/</g, "\\u003c")}</script>`;
}

// Runs before first paint. Order: ?season=<id>|off, then a saved "off" for the season in its window (localStorage "season-off" = that id), then the date.
// data-season = the decoration shown; data-season-window = the season the toggle button belongs to (in its window, or previewed).
export const SEASON_INIT = `try{var d=document.documentElement,J=JSON.parse(document.getElementById("${SEASON_DATA_ID}").textContent),m=/[?&]season=([\\w-]+)/.exec(location.search),o=m&&m[1],t=new Date(Date.now()+288e5).toISOString().slice(0,10),w="",i,s="";for(i=0;i<J.w.length;i++)if(t>=J.w[i][1]&&t<=J.w[i][2]){w=J.w[i][0];break}try{s=localStorage.getItem("season-off")}catch(e){}if(o&&J.k.indexOf(o)>=0){w=o;s=""}else if(o==="off")s=w;if(w&&s!==w)d.dataset.season=w;if(w)d.dataset.seasonWindow=w}catch(e){}`;
