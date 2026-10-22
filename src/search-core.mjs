// Matching for the search page. Pure (no DOM), shared by the browser and the tests.
// No word segmentation: a term matches if it is a substring, which works for Chinese (no spaces) and English alike.

/** NFKC folds full-width letters and compatibility forms (Ｔech -> tech); lowercase makes it case-insensitive. */
export const normalize = (s) => String(s).normalize("NFKC").toLowerCase();

/** entries: [{ t: title, s: summary, h: [headings], d: date, ... }] -> entries with normalized fields, computed once. */
export function prepare(entries) {
  return entries.map((entry) => ({ entry, t: normalize(entry.t), h: normalize(entry.h.join(" ")), s: normalize(entry.s) }));
}

/**
 * Every whitespace-separated term must match somewhere (AND). A term scores by where it matches best:
 * title 3, heading 2, summary 1; the post's score is the sum. Highest score first, then newest.
 */
export function search(prepared, query, limit = 50) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const hits = [];
  for (const p of prepared) {
    let score = 0;
    for (const term of terms) {
      const best = p.t.includes(term) ? 3 : p.h.includes(term) ? 2 : p.s.includes(term) ? 1 : 0;
      if (!best) { score = 0; break; }
      score += best;
    }
    if (score) hits.push({ score, entry: p.entry });
  }
  hits.sort((a, b) => b.score - a.score || (a.entry.d < b.entry.d ? 1 : a.entry.d > b.entry.d ? -1 : 0));
  return hits.slice(0, limit).map((h) => h.entry);
}
