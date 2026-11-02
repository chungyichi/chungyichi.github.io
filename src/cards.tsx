// The list pieces shared by the server-rendered pages and the browser-side grid and tag pages (src/Browse.tsx): tag links, post rows, grid cards, the pager.
import type { ReactNode, MouseEvent } from "react";
import { t, facetValueLabel, type Lang } from "./i18n";
import type { Brief } from "./types";
import { tagPath } from "./tags.mjs";
import { TOYS_SECTION, BOOKS_SECTION, GAMES_SECTION } from "./toys.mjs";
import { Icon, NoCopyBadge, OwnerBadge, WantBadge } from "./icons";

export const postHref = (lang: Lang, section: string, slug: string) => `/${lang}/${section}/${slug}/`;

/** True for a plain left click (not a new-tab or download click): the browser-side pages take it over, every other click follows the link. */
export const isPlainClick = (e: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }) => e.button === 0 && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey);

export function TagList({ lang, tags }: { lang: Lang; tags: string[] }) {
  if (tags.length === 0) return null;
  return <ul className="tags" aria-label={t[lang].tags}>{tags.map((x) => <li key={x}><a href={tagPath(lang, x)}>{x}</a></li>)}</ul>;
}

export function PostItem({ lang, p }: { lang: Lang; p: Brief }) {
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

/** Previous / next links. With `onPage` (the browser-side pages) a plain click changes the page without loading a new one. */
export function Pager({ lang, page, pages, hrefFor, onPage }: { lang: Lang; page: number; pages: number; hrefFor: (n: number) => string; onPage?: (n: number) => void }) {
  const s = t[lang];
  if (pages <= 1) return null;
  const go = (n: number) => onPage ? (e: MouseEvent) => { if (isPlainClick(e)) { e.preventDefault(); onPage(n); } } : undefined;
  return (
    <nav className="pager" aria-label="Pagination">
      {page > 1 ? <a rel="prev" href={hrefFor(page - 1)} onClick={go(page - 1)}>{s.prev}</a> : <span />}
      <span>{s.page(page, pages)}</span>
      {page < pages ? <a rel="next" href={hrefFor(page + 1)} onClick={go(page + 1)}>{s.next}</a> : <span />}
    </nav>
  );
}

/** The stand-in for a book without a cover: its title (and author, small) on a soft square tile tinted by the owner's colour. */
export function BookTile({ title, author, owner }: { title: string; author: string; owner: string }) {
  return <span className={`book-tile${owner ? ` owner-${owner}` : ""}`}><span className="book-tile-title">{title}</span>{author && <span className="book-tile-author">{author}</span>}</span>;
}

/** The platforms of a game as one compact line: "Steam · PS". */
export const platformLine = (lang: Lang, section: string, ids: string[]) => ids.map((id) => facetValueLabel(lang, "platform", id, section)).join(" · ");

export function ToyCard({ lang, p }: { lang: Lang; p: Brief }) {
  const href = postHref(lang, p.section, p.slug), pic = p.card || p.thumb;
  // a small line under the name: a game's progress and platforms, a comic's type (a novel shows nothing)
  const note = p.section === GAMES_SECTION ? platformLine(lang, p.section, p.platform) : p.type === "comic" ? t[lang].typeComic : "";
  return (
    <li className="toy-card">
      <a className="toy-pic" href={href} tabIndex={-1} aria-hidden="true">
        {pic ? <img src={pic} alt="" width={p.card ? 480 : 400} height={p.card ? 480 : 210} loading="lazy" decoding="async" /> : p.section === BOOKS_SECTION || p.section === GAMES_SECTION ? <BookTile title={p.title} author={p.section === GAMES_SECTION ? platformLine(lang, p.section, p.platform) : p.author} owner={p.owner} /> : <span className="no-thumb"><Icon name="tag" /></span>}
      </a>
      <span className="badges"><OwnerBadge lang={lang} id={p.owner} section={p.section} />{p.section === TOYS_SECTION && p.status === "want" && <WantBadge label={t[lang].statusWant} />}{!p.own && <NoCopyBadge label={t[lang].ownNoLabel} />}</span>
      {p.quantity >= 2 && <span className="qty" title={`${t[lang].quantity} ${p.quantity}`} aria-label={`${t[lang].quantity} ${p.quantity}`}>×{p.quantity}</span>}
      <h3><a href={href}>{p.title}</a></h3>
      {note && <p className="card-note">{note}</p>}
      <TagList lang={lang} tags={p.tags.slice(0, 2)} />
    </li>
  );
}


/** A heading and posts grouped by date, with a pager. */
export function PostList({ lang, heading, groups, page, pages, hrefFor, onPage }: {
  lang: Lang; heading: ReactNode; groups: { date: string; items: Brief[] }[]; page: number; pages: number; hrefFor: (n: number) => string; onPage?: (n: number) => void;
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
      <Pager lang={lang} page={page} pages={pages} hrefFor={hrefFor} onPage={onPage} />
    </>
  );
}

