// The grid pages (toys, books, games) and the tag page, filtered in the browser. The same components render the first page of the unfiltered list
// at build time (every control is a plain link with its query URL, so without JavaScript the page is still whole) and, in src/browse-client.tsx,
// the filtered view on the index data. The numbers and pages come from src/grid-core.mjs; `go` is only given in the browser.
import { site } from "../site.config.mjs";
import { t, ownerTitle, gridOf, facetLabel, facetValueLabel, type Lang } from "./i18n";
import type { Entry, GridViewData } from "./types";
import { FACETS } from "./toys.mjs";
import { Icon, ownerIcon } from "./icons";
import { gridHref, gridView, briefOfEntry, groupByDate, tagCounts, tagView } from "./grid-core.mjs";
import { tagPath, tagsIndexPath, tagSlug } from "./tags.mjs";
import { isPlainClick, Pager, PostList, ToyCard } from "./cards";
import type { MouseEvent } from "react";

export type GridState = { owner: string; filters: Record<string, string>; page: number };
export type TagState = { tag: string; page: number };

/** A link that, in the browser, changes the state instead of loading a page (not for new-tab clicks). */
const link = <S,>(href: string, next: S, go?: (s: S) => void) => ({ href, onClick: go ? (e: MouseEvent) => { if (isPlainClick(e)) { e.preventDefault(); go(next); } } : undefined });

/** The owner buttons, the facet tabs and toggles, the cards and the pager of one grid section. `entries`: the section's entries, newest first. */
export function GridBrowser({ lang, section, entries, state, go }: { lang: Lang; section: string; entries: Entry[]; state: GridState; go?: (s: GridState) => void }) {
  const s = t[lang], grid = gridOf(section)!, { owner, filters } = state;
  const v: GridViewData = gridView(entries, grid, state);
  const path = `/${lang}/${section}/`;
  const ownerLinks = [{ id: "", total: v.total, label: s.ownerAll }, ...v.owners.map((o) => ({ ...o, label: ownerTitle(lang, o.id, section) }))];
  // one entry per facet: the 全部 choice first, each link keeps the owner and the other facets
  const facetLinks = v.facets.map((f) => ({ ...f, ui: FACETS[f.id as keyof typeof FACETS].ui, links: [{ id: "", total: f.total, label: s.ownAll }, ...f.values.map((x) => ({ ...x, label: facetValueLabel(lang, f.id, x.id, section) }))] }));
  const facetHref = (id: string, value: string) => { const next = { owner, filters: { ...filters, [id]: value }, page: 1 }; return link(gridHref(path, next), next, go); };
  return (
    <>
      {facetLinks.filter((f) => f.ui === "tabs").map((f) => (
        <nav key={f.id} className="scope-tabs" aria-label={facetLabel(lang, f.id)}>
          {f.links.map((l) => <a key={l.id} {...facetHref(f.id, l.id)} aria-current={l.id === (filters[f.id] ?? "") ? "page" : undefined}>{l.label}<span className="count">{l.total}</span></a>)}
        </nav>
      ))}
      <div className="grid-filters">
        {grid.owners && grid.owners.length > 0 && <nav className="owner-filter" aria-label={grid.ownerLabel?.[lang]}>
          {ownerLinks.map((o) => {
            const next = { owner: o.id, filters, page: 1 };
            return (
              <a key={o.id} className={o.id ? `owner-${o.id}` : undefined} {...link(gridHref(path, next), next, go)} aria-current={o.id === owner ? "page" : undefined}>
                {o.id && <Icon name={ownerIcon(o.id)} />}{o.label}<span className="count">{o.total}</span>
              </a>
            );
          })}
        </nav>}
        {facetLinks.filter((f) => f.ui === "toggle").map((f) => (
          <nav key={f.id} className="own-toggle" aria-label={facetLabel(lang, f.id)}>
            {f.links.map((l) => (
              <a key={l.id} {...facetHref(f.id, l.id)} aria-current={l.id === (filters[f.id] ?? "") ? "page" : undefined}>
                {f.id === "own" && l.id === "no" && <Icon name="book" />}{l.label}<span className="count">{l.total}</span>
              </a>
            ))}
          </nav>
        ))}
      </div>
      {v.items.length === 0 && <p>{grid.empty[lang]}</p>}
      <ul className="toy-grid">{v.items.map((e) => <ToyCard key={e.u} lang={lang} p={briefOfEntry(e)} />)}</ul>
      <Pager lang={lang} page={v.page} pages={v.pages} hrefFor={(n) => gridHref(path, { owner, filters, page: n })} onPage={go && ((n) => go({ owner, filters, page: n }))} />
    </>
  );
}

/** The tag page: the list of tags, or (a tag chosen) the posts that carry it, newest first, paged. `entries`: every entry of the language. */
export function TagsBrowser({ lang, entries, state, go }: { lang: Lang; entries: Entry[]; state: TagState; go?: (s: TagState) => void }) {
  const s = t[lang], path = tagsIndexPath(lang);
  if (!state.tag) {
    const tags = tagCounts(entries);
    return (
      <>
        <h1>{s.tags}</h1>
        {tags.length === 0 && <p>{s.noTags}</p>}
        <ul className="tags tags-all">{tags.map((x: { tag: string; slug: string; count: number }) => <li key={x.slug}><a {...link(tagPath(lang, x.tag), { tag: x.tag, page: 1 }, go)}>{x.tag}<span className="count">{s.postCount(x.count)}</span></a></li>)}</ul>
      </>
    );
  }
  const v = tagView(entries, state.tag, state.page, site.postsPerPage);
  // the tag as written on its posts, else as typed
  const name = tagCounts(entries).find((x: { tag: string; slug: string }) => x.slug === tagSlug(state.tag))?.tag ?? state.tag;
  return (
    <>
      <PostList lang={lang} heading={s.tagged(name)} groups={groupByDate(v.items.map(briefOfEntry))} page={v.page} pages={v.pages}
        hrefFor={(n) => tagPath(lang, name, n)} onPage={go && ((n) => go({ tag: name, page: n }))} />
      <p><a {...link(path, { tag: "", page: 1 }, go)}>← {s.tags}</a></p>
    </>
  );
}
