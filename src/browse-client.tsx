// The grid pages and the tag page (only): fetch the language's index data once, then render the same components as the build (src/Browse.tsx)
// for the state in the address, and keep the address in step: /zh/books/?owner=me&own=no&page=2, /zh/tags/?tag=x. The server-rendered first page
// stays on screen until the data is here (and stays if the fetch fails; every control is a plain link then).
import { createRoot } from "react-dom/client";
import { GridBrowser, TagsBrowser, type GridState, type TagState } from "./Browse";
import { entriesOfSection, gridHref, parseGridState, parseTagState } from "./grid-core.mjs";
import { gridOf, t, title, type Lang } from "./i18n";
import type { Entry } from "./types";
import { tagPath } from "./tags.mjs";

const el = document.getElementById("browse");
if (el) {
  const lang = (document.documentElement.lang === "en" ? "en" : "zh") as Lang;
  const originalTitle = document.title;
  const root = createRoot(el);
  void fetch(el.dataset.index!)
    .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<Entry[]>; })
    .then((entries) => {
      if (el.dataset.kind === "grid") {
        const section = el.dataset.section!, path = `/${lang}/${section}/`, mine = entriesOfSection(entries, lang, section);
        const read = (): GridState => parseGridState(location.search, gridOf(section));
        const draw = (state: GridState) => root.render(<GridBrowser lang={lang} section={section} entries={mine} state={state} go={go} />);
        const go = (state: GridState) => { const before = read().page; history.pushState(null, "", gridHref(path, state)); draw(state); if (state.page !== before) window.scrollTo(0, 0); };
        window.addEventListener("popstate", () => draw(read()));
        draw(read());
      } else {
        const read = (): TagState => parseTagState(location.search);
        const draw = (state: TagState) => {
          document.title = state.tag ? `${t[lang].tagged(state.tag)} · ${title(lang)}` : originalTitle;
          root.render(<TagsBrowser lang={lang} entries={entries} state={state} go={go} />);
        };
        const go = (state: TagState) => { history.pushState(null, "", state.tag ? tagPath(lang, state.tag, state.page) : `/${lang}/tags/`); draw(state); window.scrollTo(0, 0); };
        window.addEventListener("popstate", () => draw(read()));
        draw(read());
      }
    })
    .catch(() => { /* keep the server-rendered page */ });
}
