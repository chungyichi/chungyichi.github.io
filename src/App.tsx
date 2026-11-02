import type { ReactNode } from "react";
import { site } from "../site.config.mjs";
import { t, title, tagline, sectionTitle, ownerShort, gridOf, facetLabel, facetValueLabel, type Lang } from "./i18n";
import type { Route, ToySlide, GearSet } from "./types";
import { ThemeToggle } from "./ThemeToggle";
import { SEASON_ISLAND_ID } from "./SeasonToggle";
import { TOYS_SECTION, BOOKS_SECTION, GAMES_SECTION, FACETS, facetValues } from "./toys.mjs";
import { GithubMark, Icon, NoCopyBadge, OwnerBadge, WantBadge, ownerIcon } from "./icons";
import { tagPath } from "./tags.mjs";
import { BookTile, PostItem, PostList, TagList, platformLine, postHref } from "./cards";
import { GridBrowser, TagsBrowser } from "./Browse";
import { GearSheet, GearTabs, GearViews, GearDialog } from "./Gear";

const pageHref = (lang: Lang, section: string, n: number) => (n === 1 ? `/${lang}/${section}/` : `/${lang}/${section}/page/${n}/`);

/** The page frame. `wide` widens the content column (the toy library: a picture grid and a two-column toy page); text keeps the reading width. */
function Layout({ route, wide, children }: { route: Route; wide?: boolean; children: ReactNode }) {
  const lang = route.lang;
  const s = t[lang];
  const other = route.alternates[0];
  return (
    <>
      <a className="skip" href="#main">{s.skip}</a>
      <header className="site-header">
        <div className="wrap header-row">
          <a className="brand" href={`/${lang}/`}>{title(lang)}</a>
          {/* One non-wrapping row that scrolls sideways when the sections do not fit; the current page is marked and /src/entry-client.tsx scrolls it into view. */}
          <nav aria-label="Main" className="main-nav">
            {([[`/${lang}/`, s.home], ...site.sections.map((sec: { id: string }) => [`/${lang}/${sec.id}/`, sectionTitle(lang, sec.id)]), [`/${lang}/search/`, s.search], [`/${lang}/about/`, s.about]] as [string, string][]).map(([href, label]) => (
              <a key={href} href={href} aria-current={href === `/${lang}/` ? (route.path === href ? "page" : undefined) : route.path.startsWith(href) ? "page" : undefined}>{label}</a>
            ))}
          </nav>
          <div className="tools">
            {other && site.languageSwitcher !== false && <a className="lang" href={other.path} hrefLang={other.lang} lang={other.lang}>{t[other.lang].langName}</a>}
            <a className="gh-link" href={site.github} rel="noopener noreferrer" aria-label={s.github} title={s.github}><GithubMark /></a>
            <span id={SEASON_ISLAND_ID} />
            <span id="theme-island"><ThemeToggle label={s.toggleTheme} /></span>
          </div>
        </div>
      </header>
      <main id="main" className={wide ? "wrap wrap-wide" : "wrap"}>{children}</main>
      <footer className="site-footer">
        <div className="wrap">
          <p>© {new Date().getUTCFullYear()} {site.author}</p>
        </div>
      </footer>
    </>
  );
}

/**
 * A panel whose slides share one place: a horizontal strip that snaps one slide at a time, so it works with a swipe, the scrollbar
 * or the arrow keys and no script. /src/gallery-client.ts adds the round buttons, keeps the current dot (or the "1 / N" counter)
 * in step and stops the arrow keys from scrolling the page. The dots are links to #pic-N, so a slide can be deep-linked.
 * `badges` sits in the panel's corner above the slides. One slide: the plain panel, no buttons, no dots.
 */
