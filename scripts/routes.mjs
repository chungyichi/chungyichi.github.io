// Content model -> list of pages. Plain data only (it is serialised into nothing; pages are rendered at build time).
import { site } from "../site.config.mjs";
import { createHash } from "node:crypto";
import { paginate, groupByDate, postPath, indexPath, searchPath, buildSearchIndex, ogImageFor, toyHero, OG_SIZE } from "./content.mjs";
import { shareDescription } from "./meta.mjs";
import { tagsIndexPath } from "../src/tags.mjs";
import { gridOf, pickFeaturedToys, TOYS_SECTION } from "../src/toys.mjs";
import { entriesOfSection, tagCounts } from "../src/grid-core.mjs";
import { resolveGear, filledSets, overviewMode, collectionMore } from "../src/gear.mjs";
import { evaluateAchievements, resolveProfile, questLog } from "../src/achievements.mjs";

const sectionIds = () => site.sections.map((s) => s.id);

const briefOf = (fileExists) => (p) => {
  const dir = `/media/${p.section}/${p.slug}`;
  return {
    section: p.section, slug: p.slug, title: p.title, summary: p.summary, date: p.date, tags: p.tags || [], owner: p.owner || "", own: p.own !== false, type: p.type || "", platform: p.platform || [], status: p.status || "", quantity: p.quantity || 1, author: p.author || "",
    thumb: fileExists(`${dir}/thumb.webp`) ? `${dir}/thumb.webp` : "",                                                   // 400x210, made by scripts/og-image.sh
    card: gridOf(p.section) && fileExists(`${dir}/card.webp`) ? `${dir}/card.webp` : "",                       // 480x480 for the grids (toys, books; og-image.sh --square); the grid falls back to thumb
  };
};

/** The posts shown on the home page: the featured ones that exist in this language, else the latest few; newest first. */
function homeList(posts, featured, limit) {
  const pick = featured.length ? posts.filter((p) => featured.includes(`${p.section}/${p.slug}`)) : posts.slice(0, limit);
  return pick.slice(0, Math.max(limit, 5));
}

