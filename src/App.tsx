import type { ReactNode } from "react";
import { site } from "../site.config.mjs";
import { t, title, tagline, sectionTitle, ownerTitle, type Lang } from "./i18n";
import type { Brief, Route, ToySlide } from "./types";
import { ThemeToggle } from "./ThemeToggle";
import { SEASON_ISLAND_ID } from "./SeasonToggle";
import { tagPath, tagsIndexPath } from "./tags.mjs";
import { TOYS_SECTION, ownerPath } from "./toys.mjs";
import { Icon, OwnerBadge, WantBadge, ownerIcon } from "./icons";

import { tagSlug as tagSlugOf } from "./tags.mjs";
const postHref = (lang: Lang, section: string, slug: string) => `/${lang}/${section}/${slug}/`;
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
          <nav aria-label="Main">
            <a href={`/${lang}/`}>{s.home}</a>
            {site.sections.map((sec: { id: string }) => <a key={sec.id} href={`/${lang}/${sec.id}/`}>{sectionTitle(lang, sec.id)}</a>)}
            <a href={`/${lang}/search/`}>{s.search}</a>
            <a href={`/${lang}/about/`}>{s.about}</a>
            <a href={site.github} rel="noopener noreferrer">{s.github}</a>
          </nav>
          <div className="tools">
            {other && site.languageSwitcher !== false && <a className="lang" href={other.path} hrefLang={other.lang} lang={other.lang}>{t[other.lang].langName}</a>}
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

function TagList({ lang, tags }: { lang: Lang; tags: string[] }) {
  if (tags.length === 0) return null;
  return <ul className="tags" aria-label={t[lang].tags}>{tags.map((x) => <li key={x}><a href={tagPath(lang, tagSlugOf(x))}>{x}</a></li>)}</ul>;
}

function PostItem({ lang, p }: { lang: Lang; p: Brief }) {
  const href = postHref(lang, p.section, p.slug);
  return (
    <article className={p.thumb ? "post-item has-thumb" : "post-item"}>
      {p.thumb && <a className="thumb" href={href} tabIndex={-1} aria-hidden="true"><img src={p.thumb} alt="" width={400} height={210} loading="lazy" decoding="async" /></a>}
      <div className="post-item-text">
        <h3><a href={href}>{p.title}</a></h3>
        <p>{p.summary}</p>
        <TagList lang={lang} tags={p.tags} />
      </div>
    </article>
  );
}

/**
 * A panel whose slides share one place: a horizontal strip that snaps one slide at a time, so it works with a swipe, the scrollbar
 * or the arrow keys and no script. /src/gallery-client.ts adds the round buttons, keeps the current dot (or the "1 / N" counter)
 * in step and stops the arrow keys from scrolling the page. The dots are links to #pic-N, so a slide can be deep-linked.
 * `badges` sits in the panel's corner above the slides. One slide: the plain panel, no buttons, no dots.
 */
