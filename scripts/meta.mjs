// <head> tags for sharing: Open Graph (Facebook, LINE, Slack, Discord, ...) and Twitter/X cards. Pure.
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const LOCALE = { zh: "zh_TW", en: "en_US" };
const tag = (attr, key, value) => (value === undefined || value === "" ? "" : `<meta ${attr}="${key}" content="${esc(value)}">`);

/**
 * @param route    page route ({ kind, lang, path, alternates, props })
 * @param opts     { siteName, baseUrl, title, description, image?: { url, width?, height?, alt? }, author }
 */
export function metaTags(route, { siteName, baseUrl, title, description, image, author }) {
  const isPost = route.kind === "post";
  const lines = [
    tag("property", "og:site_name", siteName),
    tag("property", "og:type", isPost ? "article" : "website"),
    tag("property", "og:title", title),
    tag("property", "og:description", description),
    tag("property", "og:url", baseUrl + route.path),
    tag("property", "og:locale", LOCALE[route.lang]),
    ...(route.alternates || []).filter((a) => a.translated !== false && a.lang !== route.lang).map((a) => tag("property", "og:locale:alternate", LOCALE[a.lang])),
  ];
  if (isPost) {
    lines.push(tag("property", "article:published_time", route.props.date), tag("property", "article:author", author),
      tag("property", "article:section", route.props.section));
    if (route.props.updated) lines.push(tag("property", "article:modified_time", route.props.updated));
  }
  if (image) {
    lines.push(tag("property", "og:image", image.url), tag("property", "og:image:width", image.width), tag("property", "og:image:height", image.height),
      tag("property", "og:image:alt", image.alt || title));
  }
  lines.push(tag("name", "twitter:card", image ? "summary_large_image" : "summary"), tag("name", "twitter:title", title),
    tag("name", "twitter:description", description), tag("name", "twitter:image", image?.url), tag("name", "author", author));
  return lines.filter(Boolean).join("\n    ");
}

/**
 * The share description of a page from site.meta: meta[key].description[lang] with {n} replaced by `count`.
 * Returns "" when there is no entry, or when the text needs {n} and there is nothing yet (a language without posts says nothing wrong, e.g. "0 items");
 * the caller then keeps the page's old description.
 */
export function shareDescription(meta, key, lang, count = 0) {
  const text = meta?.[key]?.description?.[lang];
  if (!text || (String(text).includes("{n}") && !count)) return "";
  return String(text).replaceAll("{n}", String(count));
}
