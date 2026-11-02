// Tags: shared by the build (scripts/) and the browser (search page). Pure.

/** The URL piece of a tag: NFKC, lowercase, spaces to hyphens. Used to tell two spellings of one tag apart. */
export const tagSlug = (tag) => String(tag).normalize("NFKC").trim().toLowerCase().replace(/\s+/g, "-");

/** Where the tag page is; the tag is a query parameter, the page is filtered in the browser: /zh/tags/?tag=%E6%97%A5%E6%9C%AC&page=2 */
export const tagsIndexPath = (lang) => `/${lang}/tags/`;
export const tagPath = (lang, tag, page = 1) => `${tagsIndexPath(lang)}?${new URLSearchParams({ tag, ...(page > 1 ? { page: String(page) } : {}) })}`;