function Gallery({ lang, slides, keys, badges, counter, below, className, label, prevLabel, nextLabel, idPrefix = "pic" }: { lang: Lang; slides: ReactNode[]; keys: string[]; badges?: ReactNode; counter?: boolean; below?: boolean; className?: string; label?: string; prevLabel?: string; nextLabel?: string; idPrefix?: string }) {
  const s = t[lang], many = slides.length > 1;
  return (
    <div className={className ? `gallery ${className}` : "gallery"} data-gallery={many ? "" : undefined}>
      <div className="gallery-strip" tabIndex={many ? 0 : undefined} role={many ? "group" : undefined} aria-label={many ? label ?? s.pictures : undefined}>
        {slides.map((slide, i) => <div key={keys[i]} className="gallery-slide" id={many ? `${idPrefix}-${i + 1}` : undefined}>{slide}</div>)}
      </div>
      {badges}
      {many && (() => {
        const prev = <button type="button" className="gallery-nav gallery-prev" data-prev aria-label={prevLabel ?? s.prevPicture} hidden><Icon name="chevronLeft" /></button>;
        const next = <button type="button" className="gallery-nav gallery-next" data-next aria-label={nextLabel ?? s.nextPicture} hidden><Icon name="chevronRight" /></button>;
        const dots = <span className="gallery-dots">{slides.map((_, i) => <a key={keys[i]} href={`#${idPrefix}-${i + 1}`} data-dot aria-label={s.pictureN(i + 1)} />)}</span>;
        const count = <span className="gallery-count" hidden><span data-count>1</span> / {slides.length}</span>;
        // below: a control row UNDER the slide (never over it): ‹ ● ○ ○ ›. Its height is fixed in CSS, so the script showing the buttons moves nothing.
        if (below) return <div className="gallery-bar">{prev}{dots}{next}</div>;
        return <>{prev}{next}{counter ? count : dots}</>;
      })()}
    </div>
  );
}

/** The home page's toy carousel: one toy per slide (picture and name, the whole slide opens the toy), a "1 / N" counter, a link to the library. */
function HomeToys({ lang, toys }: { lang: Lang; toys: ToySlide[] }) {
  const s = t[lang];
  if (toys.length === 0) return null;
  return (
    <section className="home-toys">
      <h2>{s.featuredToys}</h2>
      <Gallery lang={lang} className="home-toys-pic" counter keys={toys.map((x) => x.slug)} slides={toys.map((x) => (
        <a className="home-toy" href={postHref(lang, TOYS_SECTION, x.slug)}>
          {x.pic ? <img src={x.pic} alt="" decoding="async" /> : <span className="no-thumb"><Icon name="tag" /></span>}
          <span className="home-toy-name">{x.title}</span>
        </a>
      ))} />
      <p className="more-sections"><a href={`/${lang}/${TOYS_SECTION}/`}>{s.allToys}</a></p>
    </section>
  );
}

/** The home page's equipment block (裝備欄): the tabs 裝備 | 閱歷, the switch 總覽 | 格子, one sheet per person who has something in a Gallery strip, the one dialog. Hidden when nobody has an item. */
function HomeGear({ lang, gear, mode }: { lang: Lang; gear: GearSet[]; mode: "items" | "title" }) {
  const s = t[lang];
  if (gear.length === 0) return null;
  return (
    <section className="home-gear" data-gear>
      <h2>{s.gearTitle}</h2>
      <GearTabs lang={lang} />
      <GearViews lang={lang} />
      <Gallery lang={lang} className="home-gear-panel" below idPrefix="gear" label={s.gearTitle} prevLabel={s.gearPrev} nextLabel={s.gearNext} keys={gear.map((g) => g.owner)} slides={gear.map((g) => <GearSheet lang={lang} set={g} mode={mode} />)} />
      {mode === "items" && <p className="gear-note" data-gear-only>{s.gearHint}</p>}
      <GearDialog lang={lang} />
    </section>
  );
}

function Home({ route }: { route: Extract<Route, { kind: "home" }> }) {
  const { lang } = route, s = t[lang];
  return (
    <>
      <h1 className="motto">{tagline(lang)}</h1>
      <HomeToys lang={lang} toys={route.props.toys} />
      <HomeGear lang={lang} gear={route.props.gear} mode={route.props.gearOverview} />
      <section>
        <h2>{s.featured}</h2>
        {route.props.featured.length === 0 ? <p>{s.noPosts}</p> : route.props.featured.map((p) => <PostItem key={`${p.section}/${p.slug}`} lang={lang} p={p} />)}
      </section>
    </>
  );
}

/*
 * The picture grids (toys, books, games): ONE page per section. This is the first page of the unfiltered list; src/browse-client.tsx loads the index
 * data and takes over the container, so the owner / type / own / platform filters and the paging run in the browser (?owner=me&own=no&page=2).
 */
function ToyGrid({ route }: { route: Extract<Route, { kind: "grid" }> }) {
  const { lang } = route, s = t[lang], { section, index, entries } = route.props;
  return (
    <>
      <h1>{sectionTitle(lang, section)}</h1>
      <div id="browse" data-kind="grid" data-index={index} data-section={section}><GridBrowser lang={lang} section={section} entries={entries} state={{ owner: "", filters: {}, page: 1 }} /></div>
      <noscript><p className="notice">{s.filterNoJs}</p></noscript>
    </>
  );
}