export function buildRoutes(model, pages, { langs = site.langs, perPage = site.postsPerPage, grids = {}, homePosts = site.homePosts, featured = site.featured ?? [], featuredToys = site.featuredToys ?? [], gear = site.gear ?? {}, achievements = site.achievements ?? [], fileExists = () => false, meta = site.meta ?? {}, warn = () => {} } = {}) {
  const routes = [];
  const brief = briefOf(fileExists);
  // A slide of the home page's toy carousel: the toy page's picture (cover), else the square card, else the list thumbnail.
  const toySlide = (p) => { const b = brief(p); return { slug: p.slug, title: p.title, pic: toyHero(p, fileExists).src || b.card || b.thumb }; };
  const other = (lang) => langs.filter((l) => l !== lang);
  const alt = (path, lang) => other(lang).map((l) => ({ lang: l, path: path.replace(`/${lang}/`, `/${l}/`) }));

  const defaultImage = site.ogImage && fileExists(site.ogImage) ? { url: site.baseUrl + site.ogImage, alt: site.title.en } : null;
  // Share picture of a page: meta[key].image ("<section>/<slug>", a published post in this language with an og.jpg), else the default picture.
  const pageImage = (key, lang) => {
    const ref = meta[key]?.image;
    if (!ref) return defaultImage;
    const [section, slug] = ref.split("/");
    const post = model.bySection[section]?.[lang]?.find((p) => p.slug === slug);
    const file = `/media/${ref}/og.jpg`;
    if (post && fileExists(file)) return { url: site.baseUrl + file, ...OG_SIZE, alt: post.title };
    warn(`share image for "${key}" (${ref}) is missing in ${lang}; using the default picture`);
    return defaultImage;
  };
  const shared = (route, key, count) => { const d = shareDescription(meta, key, route.lang, count); if (d) route.description = d; route.ogImage = pageImage(key, route.lang); return route; };
  routes.push({ path: "/", kind: "entry", lang: site.defaultLang, alternates: langs.map((l) => ({ lang: l, path: `/${l}/` })) });

  for (const lang of langs) {
    // One data file per language, loaded on demand by the search page, the picture grids and the tag page. The file name carries a content hash so a cached
    // copy can never be paired with a newer page.
    const entries = buildSearchIndex(model.byLang[lang], lang, (id) => site.sections.find((s) => s.id === id)?.title[lang] ?? id, fileExists);
    const indexText = JSON.stringify(entries);
    const indexHref = `/search/${lang}.${createHash("sha1").update(indexText).digest("hex").slice(0, 10)}.json`;
    // Equipment slots: every person's sheet in this language (an item missing in the language is an empty slot); the home page shows the people who have something. No page of their own.
    const gearOwners = (gridOf(TOYS_SECTION)?.owners ?? []).map((o) => o.id);
    const gearSets = resolveGear(gear, model.byLang[lang], gearOwners, (p) => { const b = brief(p); return { section: p.section, slug: p.slug, title: p.title, summary: p.summary || "", tags: b.tags, date: p.date, pic: b.card || b.thumb }; });
    // Profile, achievements and the quest log (the 閱歷 tab) of every person from this language's posts.
    for (const set of gearSets) {
      const list = evaluateAchievements(achievements, model.byLang[lang], set.owner, lang);
      set.profile = resolveProfile(gear?.[set.owner]?.profile, list, lang);
      set.achievements = list;
      set.log = questLog(model.byLang[lang], set.owner);
      set.more = collectionMore(model.byLang[lang], set.owner, new Set(set.slots.filter((d) => d.item).map((d) => `${d.item.section}/${d.item.slug}`)));
    }
    routes.push({ path: `/${lang}/`, kind: "home", lang, alternates: alt(`/${lang}/`, lang), shareKey: "home",
      props: { gear: filledSets(gearSets), gearOverview: overviewMode(gear), featured: homeList(model.byLang[lang], featured, homePosts).map(brief), toys: pickFeaturedToys(model.byLang[lang], featuredToys).map(toySlide) } });

    for (const section of sectionIds()) {
      const posts = model.bySection[section][lang];
      const grid = grids[section] ?? gridOf(section);
      if (grid) {
        // A picture grid (toys, books, games) is ONE page per section: the first page of the unfiltered list is rendered here (readable without
        // JavaScript); the owner and facet filters and the paging run in the browser on the search index (src/grid-client.tsx), ?owner=me&own=no&page=2.
        routes.push({ path: indexPath(lang, section), kind: "grid", lang, alternates: alt(indexPath(lang, section), lang), shareKey: section, shareCount: posts.length,
          props: { section, index: indexHref, entries: entriesOfSection(entries, lang, section) } });
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
            owner: p.owner || "", own: p.own !== false, type: p.type || "", platform: p.platform || [], author: p.author || "", original: p.original || "", developer: p.developer || "", volumes: p.volumes || [], source: p.source || "", status: p.status || "", price: p.price || "", quantity: p.quantity || 1, pictures: hero.pictures } });
      }
    }

    // Tags: ONE page, /<lang>/tags/ (the list of tags); ?tag=x lists the posts that carry one (all sections, newest first, paged) in the browser.
    const tags = tagCounts(entries);
    routes.push({ path: tagsIndexPath(lang), kind: "tags", lang, alternates: alt(tagsIndexPath(lang), lang), shareKey: "tags", props: { index: indexHref, entries } });
    routes.push({ path: searchPath(lang), kind: "search", lang, alternates: alt(searchPath(lang), lang), shareKey: "search",
      searchIndex: { href: indexHref, text: indexText }, props: { index: indexHref, tags: tags.map((t) => ({ tag: t.tag, count: t.count })) } });

    for (const [name, byLang] of Object.entries(pages)) {
      const pg = byLang[lang];
      if (!pg) continue;
      const path = `/${lang}/${name}/`;
      routes.push({ path, kind: "page", lang, alternates: alt(path, lang).filter((a) => byLang[a.lang]), props: { name, ...pg } });
    }
  }
  for (const route of routes) {
    if (route.kind === "post" || route.kind === "notfound") continue;
    route.ogImage = defaultImage ?? undefined;
    if (route.shareKey) shared(route, route.shareKey, route.shareCount);
    delete route.shareKey; delete route.shareCount;
  }
  routes.push({ path: "/404.html", kind: "notfound", lang: site.defaultLang, alternates: [] });
  return routes;
}
