// The filters and pager of the picture grids (toys, books, games) and of the tag page. Pure (no DOM), shared by the build (which renders
// the first page of the unfiltered list), the browser (which filters the search index) and the tests.
// Everything works on search index entries (see buildSearchIndex in scripts/content.mjs): u address, t title, s summary, g tags, d date,
// o owner, w 0 = only read, ty "comic", pf platforms, a author, st 1 = wish list, q quantity, im 1 = thumb.webp, 2 = card.webp.
import { FACETS, facetValues } from "./toys.mjs";
import { inFilter } from "./search-core.mjs";
import { tagSlug } from "./tags.mjs";

/** The entries (any order) newest first; equal dates keep their order. */
export const newestFirst = (entries) => [...entries].sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0));
/** The entries of one grid section in one language, newest first. */
export const entriesOfSection = (entries, lang, section) => newestFirst(entries.filter((e) => e.u.startsWith(`/${lang}/${section}/`)));

/** One page (1-based, clamped into range) of a list: { items, page, pages }. */
export function pageOf(items, page, perPage) {
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const n = Math.min(Math.max(1, page | 0), pages);
  return { items: items.slice((n - 1) * perPage, n * perPage), page: n, pages };
}
const pageNumber = (v) => (/^\d{1,6}$/.test(v ?? "") ? Math.max(1, Number(v)) : 1);

/** Group an already-sorted list by date. */
export function groupByDate(items) {
  const groups = [];
  for (const p of items) {
    const last = groups[groups.length - 1];
    if (last && last.date === p.date) last.items.push(p);
    else groups.push({ date: p.date, items: [p] });
  }
  return groups;
}

/**
 * The filters of a grid in the address, shared with the search page: ?owner=me&own=no&type=comic&platform=ps (only the chosen ones).
 * A value the grid does not offer (an unknown owner, a facet of another section) is ignored.
 * @param {URLSearchParams | string} search @param {any} grid site.config.mjs sections[].grid
 */
export function parseFilters(search, grid) {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const owner = params.get("owner") ?? "";
  const filters = {};
  for (const id of grid?.facets ?? []) {
    const v = params.get(id) ?? "";
    if (v && facetValues(id, grid).includes(v)) filters[id] = v;
  }
  return { owner: (grid?.owners ?? []).some((o) => o.id === owner) ? owner : "", filters };
}
/** The inverse: sets the chosen owner and facets on `params` (and returns it); "" removes. Facets in the order of FACETS. */
export function writeFilters(params, owner, filters = {}) {
  if (owner) params.set("owner", owner); else params.delete("owner");
  for (const id of Object.keys(FACETS)) { if (filters[id]) params.set(id, filters[id]); else params.delete(id); }
  return params;
}

/** The state of a grid page: { owner, filters, page } from ?owner=me&own=no&page=2. */
export const parseGridState = (search, grid) => ({ ...parseFilters(search, grid), page: pageNumber(new URLSearchParams(search).get("page") ?? "") });
/** The address of a grid state: the path plus only the chosen filters (and ?page= from 2). */
export function gridHref(path, { owner = "", filters = {}, page = 1 } = {}) {
  const params = writeFilters(new URLSearchParams(), owner, filters);
  if (page > 1) params.set("page", String(page));
  const q = params.toString();
  return q ? `${path}?${q}` : path;
}

/**
 * Everything a grid page shows for a state: the page of items and the counts. `entries` are the section's entries, newest first.
 * The owner buttons count with the chosen facets, each facet counts with the owner and the other facets.
 */
export function gridView(entries, grid, { owner = "", filters = {}, page = 1 } = {}) {
  const facetIds = grid.facets ?? [];
  const count = (o, f) => entries.filter((e) => inFilter(e, o, f)).length;
  const matched = entries.filter((e) => inFilter(e, owner, filters));
  return {
    total: count("", filters),
    owners: (grid.owners ?? []).map((o) => ({ id: o.id, total: count(o.id, filters) })),
    facets: facetIds.map((id) => {
      const rest = { ...filters, [id]: "" };
      return { id, total: count(owner, rest), values: facetValues(id, grid).map((v) => ({ id: v, total: count(owner, { ...rest, [id]: v }) })) };
    }),
    matched: matched.length,
    ...pageOf(matched, page, grid.perPage),
  };
}

/** The tag page's state from ?tag=x&page=2 (tag "" = the list of tags). */
export const parseTagState = (search) => { const p = new URLSearchParams(search); return { tag: (p.get("tag") ?? "").trim(), page: pageNumber(p.get("page") ?? "") }; };
/** Every tag with its post count, most used first (the first spelling seen is shown). */
export function tagCounts(entries) {
  const by = new Map();
  for (const e of entries) for (const tag of new Set(e.g ?? [])) {
    const slug = tagSlug(tag), hit = by.get(slug);
    if (hit) hit.count++; else by.set(slug, { tag, slug, count: 1 });
  }
  return [...by.values()].sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));
}
/** The page of the entries that carry a tag (matched like the slug: case and spaces folded), newest first. */
export function tagView(entries, tag, page, perPage) {
  const slug = tagSlug(tag);
  const hit = newestFirst(entries.filter((e) => (e.g ?? []).some((g) => tagSlug(g) === slug)));
  return { matched: hit.length, ...pageOf(hit, page, perPage) };
}

/** An index entry as the list item the cards show (the Brief of src/types.ts). Section and slug come from the address /<lang>/<section>/<slug>/. */
export function briefOfEntry(e) {
  const [, , section = "", slug = ""] = e.u.split("/");
  const dir = `/media/${section}/${slug}`, im = e.im ?? 0;
  return {
    section, slug, title: e.t, summary: e.s, date: e.d, tags: e.g ?? [], thumb: im & 1 ? `${dir}/thumb.webp` : "", card: im & 2 ? `${dir}/card.webp` : "",
    owner: e.o ?? "", own: e.w !== 0, type: e.ty ?? "", platform: e.pf ?? [], author: e.a ?? "", status: e.st ? "want" : "", quantity: e.q ?? 1,
  };
}
