// The picture-grid sections (the toy library, the books): shared by the build (scripts/) and the pages (src/). Pure.
// One post per toy or book; the list is a picture grid with an owner filter made of plain links (no JavaScript needed).
// Which sections are grids, and their owners, is the `grid` of a section in site.config.mjs.
import { site } from "../site.config.mjs";

export const TOYS_SECTION = "toys";
export const BOOKS_SECTION = "books";

/** The grid settings of a section (site.config.mjs sections[].grid), or undefined for a text section. */
export const gridOf = (section) => site.sections.find((s) => s.id === section)?.grid;
/** The ids of the sections that are picture grids. */
export const gridSections = (sections = site.sections) => sections.filter((s) => s.grid).map((s) => s.id);
/** The front matter keys only some sections take, and which: owner and source for every grid, the rest per section (scripts/content.mjs checks). */
export const SECTION_KEYS = { owner: [TOYS_SECTION, BOOKS_SECTION], source: [TOYS_SECTION, BOOKS_SECTION], status: [TOYS_SECTION], price: [TOYS_SECTION], quantity: [TOYS_SECTION], author: [BOOKS_SECTION] };
/** `status:` of a toy: owned (the default when absent) or on the wish list. */
export const TOY_STATUSES = ["own", "want"];

/** The toys of one owner; every toy when owner is "". */
export const filterByOwner = (posts, owner) => (owner ? posts.filter((p) => p.owner === owner) : posts);

/** The toys shown on the home page: `featuredToys` in site.config.mjs ("toys/<slug>"), in that order, kept only when the toy exists in `posts` (one language). */
export function pickFeaturedToys(posts, ids) {
  return (ids || []).map((id) => posts.find((p) => p.section === TOYS_SECTION && `${p.section}/${p.slug}` === id)).filter(Boolean);
}

/** Where one owner's grid is: /zh/toys/owner/son/ (paged like a section index). */
export const ownerPath = (lang, section, owner, page = 1) => `/${lang}/${section}/owner/${owner}/${page > 1 ? `page/${page}/` : ""}`;
