// The picture-grid sections (the toy library, the books, the games): shared by the build (scripts/) and the pages (src/). Pure.
// One post per toy or book; the list is a picture grid with an owner filter made of plain links (no JavaScript needed).
// Which sections are grids, and their owners, is the `grid` of a section in site.config.mjs.
import { site } from "../site.config.mjs";

export const TOYS_SECTION = "toys";
export const BOOKS_SECTION = "books";
export const GAMES_SECTION = "games";

/** The grid settings of a section (site.config.mjs sections[].grid), or undefined for a text section. */
export const gridOf = (section) => site.sections.find((s) => s.id === section)?.grid;
/** The ids of the sections that are picture grids. */
export const gridSections = (sections = site.sections) => sections.filter((s) => s.grid).map((s) => s.id);
const authorKey = (s) => String(s).normalize("NFKC").toLowerCase().replace(/[\s.]+/g, "");
const editDistance = (a, b) => {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
};
/**
 * A book's `author` text (names separated by , or ，or 、) against the list in site.config.mjs (`authors`): { names, unknown }.
 * names has every author in its one spelling (an alias becomes the name; case, spaces and full-width dots are ignored when matching);
 * unknown lists the ones not in the list as written, each with the nearest known names. No list at all means no checking.
 */
export function resolveAuthors(raw, authors = gridOf(BOOKS_SECTION)?.authors) {
  const parts = String(raw ?? "").split(/[,，、]/).map((x) => x.trim().replace(/\s+/g, " ")).filter(Boolean);
  const names = [], unknown = [];
  for (const part of parts) {
    const key = authorKey(part);
    const hit = (authors ?? []).find((a) => [a.name, ...(a.aliases ?? [])].some((n) => authorKey(n) === key));
    const name = hit ? hit.name : part;
    if (!hit && authors) unknown.push({ name: part, nearest: (authors ?? []).map((a) => [a.name, Math.min(...[a.name, ...(a.aliases ?? [])].map((n) => editDistance(key, authorKey(n))))]).sort((x, y) => x[1] - y[1]).slice(0, 3).map((x) => x[0]) });
    if (!names.includes(name)) names.push(name);
  }
  return { names, unknown };
}

/** The front matter keys only some sections take, and which: owner and source for every grid, the rest per section (scripts/content.mjs checks). */
export const SECTION_KEYS = { owner: [TOYS_SECTION, BOOKS_SECTION, GAMES_SECTION], source: [TOYS_SECTION, BOOKS_SECTION, GAMES_SECTION], status: [TOYS_SECTION], platform: [GAMES_SECTION], developer: [GAMES_SECTION], type: [BOOKS_SECTION], price: [TOYS_SECTION], quantity: [TOYS_SECTION], author: [BOOKS_SECTION], volumes: [BOOKS_SECTION], own: [BOOKS_SECTION], original: [BOOKS_SECTION, GAMES_SECTION] };
/** `status:` of a toy: owned (the default when absent) or on the wish list. */
export const TOY_STATUSES = ["own", "want"];


/** `own:` of a book: a physical copy (the default when absent) or something only read (web novel, online comic). */
export const BOOK_OWN = ["yes", "no"];
/** `type:` of a book as written (小說 when absent) and the id used in addresses and the search index. */
export const BOOK_TYPES = { 小說: "novel", 漫畫: "comic" };

/**
 * The filters besides the owner that a grid can offer (`grid.facets` in site.config.mjs): the UI (tabs | toggle) and the values in order.
 * The order of the keys is the order of the address: /zh/books/?owner=me&type=comic&own=no (src/grid-core.mjs).
 */
export const FACETS = {
  own: { ui: "toggle", values: BOOK_OWN },
  type: { ui: "tabs", values: Object.values(BOOK_TYPES) },
  platform: { ui: "tabs", values: null },   // a game can be on several; the ids are `platforms` of the games grid in site.config.mjs
};
/** The values of a facet of one grid (site.config.mjs sections[].grid), in order. */
export const facetValues = (id, grid) => (id === "platform" ? (grid?.platforms ?? []).map((x) => x.id) : FACETS[id].values);

/** The toys shown on the home page: `featuredToys` in site.config.mjs ("toys/<slug>"), in that order, kept only when the toy exists in `posts` (one language). */
export function pickFeaturedToys(posts, ids) {
  return (ids || []).map((id) => posts.find((p) => p.section === TOYS_SECTION && `${p.section}/${p.slug}` === id)).filter(Boolean);
}

/** An adult book you only read (own: no, tag 成人) is text only: scripts/check.mjs fails it when it has a source link or a picture. */
export const isAdultText = (p) => p.section === BOOKS_SECTION && p.own === false && (p.tags || []).includes("成人");
