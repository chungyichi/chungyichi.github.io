// The toy library: shared by the build (scripts/) and the pages (src/). Pure.
// One post per toy in content/toys/; the list is a picture grid with an owner filter made of plain links (no JavaScript needed).

export const TOYS_SECTION = "toys";
/** `status:` of a toy: owned (the default when absent) or on the wish list. */
export const TOY_STATUSES = ["own", "want"];

/** The toys of one owner; every toy when owner is "". */
export const filterByOwner = (posts, owner) => (owner ? posts.filter((p) => p.owner === owner) : posts);

/** Where one owner's grid is: /zh/toys/owner/son/ (paged like a section index). */
export const ownerPath = (lang, section, owner, page = 1) => `/${lang}/${section}/owner/${owner}/${page > 1 ? `page/${page}/` : ""}`;
