// Tags: shared by the build (scripts/) and the browser (search page). Pure.

/** The URL piece of a tag: NFKC, lowercase, spaces to hyphens. Chinese stays Chinese (the address is percent-encoded by the browser). */
export const tagSlug = (tag) => String(tag).normalize("NFKC").trim().toLowerCase().replace(/\s+/g, "-");

/** Where a tag's page is. */
export const tagPath = (lang, slug, page = 1) => `/${lang}/tags/${encodeURIComponent(slug)}/${page > 1 ? `page/${page}/` : ""}`;
export const tagsIndexPath = (lang) => `/${lang}/tags/`;