function Gallery({ lang, slides, keys, badges, counter, className }: { lang: Lang; slides: ReactNode[]; keys: string[]; badges?: ReactNode; counter?: boolean; className?: string }) {
  const s = t[lang], many = slides.length > 1;
  return (
    <div className={className ? `gallery ${className}` : "gallery"} data-gallery={many ? "" : undefined}>
      <div className="gallery-strip" tabIndex={many ? 0 : undefined} role={many ? "group" : undefined} aria-label={many ? s.pictures : undefined}>
        {slides.map((slide, i) => <div key={keys[i]} className="gallery-slide" id={many ? `pic-${i + 1}` : undefined}>{slide}</div>)}
      </div>
      {badges}
      {many && (
        <>
          <button type="button" className="gallery-nav gallery-prev" data-prev aria-label={s.prevPicture} hidden><Icon name="chevronLeft" /></button>
          <button type="button" className="gallery-nav gallery-next" data-next aria-label={s.nextPicture} hidden><Icon name="chevronRight" /></button>
          {counter
            ? <span className="gallery-count" hidden><span data-count>1</span> / {slides.length}</span>
            : <span className="gallery-dots">{slides.map((_, i) => <a key={keys[i]} href={`#pic-${i + 1}`} data-dot aria-label={s.pictureN(i + 1)} />)}</span>}
        </>
      )}
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

function Home({ route }: { route: Extract<Route, { kind: "home" }> }) {
  const { lang } = route, s = t[lang];
  return (
    <>
      <h1 className="motto">{tagline(lang)}</h1>
      <HomeToys lang={lang} toys={route.props.toys} />
      <section>
        <h2>{s.featured}</h2>
        {route.props.featured.length === 0 ? <p>{s.noPosts}</p> : route.props.featured.map((p) => <PostItem key={`${p.section}/${p.slug}`} lang={lang} p={p} />)}
        <p className="more-sections">{route.props.sections.map((sec) => <a key={sec.id} href={`/${lang}/${sec.id}/`}>{sectionTitle(lang, sec.id)}（{sec.total}）</a>)}</p>
      </section>
    </>
  );
}

function PostList({ lang, heading, groups, page, pages, hrefFor }: {
  lang: Lang; heading: ReactNode; groups: { date: string; items: Brief[] }[]; page: number; pages: number; hrefFor: (n: number) => string;
}) {
  const s = t[lang];
  return (
    <>
      <h1>{heading}</h1>
      {groups.length === 0 && <p>{s.noPosts}</p>}
      {groups.map((g) => (
        <section key={g.date}>
          <h2 className="date"><time dateTime={g.date}>{g.date}</time></h2>
          {g.items.map((p) => <PostItem key={`${p.section}/${p.slug}`} lang={lang} p={p} />)}
        </section>
      ))}
      <Pager lang={lang} page={page} pages={pages} hrefFor={hrefFor} />
    </>
  );
}

function Pager({ lang, page, pages, hrefFor }: { lang: Lang; page: number; pages: number; hrefFor: (n: number) => string }) {
  const s = t[lang];
  if (pages <= 1) return null;
  return (
    <nav className="pager" aria-label="Pagination">
      {page > 1 ? <a rel="prev" href={hrefFor(page - 1)}>{s.prev}</a> : <span />}
      <span>{s.page(page, pages)}</span>
      {page < pages ? <a rel="next" href={hrefFor(page + 1)}>{s.next}</a> : <span />}
    </nav>
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
function ToyCard({ lang, p }: { lang: Lang; p: Brief }) {
  const href = postHref(lang, p.section, p.slug), pic = p.card || p.thumb;
  return (
    <li className="toy-card">
      <a className="toy-pic" href={href} tabIndex={-1} aria-hidden="true">
        {pic ? <img src={pic} alt="" width={p.card ? 480 : 400} height={p.card ? 480 : 210} loading="lazy" decoding="async" /> : <span className="no-thumb"><Icon name="tag" /></span>}
      </a>
      <span className="badges"><OwnerBadge lang={lang} id={p.owner} />{p.status === "want" && <WantBadge label={t[lang].statusWant} />}</span>
      {p.quantity >= 2 && <span className="qty" title={`${t[lang].quantity} ${p.quantity}`} aria-label={`${t[lang].quantity} ${p.quantity}`}>×{p.quantity}</span>}
      <h3><a href={href}>{p.title}</a></h3>
      <TagList lang={lang} tags={p.tags.slice(0, 2)} />
    </li>
  );
}

function ToyGrid({ route }: { route: Extract<Route, { kind: "toys" }> }) {
  const { lang } = route, s = t[lang], { section, owner, owners, total, items, page, pages } = route.props;
  const filter = [{ id: "", total, label: s.ownerAll }, ...owners.map((o) => ({ ...o, label: ownerTitle(lang, o.id) }))];
  return (
    <>
      <h1>{sectionTitle(lang, section)}</h1>
      <nav className="owner-filter" aria-label={s.owner}>
        {filter.map((o) => (
          <a key={o.id} className={o.id ? `owner-${o.id}` : undefined} href={o.id ? ownerPath(lang, section, o.id) : pageHref(lang, section, 1)} aria-current={o.id === owner ? "page" : undefined}>
            {o.id && <Icon name={ownerIcon(o.id)} />}{o.label}<span className="count">{o.total}</span>
          </a>
        ))}
      </nav>
      {items.length === 0 && <p>{s.noToys}</p>}
      <ul className="toy-grid">{items.map((p) => <ToyCard key={p.slug} lang={lang} p={p} />)}</ul>
      <Pager lang={lang} page={page} pages={pages} hrefFor={(n) => (owner ? ownerPath(lang, section, owner, n) : pageHref(lang, section, n))} />
    </>
  );
}

function TagPage({ route }: { route: Extract<Route, { kind: "tag" }> }) {
  const { lang } = route, { tag, slug, groups, page, pages } = route.props;
  return <PostList lang={lang} heading={t[lang].tagged(tag)} groups={groups} page={page} pages={pages} hrefFor={(n) => tagPath(lang, slug, n)} />;
}

function TagsIndex({ route }: { route: Extract<Route, { kind: "tags" }> }) {
  const { lang } = route, s = t[lang];
  return (
    <>
      <h1>{s.tags}</h1>
      {route.props.tags.length === 0 && <p>{s.noTags}</p>}
      <ul className="tags tags-all">{route.props.tags.map((x) => <li key={x.slug}><a href={tagPath(lang, x.slug)}>{x.tag}<span className="count">{s.postCount(x.count)}</span></a></li>)}</ul>
    </>
  );
}

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
  const badges = <span className="badges"><OwnerBadge lang={lang} id={p.owner} />{p.status === "want" && <WantBadge label={s.statusWant} />}</span>;
  return (
    <header className={hasPic ? "toy-hero has-pic" : "toy-hero"}>
      {hasPic && <Gallery lang={lang} className="toy-hero-pic" badges={badges} keys={p.pictures.map((pic) => pic.src)} slides={p.pictures.map((pic) => <img src={pic.src} alt={pic.alt} decoding="async" />)} />}
      <div className="toy-hero-info">
        {!hasPic && badges}
        <h1>{p.title}</h1>
        {(p.draft || p.private) && <p className="meta"><strong>{p.draft ? s.draft : s.privateNote}</strong></p>}
        <dl className="toy-facts">
          {p.price && <><dt>{s.price}</dt><dd className="price">{p.price}</dd></>}
          {p.quantity >= 2 && <><dt>{s.quantity}</dt><dd>{p.quantity}</dd></>}
          <dt>{s.added}</dt><dd><time dateTime={p.date}>{p.date}</time>{p.updated && <> · {s.updated} <time dateTime={p.updated}>{p.updated}</time></>}</dd>
          {p.tags.length > 0 && <><dt>{s.tags}</dt><dd><TagList lang={lang} tags={p.tags} /></dd></>}
        </dl>
        <div className="toy-actions">
          {/* The shop's page: an outside site, so no referrer and no endorsement for search engines. Only this button carries the address. */}
          {p.source && <a className="button" href={p.source} rel="noopener noreferrer nofollow">{s.viewShop}<Icon name="arrow" /></a>}
          <Share lang={lang} title={p.title} />
        </div>
      </div>
    </header>
  );
}

function PostPage({ route }: { route: Extract<Route, { kind: "post" }> }) {
  const { lang } = route, s = t[lang], p = route.props;
  const missing = route.alternates.find((a) => a.translated === false);
  const toy = p.section === TOYS_SECTION;
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
      <nav className="owner-filter scope-filter" id="scope" aria-label={s.scope}>
        {([["all", s.ownerAll], ["posts", s.scopePosts], ["toys", s.scopeToys]] as const).map(([id, label]) => (
          <button key={id} type="button" data-scope={id} aria-pressed={id === "all"}>{label}</button>
        ))}
      </nav>
      {route.props.tags.length > 0 && (
        <div id="tag-suggest">
          <p className="meta">{s.tags}</p>
          <ul className="tags tags-suggest">
            {route.props.tags.map((x, i) => (
              <li key={x.slug} hidden={i >= 12}><a href={tagPath(lang, x.slug)} data-tag={x.tag}>{x.tag}<span className="count">{x.count}</span></a></li>
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
    case "toys": return <Layout route={route} wide><ToyGrid route={route} /></Layout>;
    case "post": return <Layout route={route} wide={route.props.section === TOYS_SECTION}><PostPage route={route} /></Layout>;
    case "page": return <Layout route={route}><Page route={route} /></Layout>;
    case "search": return <Layout route={route}><Search route={route} /></Layout>;
    case "tags": return <Layout route={route}><TagsIndex route={route} /></Layout>;
    case "tag": return <Layout route={route}><TagPage route={route} /></Layout>;
  }
}