/** The tags: the list of them, or (?tag=x, in the browser) the posts that carry one. */
function TagsPage({ route }: { route: Extract<Route, { kind: "tags" }> }) {
  const { lang } = route, s = t[lang], { index, entries } = route.props;
  return (
    <>
      <div id="browse" data-kind="tags" data-index={index}><TagsBrowser lang={lang} entries={entries} state={{ tag: "", page: 1 }} /></div>
      <noscript><p className="notice">{s.filterNoJs}</p></noscript>
    </>
  );
}

function Index({ route }: { route: Extract<Route, { kind: "index" }> }) {
  const { lang } = route, { section, groups, page, pages } = route.props;
  return <PostList lang={lang} heading={sectionTitle(lang, section)} groups={groups} page={page} pages={pages} hrefFor={(n) => pageHref(lang, section, n)} />;
}

/*
 * The toy library: a picture grid with an owner filter made of plain links, so it works without JavaScript.
 * A card is a square picture (card.webp, else the list thumbnail letterboxed), the name, and at most two tags; the owner and a wish
 * are icon badges in the picture's corners (their names are tooltips), so the grid stays quiet.
 */
type Post = Extract<Route, { kind: "post" }>["props"];

/** Copy-link (and native share) buttons. Shown by /src/share-client.ts when JavaScript runs; without it there is nothing to click, so it stays hidden. */
function Share({ lang, title }: { lang: Lang; title: string }) {
  const s = t[lang];
  return (
    <p className="share" data-share data-title={title} data-copied={s.copied} data-failed={s.copyFailed} hidden>
      <button type="button" data-copy>{s.copyLink}</button>
      <button type="button" data-native hidden>{s.share}</button>
    </p>
  );
}

/**
 * The head of a toy page: the picture panel (a Gallery of the toy's pictures) beside the facts (price, quantity from 2 up, date, tags),
 * the shop button and copy-link. The owner and a wish are icon badges in the panel's corner, as on the cards (in the text column when there is no picture).
 */
function ToyHero({ lang, p }: { lang: Lang; p: Post }) {
  const s = t[lang], hasPic = p.pictures.length > 0;
  const badges = <span className="badges"><OwnerBadge lang={lang} id={p.owner} section={p.section} />{p.section === TOYS_SECTION && p.status === "want" && <WantBadge label={s.statusWant} />}{!p.own && <NoCopyBadge label={s.ownNoLabel} />}</span>;
  const book = p.section === BOOKS_SECTION, game = p.section === GAMES_SECTION, bookish = book || game, tile = bookish && !hasPic;   // a book without a cover shows its title on a tile where the pictures would be
  return (
    <header className={hasPic || tile ? "toy-hero has-pic" : "toy-hero"}>
      {tile && <div className="toy-hero-pic"><BookTile title={p.title} author={game ? platformLine(lang, p.section, p.platform) : p.author} owner={p.owner} /></div>}
      {hasPic && <Gallery lang={lang} className="toy-hero-pic" badges={badges} keys={p.pictures.map((pic) => pic.src)} slides={p.pictures.map((pic) => <img src={pic.src} alt={pic.alt} decoding="async" />)} />}
      <div className="toy-hero-info">
        {!hasPic && badges}
        <h1>{p.title}</h1>
        {bookish && p.original && <p className="book-original meta">{p.original}</p>}
        {(p.draft || p.private) && <p className="meta"><strong>{p.draft ? s.draft : s.privateNote}</strong></p>}
        <dl className="toy-facts">
          {p.author && <><dt>{s.author}</dt><dd>{p.author.split(", ").map((a, i) => <span key={a}>{i > 0 && ", "}<a href={`/${lang}/search/?q=${encodeURIComponent(a)}`}>{a}</a></span>)}</dd></>}
          {game && p.platform.length > 0 && <><dt>{s.platformLabel}</dt><dd>{platformLine(lang, p.section, p.platform)}</dd></>}
          {game && p.developer && <><dt>{s.developer}</dt><dd>{p.developer}</dd></>}
          {book && p.type === "comic" && <><dt>{s.typeLabel}</dt><dd>{s.typeComic}</dd></>}
          {p.price && <><dt>{s.price}</dt><dd className="price">{p.price}</dd></>}
          {p.quantity >= 2 && <><dt>{s.quantity}</dt><dd>{p.quantity}</dd></>}
          <dt>{s.added}</dt><dd><time dateTime={p.date}>{p.date}</time>{p.updated && <> · {s.updated} <time dateTime={p.updated}>{p.updated}</time></>}</dd>
          {p.tags.length > 0 && <><dt>{s.tags}</dt><dd><TagList lang={lang} tags={p.tags} /></dd></>}
        </dl>
        {book && p.volumes.length > 0 && <div className="book-volumes"><p className="meta">{s.volumesCount(p.volumes.length)}</p><ol>{p.volumes.map((v, i) => <li key={i}>{v}</li>)}</ol></div>}
        {/* A book's source is only a quiet text link: many books are out of print, so there is no button. A book that is only read (own: no) links to where to read it, plainly. */}
        {bookish && p.source && (p.own
          ? <p className="book-source"><a href={p.source} rel="noopener noreferrer nofollow">{s.bookSource}</a></p>
          : <p className="book-read"><a href={p.source} rel="noopener noreferrer nofollow">{s.readHere}</a></p>)}
        <div className="toy-actions">
          {/* The shop's page: an outside site, so no referrer and no endorsement for search engines. Only this button carries the address. */}
          {p.source && !bookish && <a className="button" href={p.source} rel="noopener noreferrer nofollow">{s.viewShop}<Icon name="arrow" /></a>}
          <Share lang={lang} title={p.title} />
        </div>
      </div>
    </header>
  );
}

