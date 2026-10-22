// Content model -> list of pages. Plain data only (it is serialised into nothing; pages are rendered at build time).
import { site } from "../site.config.mjs";
import { createHash } from "node:crypto";
import { paginate, groupByDate, postPath, indexPath, searchPath, buildSearchIndex, ogImageFor, collectTags } from "./content.mjs";
import { tagPath, tagsIndexPath } from "../src/tags.mjs";

const sectionIds = () => site.sections.map((s) => s.id);

const briefOf = (fileExists) => (p) => ({
  section: p.section, slug: p.slug, title: p.title, summary: p.summary, date: p.date, tags: p.tags || [],
  thumb: fileExists(`/media/${p.section}/${p.slug}/thumb.webp`) ? `/media/${p.section}/${p.slug}/thumb.webp` : "",   // 400x210, made by scripts/og-image.sh
});

export function buildRoutes(model, pages, { langs = site.langs, perPage = site.postsPerPage, homePosts = site.homePosts, fileExists = () => false } = {}) {
  const routes = [];
  const brief = briefOf(fileExists);
  const other = (lang) => langs.filter((l) => l !== lang);
  const alt = (path, lang) => other(lang).map((l) => ({ lang: l, path: path.replace(`/${lang}/`, `/${l}/`) }));

  const defaultImage = site.ogImage && fileExists(site.ogImage) ? { url: site.baseUrl + site.ogImage, alt: site.title.en } : null;
  routes.push({ path: "/", kind: "entry", lang: site.defaultLang, alternates: langs.map((l) => ({ lang: l, path: `/${l}/` })) });

  for (const lang of langs) {
    routes.push({ path: `/${lang}/`, kind: "home", lang, alternates: alt(`/${lang}/`, lang),
      props: { sections: sectionIds().map((id) => ({ id, latest: model.bySection[id][lang].slice(0, homePosts).map(brief), total: model.bySection[id][lang].length })) } });

    for (const section of sectionIds()) {
      const posts = model.bySection[section][lang];
      for (const pg of paginate(posts, perPage)) {
        const path = indexPath(lang, section, pg.number);
        routes.push({ path, kind: "index", lang, alternates: alt(path, lang),
          props: { section, groups: groupByDate(pg.items.map(brief)), page: pg.number, pages: pg.total } });
      }
      for (const p of posts) {
        const path = postPath(lang, section, p.slug);
        const has = (l) => Boolean(model.translations[`${section}/${p.slug}`]?.[l]);
        const alternates = other(lang).map((l) => ({ lang: l, path: has(l) ? postPath(l, section, p.slug) : indexPath(l, section), translated: has(l) }));
        routes.push({ path, kind: "post", lang, alternates,
          ogImage: ogImageFor(p, { baseUrl: site.baseUrl, exists: fileExists, fallback: defaultImage ? site.ogImage : "" }),
          postJs: p.js ? { href: `/post-js/${section}/${p.slug}.js`, text: p.js } : undefined,
          postCss: p.css ? { href: `/post-css/${section}/${p.slug}.css`, text: p.css } : undefined,
          props: { section, slug: p.slug, title: p.title, summary: p.summary, date: p.date, updated: p.updated, tags: p.tags || [], html: p.html, draft: p.draft, private: Boolean(p.private), words: p.words } });
      }
    }

    // Tags: /<lang>/tags/ lists them, /<lang>/tags/<tag>/ the posts that carry one (all sections, newest first)
    const tags = collectTags(model.byLang[lang]);
    routes.push({ path: tagsIndexPath(lang), kind: "tags", lang, alternates: alt(tagsIndexPath(lang), lang),
      props: { tags: tags.map((t) => ({ tag: t.tag, slug: t.slug, count: t.posts.length })) } });
    for (const t of tags) {
      for (const pg of paginate(t.posts, perPage)) {
        const path = tagPath(lang, t.slug, pg.number);
        routes.push({ path, kind: "tag", lang, alternates: other(lang).map((l) => ({ lang: l, path: tagsIndexPath(l), translated: false })),
          props: { tag: t.tag, slug: t.slug, groups: groupByDate(pg.items.map(brief)), page: pg.number, pages: pg.total } });
      }
    }

    // One search index per language, loaded by the search page on demand. The file name carries a content hash so a cached
    // copy can never be paired with a newer page.
    const indexText = JSON.stringify(buildSearchIndex(model.byLang[lang], lang, (id) => site.sections.find((s) => s.id === id)?.title[lang] ?? id));
    const indexHref = `/search/${lang}.${createHash("sha1").update(indexText).digest("hex").slice(0, 10)}.json`;
    routes.push({ path: searchPath(lang), kind: "search", lang, alternates: alt(searchPath(lang), lang),
      searchIndex: { href: indexHref, text: indexText }, props: { index: indexHref, tags: tags.map((t) => ({ tag: t.tag, slug: t.slug, count: t.posts.length })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag)) } });

    for (const [name, byLang] of Object.entries(pages)) {
      const pg = byLang[lang];
      if (!pg) continue;
      const path = `/${lang}/${name}/`;
      routes.push({ path, kind: "page", lang, alternates: alt(path, lang).filter((a) => byLang[a.lang]), props: { name, ...pg } });
    }
  }
  for (const route of routes) if (route.kind !== "post" && route.kind !== "entry" && route.kind !== "notfound" && defaultImage) route.ogImage = defaultImage;
  routes.push({ path: "/404.html", kind: "notfound", lang: site.defaultLang, alternates: [] });
  return routes;
}
