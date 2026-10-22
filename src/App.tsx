import type { ReactNode } from "react";
import { site } from "../site.config.mjs";
import { t, title, tagline, sectionTitle, type Lang } from "./i18n";
import type { Brief, Route } from "./types";
import { ThemeToggle } from "./ThemeToggle";

const postHref = (lang: Lang, section: string, slug: string) => `/${lang}/${section}/${slug}/`;
const pageHref = (lang: Lang, section: string, n: number) => (n === 1 ? `/${lang}/${section}/` : `/${lang}/${section}/page/${n}/`);

function Layout({ route, children }: { route: Route; children: ReactNode }) {
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
            {other && <a className="lang" href={other.path} hrefLang={other.lang} lang={other.lang}>{t[other.lang].langName}</a>}
            <span id="theme-island"><ThemeToggle label={s.toggleTheme} /></span>
          </div>
        </div>
        <p className="wrap tagline">{tagline(lang)}</p>
      </header>
      <main id="main" className="wrap">{children}</main>
      <footer className="site-footer">
        <div className="wrap">
          <p>© {new Date().getUTCFullYear()} {site.author} · {s.built}</p>
        </div>
      </footer>
    </>
  );
}

function PostItem({ lang, p }: { lang: Lang; p: Brief }) {
  return (
    <article className="post-item">
      <h3><a href={postHref(lang, p.section, p.slug)}>{p.title}</a></h3>
      <p>{p.summary}</p>
      <p className="more"><a href={postHref(lang, p.section, p.slug)}>{t[lang].readMore}</a></p>
    </article>
  );
}

function Home({ route }: { route: Extract<Route, { kind: "home" }> }) {
  const { lang } = route, s = t[lang];
  return (
    <>
      <h1>{title(lang)}</h1>
      <p className="lead">{tagline(lang)}</p>
      {route.props.sections.map((sec) => (
        <section key={sec.id}>
          <h2>{sectionTitle(lang, sec.id)}</h2>
          {sec.latest.length === 0 ? <p>{s.noPosts}</p> : sec.latest.map((p) => <PostItem key={p.slug} lang={lang} p={p} />)}
          {sec.total > sec.latest.length && <p><a href={`/${lang}/${sec.id}/`}>{s.allInSection}</a></p>}
        </section>
      ))}
    </>
  );
}

function Index({ route }: { route: Extract<Route, { kind: "index" }> }) {
  const { lang } = route, s = t[lang], { section, groups, page, pages } = route.props;
  return (
    <>
      <h1>{sectionTitle(lang, section)}</h1>
      {groups.length === 0 && <p>{s.noPosts}</p>}
      {groups.map((g) => (
        <section key={g.date}>
          <h2 className="date"><time dateTime={g.date}>{g.date}</time></h2>
          {g.items.map((p) => <PostItem key={p.slug} lang={lang} p={p} />)}
        </section>
      ))}
      {pages > 1 && (
        <nav className="pager" aria-label="Pagination">
          {page > 1 ? <a rel="prev" href={pageHref(lang, section, page - 1)}>{s.prev}</a> : <span />}
          <span>{s.page(page, pages)}</span>
          {page < pages ? <a rel="next" href={pageHref(lang, section, page + 1)}>{s.next}</a> : <span />}
        </nav>
      )}
    </>
  );
}

function PostPage({ route }: { route: Extract<Route, { kind: "post" }> }) {
  const { lang } = route, s = t[lang], p = route.props;
  const missing = route.alternates.find((a) => a.translated === false);
  return (
    <article className={`post post-${p.slug}`}>
      <header>
        <h1>{p.title}</h1>
        <p className="meta">
          <time dateTime={p.date}>{p.date}</time>
          {p.updated && <> · {s.updated} <time dateTime={p.updated}>{p.updated}</time></>}
          {" · "}{s.words(p.words)}
          {p.draft && <> · <strong>{s.draft}</strong></>}
          {p.private && <> · <strong>{s.privateNote}</strong></>}
        </p>
        {missing && <p className="notice">{t[missing.lang].noTranslation}</p>}
      </header>
      {/* Markdown is rendered with raw HTML off; .html posts pass an allowlist sanitizer (scripts/sanitize.mjs). A post's own CSS targets .post-<slug>. */}
      <div className="prose" dangerouslySetInnerHTML={{ __html: p.html }} />
      <p><a href={`/${lang}/${p.section}/`}>← {sectionTitle(lang, p.section)}</a></p>
    </article>
  );
}

function Search({ route }: { route: Extract<Route, { kind: "search" }> }) {
  const { lang } = route, s = t[lang];
  return (
    <div id="search" data-index={route.props.index} data-loading={s.searchLoading} data-none={s.searchNone} data-count={s.searchCount} data-error={s.searchError}>
      <h1>{s.search}</h1>
      <form role="search" action={`/${lang}/search/`} method="get">
        <label htmlFor="q" className="meta">{s.searchHint}</label>
        <input id="q" name="q" type="search" autoComplete="off" />
      </form>
      <noscript><p className="notice">{s.searchNoJs}</p></noscript>
      <p id="search-status" role="status" className="meta" />
      <ul id="results" className="results" />
    </div>
  );
}

function Page({ route }: { route: Extract<Route, { kind: "page" }> }) {
  return (
    <article className="post">
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
    case "post": return <Layout route={route}><PostPage route={route} /></Layout>;
    case "page": return <Layout route={route}><Page route={route} /></Layout>;
    case "search": return <Layout route={route}><Search route={route} /></Layout>;
  }
}