function PostPage({ route }: { route: Extract<Route, { kind: "post" }> }) {
  const { lang } = route, s = t[lang], p = route.props;
  const missing = route.alternates.find((a) => a.translated === false);
  const toy = Boolean(gridOf(p.section));
  return (
    <article className={`post post-${p.slug}${toy ? " toy-page" : ""}`}>
      {toy ? <ToyHero lang={lang} p={p} /> : (
        <header>
          <h1>{p.title}</h1>
          <p className="meta">
            <time dateTime={p.date}>{p.date}</time>
            {p.updated && <> · {s.updated} <time dateTime={p.updated}>{p.updated}</time></>}
            {" · "}{s.words(p.words)}
            {p.draft && <> · <strong>{s.draft}</strong></>}
            {p.private && <> · <strong>{s.privateNote}</strong></>}
          </p>
          <TagList lang={lang} tags={p.tags} />
          <Share lang={lang} title={p.title} />
        </header>
      )}
      {missing && site.languageSwitcher !== false && <p className="notice">{t[missing.lang].noTranslation}</p>}
      {/* Markdown is rendered with raw HTML off; .html posts pass an allowlist sanitizer (scripts/sanitize.mjs). A post's own CSS targets .post-<slug>. */}
      {p.html.trim() && <div className="prose" dangerouslySetInnerHTML={{ __html: p.html }} />}
      <p><a href={`/${lang}/${p.section}/`}>← {sectionTitle(lang, p.section)}</a></p>
    </article>
  );
}

/** The owners of all picture-grid sections for the search page: an id once, labelled by the first section that has it. */
function searchOwners(lang: Lang) {
  const seen = new Set<string>();
  return site.sections.flatMap((sec: { id: string; grid?: { owners?: { id: string }[] } }) => (sec.grid?.owners ?? []).map((o) => ({ id: o.id, label: ownerShort(lang, o.id, sec.id) })))
    .filter((o: { id: string }) => !seen.has(o.id) && seen.add(o.id));
}

/** The facet filters of every picture-grid section for the search page, as buttons; src/search-client.ts shows those of the chosen scope only. */
function searchFacets(ui: "tabs" | "toggle", lang: Lang) {
  const s = t[lang];
  return site.sections.flatMap((sec: { id: string; grid?: { facets?: string[]; platforms?: { id: string }[] } }) => (sec.grid?.facets ?? []).filter((id) => FACETS[id as keyof typeof FACETS].ui === ui).map((id) => (
    <nav key={`${sec.id}-${id}`} className={ui === "tabs" ? "scope-tabs" : "own-toggle"} data-facet-for={sec.id} data-facet={id} aria-label={facetLabel(lang, id)} hidden>
      {[{ id: "", label: s.ownAll }, ...facetValues(id, sec.grid).map((v: string) => ({ id: v, label: facetValueLabel(lang, id, v, sec.id) }))].map((v) => (
        <button key={v.id} type="button" data-value={v.id} aria-pressed={!v.id}>{id === "own" && v.id === "no" && <Icon name="book" />}{v.label}</button>
      ))}
    </nav>
  )));
}

