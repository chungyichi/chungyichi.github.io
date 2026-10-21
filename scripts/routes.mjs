// Content model -> list of pages. Plain data only (it is serialised into nothing; pages are rendered at build time).
import { site } from "../site.config.mjs";
import { paginate, groupByDate, postPath, indexPath } from "./content.mjs";

const brief = (p) => ({ slug: p.slug, title: p.title, summary: p.summary, date: p.date });

export function buildRoutes(model, pages, { langs = site.langs, perPage = site.postsPerPage, homePosts = site.homePosts } = {}) {
  const routes = [];
  const other = (lang) => langs.filter((l) => l !== lang);
  const alt = (path, lang) => other(lang).map((l) => ({ lang: l, path: path.replace(`/${lang}/`, `/${l}/`) }));

  routes.push({ path: "/", kind: "picker", lang: site.defaultLang, alternates: langs.map((l) => ({ lang: l, path: `/${l}/` })) });

  for (const lang of langs) {
    const posts = model.byLang[lang];
    routes.push({ path: `/${lang}/`, kind: "home", lang, alternates: alt(`/${lang}/`, lang),
      props: { latest: posts.slice(0, homePosts).map(brief), total: posts.length } });

    for (const pg of paginate(posts, perPage)) {
      const path = indexPath(lang, pg.number);
      routes.push({ path, kind: "index", lang, alternates: alt(path, lang),
        props: { groups: groupByDate(pg.items.map(brief)), page: pg.number, pages: pg.total } });
    }

    for (const p of posts) {
      const path = postPath(lang, p.slug);
      const alternates = other(lang).map((l) => ({
        lang: l, path: model.translations[p.slug]?.[l] ? postPath(l, p.slug) : `/${l}/blog/`, translated: Boolean(model.translations[p.slug]?.[l]),
      }));
      routes.push({ path, kind: "post", lang, alternates,
        props: { slug: p.slug, title: p.title, summary: p.summary, date: p.date, updated: p.updated, html: p.html, draft: p.draft, words: p.words } });
    }

    for (const [name, byLang] of Object.entries(pages)) {
      const pg = byLang[lang];
      if (!pg) continue;
      const path = `/${lang}/${name}/`;
      routes.push({ path, kind: "page", lang, alternates: alt(path, lang).filter((a) => byLang[a.lang]), props: { name, ...pg } });
    }
  }
  routes.push({ path: "/404.html", kind: "notfound", lang: site.defaultLang, alternates: [] });
  return routes;
}
