// Matching for the search page. Pure (no DOM), shared by the browser and the tests.
// No word segmentation: a term matches if it is a substring, which works for Chinese (no spaces) and English alike.

/** NFKC folds full-width letters and compatibility forms (Ｔech -> tech); lowercase makes it case-insensitive. */
export const normalize = (s) => String(s).normalize("NFKC").toLowerCase();

/** A term is a run of non-space characters; a tag that contains a space is written #"two words". */
const TERM_RE = /#"[^"]*"|\S+/g;
const queryTerms = (q) => normalize(q).match(TERM_RE) || [];

/** "#日本 #\"road trip\" 伊吹山" -> { tags: ["日本", "road trip"], text: "伊吹山" } (display names keep their case). */
export function parseQuery(raw) {
  const tags = [], text = [];
  for (const w of String(raw).match(TERM_RE) || []) {
    if (!w.startsWith("#")) { text.push(w); continue; }
    const name = w.slice(1).replace(/"/g, "").trim();
    if (name && !tags.some((t) => normalize(t) === normalize(name))) tags.push(name);
  }
  return { tags, text: text.join(" ") };
}

/** The inverse: tags become #terms (quoted when they contain a space), then the free text. */
export function buildQuery(tags, text = "") {
  const parts = tags.map((t) => (/\s/.test(t) ? `#"${t.replace(/"/g, "")}"` : `#${t}`));
  if (text.trim()) parts.push(text.trim());
  return parts.join(" ");
}

/** entries: [{ t: title, s: summary, h: [headings], d: date, ... }] -> entries with normalized fields, computed once. */
export function prepare(entries) {
  return entries.map((entry) => ({ entry, t: normalize(entry.t), h: normalize(entry.h.join(" ")), s: normalize(entry.s), g: (entry.g || []).map(normalize) }));
}

/**
 * Every whitespace-separated term must match somewhere (AND). A term scores by where it matches best:
 * title 3, tag 3, heading 2, summary 1; the post's score is the sum. Highest score first, then newest.
 * A term that starts with # matches tags only (#bpf finds posts tagged bpf, also partly: #lin finds linux).
 */
export function search(prepared, query, limit = 50) {
  const terms = queryTerms(query);
  if (!terms.length) return [];
  const hits = [];
  for (const p of prepared) {
    let score = 0;
    for (const term of terms) {
      const tagOnly = term.startsWith("#");
      const needle = tagOnly ? term.slice(1).replace(/^"|"$/g, "") : term;
      if (!needle) { score = 0; break; }
      const inTag = p.g.some((g) => g.includes(needle));
      const best = tagOnly ? (inTag ? 3 : 0) : p.t.includes(needle) || inTag ? 3 : p.h.includes(needle) ? 2 : p.s.includes(needle) ? 1 : 0;
      if (!best) { score = 0; break; }
      score += best;
    }
    if (score) hits.push({ score, entry: p.entry });
  }
  hits.sort((a, b) => b.score - a.score || (a.entry.d < b.entry.d ? 1 : a.entry.d > b.entry.d ? -1 : 0));
  return hits.slice(0, limit).map((h) => h.entry);
}
