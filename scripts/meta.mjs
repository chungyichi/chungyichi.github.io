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
    ...(route.alternates || []).filter((a) => a.translated !== false).map((a) => tag("property", "og:locale:alternate", LOCALE[a.lang])),
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