function Search({ route }: { route: Extract<Route, { kind: "search" }> }) {
  const { lang } = route, s = t[lang];
  return (
    <div id="search" data-index={route.props.index} data-loading={s.searchLoading} data-none={s.searchNone} data-count={s.searchCount} data-error={s.searchError} data-remove={s.removeTag} data-shown="12">
      <h1>{s.search}</h1>
      <form role="search" action={`/${lang}/search/`} method="get">
        <label htmlFor="q" className="meta">{s.searchHint}</label>
        <div className="tokens">
          <ul id="chips" className="chips" aria-label={s.tags} />
          <input id="q" name="q" type="search" autoComplete="off" placeholder={s.searchPlaceholder} />
        </div>
      </form>
      <nav className="scope-tabs" id="scope" aria-label={s.scope}>
        {[["all", s.ownerAll], ["posts", s.scopePosts], ...site.sections.filter((sec: { grid?: unknown }) => sec.grid).map((sec: { id: string }) => [sec.id, gridOf(sec.id)!.scope[lang]])].map(([id, label]) => (
          <button key={id} type="button" data-scope={id} aria-pressed={id === "all"}>{label}</button>
        ))}
      </nav>
      {searchFacets("tabs", lang)}
      {/* Owner pills of every picture-grid section (one row, an id once), always shown; the facet tabs and toggles (type, own, platform) of a section are shown by src/search-client.ts only in that scope. */}
      <div className="grid-filters">
        <nav className="owner-chips" id="owners" aria-label={s.ownerLabel}>
          <span className="owner-chips-label" aria-hidden="true">{s.ownerLabel}</span>
          {searchOwners(lang).map((o) => (
            <button key={o.id} type="button" data-owner={o.id} className={`owner-${o.id}`} aria-pressed="false"><Icon name={ownerIcon(o.id)} />{o.label}</button>
          ))}
        </nav>
        {searchFacets("toggle", lang)}
      </div>
      {route.props.tags.length > 0 && (
        <div id="tag-suggest">
          <p className="meta">{s.tags}</p>
          <ul className="tags tags-suggest">
            {route.props.tags.map((x, i) => (
              <li key={x.tag} hidden={i >= 12}><a href={tagPath(lang, x.tag)} data-tag={x.tag}>{x.tag}<span className="count">{x.count}</span></a></li>
            ))}
          </ul>
        </div>
      )}
      <noscript><p className="notice">{s.searchNoJs}</p></noscript>
      <p id="search-status" role="status" className="meta" />
      <ul id="results" className="results" />
    </div>
  );
}

function Page({ route }: { route: Extract<Route, { kind: "page" }> }) {
  return (
    <article className={`post page-${route.props.name}`}>
      <h1>{route.props.title}</h1>
      <div className="prose" dangerouslySetInnerHTML={{ __html: route.props.html }} />
    </article>
  );
}

// "/" is only a redirect (see scripts/template.mjs); this is what a reader sees if the redirect is blocked.
function Entry() {
  return (
    <main id="main" className="wrap picker">
      <p>{site.langs.map((l: string, i: number) => <span key={l}>{i > 0 && " · "}<a href={`/${l}/`} hrefLang={l} lang={l}>{t[l as Lang].langName}</a></span>)}</p>
    </main>
  );
}

function NotFound({ route }: { route: Route }) {
  const s = t[route.lang];
  return (
    <Layout route={route}>
      <h1>{s.notFound}</h1>
      <p><a href="/">{s.backHome}</a></p>
    </Layout>
  );
}

export function App({ route }: { route: Route }) {
  switch (route.kind) {
    case "entry": return <Entry />;
    case "notfound": return <NotFound route={route} />;
    case "home": return <Layout route={route}><Home route={route} /></Layout>;
    case "index": return <Layout route={route}><Index route={route} /></Layout>;
    case "grid": return <Layout route={route} wide><ToyGrid route={route} /></Layout>;
    case "post": return <Layout route={route} wide={Boolean(gridOf(route.props.section))}><PostPage route={route} /></Layout>;
    case "page": return <Layout route={route}><Page route={route} /></Layout>;
    case "search": return <Layout route={route}><Search route={route} /></Layout>;
    case "tags": return <Layout route={route}><TagsPage route={route} /></Layout>;
  }
}
