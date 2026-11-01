// Content model -> list of pages. Plain data only (it is serialised into nothing; pages are rendered at build time).
import { site } from "../site.config.mjs";
import { createHash } from "node:crypto";
import { paginate, groupByDate, postPath, indexPath, searchPath, buildSearchIndex, ogImageFor, toyHero, collectTags } from "./content.mjs";
import { tagPath, tagsIndexPath } from "../src/tags.mjs";
import { gridOf, filterByOwner, ownerPath, pickFeaturedToys } from "../src/toys.mjs";

const sectionIds = () => site.sections.map((s) => s.id);

const briefOf = (fileExists) => (p) => {
  const dir = `/media/${p.section}/${p.slug}`;
  return {
    section: p.section, slug: p.slug, title: p.title, summary: p.summary, date: p.date, tags: p.tags || [], owner: p.owner || "", status: p.status || "", quantity: p.quantity || 1, author: p.author || "",
    thumb: fileExists(`${dir}/thumb.webp`) ? `${dir}/thumb.webp` : "",                                                   // 400x210, made by scripts/og-image.sh
    card: gridOf(p.section) && fileExists(`${dir}/card.webp`) ? `${dir}/card.webp` : "",                       // 480x480 for the grids (toys, books; og-image.sh --square); the grid falls back to thumb
  };
};

/** The posts shown on the home page: the featured ones that exist in this language, else the latest few; newest first. */
function homeList(posts, featured, limit) {
  const pick = featured.length ? posts.filter((p) => featured.includes(`${p.section}/${p.slug}`)) : posts.slice(0, limit);
  return pick.slice(0, Math.max(limit, 5));
}

export function buildRoutes(model, pages, { langs = site.langs, perPage = site.postsPerPage, grids = {}, homePosts = site.homePosts, featured = site.featured ?? [], featuredToys = site.featuredToys ?? [], fileExists = () => false } = {}) {
  const routes = [];
  const brief = briefOf(fileExists);
  // A slide of the home page's toy carousel: the toy page's picture (cover), else the square card, else the list thumbnail.
  const toySlide = (p) => { const b = brief(p); return { slug: p.slug, title: p.title, pic: toyHero(p, fileExists).src || b.card || b.thumb }; };
  const other = (lang) => langs.filter((l) => l !== lang);
  const alt = (path, lang) => other(lang).map((l) => ({ lang: l, path: path.replace(`/${lang}/`, `/${l}/`) }));

  const defaultImage = site.ogImage && fileExists(site.ogImage) ? { url: site.baseUrl + site.ogImage, alt: site.title.en } : null;
  routes.push({ path: "/", kind: "entry", lang: site.defaultLang, alternates: langs.map((l) => ({ lang: l, path: `/${l}/` })) });

  for (const lang of langs) {
    routes.push({ path: `/${lang}/`, kind: "home", lang, alternates: alt(`/${lang}/`, lang),
      props: { featured: homeList(model.byLang[lang], featured, homePosts).map(brief), toys: pickFeaturedToys(model.byLang[lang], featuredToys).map(toySlide),
        sections: sectionIds().map((id) => ({ id, total: model.bySection[id][lang].length })) } });

    for (const section of sectionIds()) {
      const posts = model.bySection[section][lang];
      const grid = grids[section] ?? gridOf(section);
      if (grid) {
        // A picture grid (toys, books) of every post, plus one grid per owner. The filter is plain links, so it works without JavaScript.
        const owners = (grid.owners ?? []).map((o) => ({ id: o.id, total: filterByOwner(posts, o.id).length }));
        for (const owner of ["", ...owners.map((o) => o.id)]) {
          for (const pg of paginate(filterByOwner(posts, owner), grid.perPage ?? perPage)) {
            const path = owner ? ownerPath(lang, section, owner, pg.number) : indexPath(lang, section, pg.number);
            routes.push({ path, kind: "grid", lang, alternates: alt(path, lang),
              props: { section, owner, owners, total: posts.length, items: pg.items.map(brief), page: pg.number, pages: pg.total } });
          }
        }
      } else {
        for (const pg of paginate(posts, perPage)) {
          const path = indexPath(lang, section, pg.number);
          routes.push({ path, kind: "index", lang, alternates: alt(path, lang),
            props: { section, groups: groupByDate(pg.items.map(brief)), page: pg.number, pages: pg.total } });
        }
      }
      for (const p of posts) {
        const path = postPath(lang, section, p.slug);
        const has = (l) => Boolean(model.translations[`${section}/${p.slug}`]?.[l]);
        const alternates = other(lang).map((l) => ({ lang: l, path: has(l) ? postPath(l, section, p.slug) : indexPath(l, section), translated: has(l) }));
        // A toy or book page shows its pictures on a panel beside the facts (and not again in the body); other posts show the body as is.
        const hero = (grids[section] ?? gridOf(section)) ? toyHero(p, fileExists) : { pictures: [], html: p.html };
        routes.push({ path, kind: "post", lang, alternates,
          ogImage: ogImageFor(p, { baseUrl: site.baseUrl, exists: fileExists, fallback: defaultImage ? site.ogImage : "" }),
          postJs: p.js ? { href: `/post-js/${section}/${p.slug}.js`, text: p.js } : undefined,
          postCss: p.css ? { href: `/post-css/${section}/${p.slug}.css`, text: p.css } : undefined,
          props: { section, slug: p.slug, title: p.title, summary: p.summary, date: p.date, updated: p.updated, tags: p.tags || [], html: hero.html, draft: p.draft, private: Boolean(p.private), words: p.words,
            owner: p.owner || "", author: p.author || "", volumes: p.volumes || [], source: p.source || "", status: p.status || "", price: p.price || "", quantity: p.quantity || 1, pictures: hero.pictures } });
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
  for (const route of routes) if (route.kind !== "post" && route.kind !== "notfound" && defaultImage) route.ogImage = defaultImage;
  routes.push({ path: "/404.html", kind: "notfound", lang: site.defaultLang, alternates: [] });
  return routes;
}
