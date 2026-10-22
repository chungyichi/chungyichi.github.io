// Content model -> list of pages. Plain data only (it is serialised into nothing; pages are rendered at build time).
import { site } from "../site.config.mjs";
import { paginate, groupByDate, postPath, indexPath } from "./content.mjs";

const sectionIds = () => site.sections.map((s) => s.id);

const brief = (p) => ({ section: p.section, slug: p.slug, title: p.title, summary: p.summary, date: p.date });

export function buildRoutes(model, pages, { langs = site.langs, perPage = site.postsPerPage, homePosts = site.homePosts } = {}) {
  const routes = [];
  const other = (lang) => langs.filter((l) => l !== lang);
  const alt = (path, lang) => other(lang).map((l) => ({ lang: l, path: path.replace(`/${lang}/`, `/${l}/`) }));

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
          postCss: p.css ? { href: `/post-css/${section}/${p.slug}.css`, text: p.css } : undefined,
          props: { section, slug: p.slug, title: p.title, summary: p.summary, date: p.date, updated: p.updated, html: p.html, draft: p.draft, private: Boolean(p.private), words: p.words } });
      }
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
