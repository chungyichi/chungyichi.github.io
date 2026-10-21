import type { ReactNode } from "react";
import { site } from "../site.config.mjs";
import { t, title, tagline, type Lang } from "./i18n";
import type { Brief, Route } from "./types";
import { ThemeToggle } from "./ThemeToggle";

const postHref = (lang: Lang, slug: string) => `/${lang}/blog/${slug}/`;
const pageHref = (lang: Lang, n: number) => (n === 1 ? `/${lang}/blog/` : `/${lang}/blog/page/${n}/`);

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
            <a href={`/${lang}/blog/`}>{s.blog}</a>
            <a href={`/${lang}/about/`}>{s.about}</a>
            <a href={site.github} rel="noopener noreferrer">{s.github}</a>
            <a href={`/${lang}/atom.xml`}>{s.feed}</a>
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
      <h3><a href={postHref(lang, p.slug)}>{p.title}</a></h3>
      <p>{p.summary}</p>
      <p className="more"><a href={postHref(lang, p.slug)}>{t[lang].readMore}</a></p>
    </article>
  );
}

function Home({ route }: { route: Extract<Route, { kind: "home" }> }) {
  const { lang } = route, s = t[lang];
  return (
    <>
      <h1>{title(lang)}</h1>
      <p className="lead">{tagline(lang)}</p>
      <h2>{s.latest}</h2>
      {route.props.latest.length === 0 ? <p>{s.noPosts}</p> : route.props.latest.map((p) => <PostItem key={p.slug} lang={lang} p={p} />)}
      {route.props.total > route.props.latest.length && <p><a href={`/${lang}/blog/`}>{s.all}</a></p>}
    </>
  );
}

function Index({ route }: { route: Extract<Route, { kind: "index" }> }) {
  const { lang } = route, s = t[lang], { groups, page, pages } = route.props;
  return (
    <>
      <h1>{s.blog}</h1>
      {groups.length === 0 && <p>{s.noPosts}</p>}
      {groups.map((g) => (
        <section key={g.date}>
          <h2 className="date"><time dateTime={g.date}>{g.date}</time></h2>
          {g.items.map((p) => <PostItem key={p.slug} lang={lang} p={p} />)}
        </section>
      ))}
      {pages > 1 && (
        <nav className="pager" aria-label="Pagination">
          {page > 1 ? <a rel="prev" href={pageHref(lang, page - 1)}>{s.prev}</a> : <span />}
          <span>{s.page(page, pages)}</span>
          {page < pages ? <a rel="next" href={pageHref(lang, page + 1)}>{s.next}</a> : <span />}
        </nav>
      )}
    </>
  );
}

function PostPage({ route }: { route: Extract<Route, { kind: "post" }> }) {
  const { lang } = route, s = t[lang], p = route.props;
  const missing = route.alternates.find((a) => a.translated === false);
  return (
    <article className="post">
      <header>
        <h1>{p.title}</h1>
        <p className="meta">
          <time dateTime={p.date}>{p.date}</time>
          {p.updated && <> · {s.updated} <time dateTime={p.updated}>{p.updated}</time></>}
          {" · "}{s.words(p.words)}
          {p.draft && <> · <strong>{s.draft}</strong></>}
        </p>
        {missing && <p className="notice">{t[missing.lang].noTranslation}</p>}
      </header>
      {/* The HTML comes from our own Markdown, rendered with raw HTML disabled (see scripts/content.mjs). */}
      <div className="prose" dangerouslySetInnerHTML={{ __html: p.html }} />
      <p><a href={`/${lang}/blog/`}>← {s.blog}</a></p>
    </article>
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

function Picker() {
  return (
    <main id="main" className="wrap picker">
      <h1>{site.title.en}</h1>
      <p>{t.zh.chooseLang}</p>
      <ul>
        {site.langs.map((l) => <li key={l}><a href={`/${l}/`} hrefLang={l} lang={l}>{t[l as Lang].langName}</a></li>)}
      </ul>
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
    case "picker": return <Picker />;
    case "notfound": return <NotFound route={route} />;
    case "home": return <Layout route={route}><Home route={route} /></Layout>;
    case "index": return <Layout route={route}><Index route={route} /></Layout>;
    case "post": return <Layout route={route}><PostPage route={route} /></Layout>;
    case "page": return <Layout route={route}><Page route={route} /></Layout>;
  }
}
