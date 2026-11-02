// Search page behaviour. Loaded only on the search page. Results are built with textContent, never innerHTML,
// so nothing in the index can inject markup.
// Typing #tag and a space (or Enter) turns the word into a tag chip; chips and free text combine into one query.
import { prepare, search, normalize, parseQuery, buildQuery, inScope, inFilter, list as listAll, SCOPES } from "./search-core.mjs";
import { tagPath } from "./tags.mjs";
import { writeFilters } from "./grid-core.mjs";

type Entry = { t: string; s: string; h: string[]; g?: string[]; d: string; c: string; u: string; o?: string; w?: number; ty?: string; pf?: string[]; };
const lang = document.documentElement.lang === "en" ? "en" : "zh";

const root = document.getElementById("search");
if (root) {
  const input = root.querySelector<HTMLInputElement>("input[name=q]")!;
  const box = root.querySelector<HTMLElement>(".tokens")!;
  const chipsEl = root.querySelector<HTMLUListElement>("#chips")!;
  const list = root.querySelector<HTMLUListElement>("#results")!;
  const status = root.querySelector<HTMLElement>("#search-status")!;
  const suggest = [...root.querySelectorAll<HTMLAnchorElement>("#tag-suggest a[data-tag]")];
  const shown = Number(root.dataset.shown) || 12;
  const known = suggest.map((a) => a.dataset.tag!);
  const msg = (k: string) => root.dataset[k] ?? "";
  let prepared: ReturnType<typeof prepare> | null = null;
  let loading: Promise<void> | null = null;
  let chips: string[] = [];
  const scopeButtons = [...root.querySelectorAll<HTMLButtonElement>("#scope button[data-scope]")];
  let scope = "all";                                       // all | posts | toys: which part of the site the results come from
  const ownerButtons = [...root.querySelectorAll<HTMLButtonElement>("#owners button[data-owner]")];   // the owners of all grid sections, always shown
  const facetBoxes = [...root.querySelectorAll<HTMLElement>("[data-facet-for]")];                      // a section's tabs and toggles (type, own, platform, status), shown in that scope only
  let owner = "";                                          // owner id chosen ("" = none); a post without that owner drops out
  let facets: Record<string, string> = {};                 // the chosen value of each facet of the scope ("" or absent = all)
  let composing = false;                                   // an IME (Chinese input) is mid-word: do not touch the text

  const load = () => (loading ??= fetch(root.dataset.index!)
    .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<Entry[]>; })
    .then((entries) => { prepared = prepare(entries); })
    .catch(() => { loading = null; status.textContent = msg("error"); }));

  const canonical = (name: string) => known.find((k) => normalize(k) === normalize(name)) ?? name;
  const currentWord = () => /\S*$/.exec(input.value)![0];
  const hasChip = (name: string) => chips.some((c) => normalize(c) === normalize(name));

  function addChip(name: string) {
    name = canonical(name.replace(/"/g, "").trim());
    if (!name || hasChip(name)) return;
    chips.push(name);
    renderChips();
  }

  function renderChips() {
    chipsEl.replaceChildren(...chips.map((name, i) => {
      const li = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = `#${name}`;
      const x = document.createElement("button");
      x.type = "button"; x.textContent = "×";
      x.setAttribute("aria-label", msg("remove").replace("{tag}", name));
      x.addEventListener("click", () => { chips.splice(i, 1); renderChips(); updateSuggest(); input.focus(); void run(); });
      li.append(label, x);
      return li;
    }));
  }

  /** Turn finished #tag words in the box into chips. `final` (Enter / submit) also takes the word still being typed. */
  function absorb(final: boolean) {
    const v = input.value;
    const out = v.replace(/#("[^"]*"|[^\s#",，、]+)([\s,，、]|$)/g, (m, name: string, tail: string, at: number) => {
      if (at > 0 && !/\s/.test(v.charAt(at - 1))) return m;     // # inside a word is just text
      if (tail === "" && !final) return m;                 // still typing it
      addChip(name);
      return "";
    });
    if (out !== v) input.value = out.replace(/\s{2,}/g, " ").replace(/^\s+/, "");
  }

  /** The tag list under the box: a few popular tags, or the ones that match what follows a # being typed. */
  function updateSuggest() {
    const w = currentWord();
    const filter = w.startsWith("#") ? normalize(w.slice(1).replace(/"/g, "")) : null;
    suggest.forEach((a, i) => {
      const name = a.dataset.tag!;
      const visible = !hasChip(name) && (filter === null ? i < shown : normalize(name).includes(filter));
      (a.parentElement as HTMLElement).hidden = !visible;
    });
  }

  function show(q: string) {
    list.replaceChildren();
    const filtered = Boolean(owner || Object.values(facets).some(Boolean));
    if (!q.trim() && !filtered) { status.textContent = ""; return; }
    if (!prepared) { status.textContent = msg("loading"); return; }
    const accept = (e: Entry) => inScope(e, scope, lang) && inFilter(e, owner, facets);
    const hits = (q.trim() ? search(prepared, q, 50, accept) : listAll(prepared, 50, accept)) as Entry[];   // a filter alone lists everything it matches, newest first
    status.textContent = hits.length ? msg("count").replace("{n}", String(hits.length)) : msg("none");
    for (const e of hits) {
      const li = document.createElement("li");
      const h = document.createElement("h3");
      const a = document.createElement("a");
      a.href = e.u; a.textContent = e.t;
      h.append(a);
      const meta = document.createElement("p");
      meta.className = "meta"; meta.textContent = `${e.d} · ${e.c}`;
      const sum = document.createElement("p");
      sum.textContent = e.s;
      li.append(h, meta, sum);
      if (e.g?.length) {
        const ul = document.createElement("ul");
        ul.className = "tags";
        for (const name of e.g) {
          const item = document.createElement("li"), link = document.createElement("a");
          link.href = tagPath(lang, name); link.textContent = name;
          // a plain click adds the tag as a chip; the link still works with middle-click / open in new tab
          link.addEventListener("click", (ev) => {
            if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
            ev.preventDefault(); addChip(name); updateSuggest(); void run();
          });
          item.append(link); ul.append(item);
        }
        li.append(ul);
      }
      list.append(li);
    }
  }

  async function run() {
    const q = buildQuery(chips, input.value);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q);
    if (scope !== "all") params.set("scope", scope);
    writeFilters(params, owner, facets);                    // ?owner=&own=&type=&platform=, the same names as the grid pages
    history.replaceState(null, "", params.size ? `?${params}` : location.pathname);
    show(q);
    if (!prepared && (q.trim() || owner || Object.values(facets).some(Boolean))) { await load(); show(buildQuery(chips, input.value)); }
  }

  function changed() { if (composing) return; absorb(false); updateSuggest(); void run(); }

  input.addEventListener("input", (e) => { if ((e as InputEvent).isComposing) return; changed(); });
  input.addEventListener("compositionstart", () => { composing = true; });
  input.addEventListener("compositionend", () => { composing = false; changed(); });
  input.addEventListener("focus", () => { void load(); }, { once: true });
  input.addEventListener("keydown", (e) => {
    if (e.isComposing) return;
    if (e.key === "Enter" && currentWord().startsWith("#")) { e.preventDefault(); absorb(true); updateSuggest(); void run(); }
    if (e.key === "Backspace" && input.value === "" && chips.length) { chips.pop(); renderChips(); updateSuggest(); void run(); }
  });
  box.addEventListener("click", (e) => { if (e.target === box || e.target === chipsEl) input.focus(); });
  for (const a of suggest) a.addEventListener("click", (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    input.value = input.value.replace(/#\S*$/, "");       // drop the half-typed #word this click completes
    addChip(a.dataset.tag!); updateSuggest(); input.focus(); void run();
  });
  root.querySelector("form")!.addEventListener("submit", (e) => { e.preventDefault(); absorb(true); updateSuggest(); void run(); });

  /** Mark the chosen buttons and show the facet tabs and toggles of the scope (none for all and posts). */
  function showFilters() {
    for (const b of ownerButtons) b.setAttribute("aria-pressed", String(b.dataset.owner === owner));
    for (const box of facetBoxes) {
      box.hidden = box.dataset.facetFor !== scope;
      for (const b of box.querySelectorAll<HTMLButtonElement>("button")) b.setAttribute("aria-pressed", String(b.dataset.value === (facets[box.dataset.facet!] ?? "")));
    }
  }
  function setScope(next: string) {
    scope = next;
    // the owner stays across scopes; a facet only means something in its section
    facets = Object.fromEntries(Object.entries(facets).filter(([id]) => facetBoxes.some((b) => b.dataset.facetFor === scope && b.dataset.facet === id)));
    for (const b of scopeButtons) b.setAttribute("aria-pressed", String(b.dataset.scope === scope));
    showFilters();
  }
  for (const b of scopeButtons) b.addEventListener("click", () => { setScope(b.dataset.scope!); void run(); });
  // the chosen chip again clears the owner
  for (const b of ownerButtons) b.addEventListener("click", () => { owner = owner === b.dataset.owner ? "" : b.dataset.owner!; showFilters(); void run(); });
  for (const b of root.querySelectorAll<HTMLButtonElement>("[data-facet-for] button")) b.addEventListener("click", () => {
    facets[(b.closest("[data-facet-for]") as HTMLElement).dataset.facet!] = b.dataset.value ?? ""; showFilters(); void run();
  });
  const wantedParams = new URLSearchParams(location.search);
  const wanted = wantedParams.get("scope");
  if (wanted && SCOPES.includes(wanted)) setScope(wanted);
  // owner and the facets are taken only when such a button exists (an id no section knows, or a facet outside its section, is ignored)
  const wantedOwner = wantedParams.get("owner");
  if (wantedOwner && ownerButtons.some((b) => b.dataset.owner === wantedOwner)) owner = wantedOwner;
  for (const box of facetBoxes.filter((b) => b.dataset.facetFor === scope)) {
    const v = wantedParams.get(box.dataset.facet!);
    if (v && [...box.querySelectorAll<HTMLButtonElement>("button")].some((b) => b.dataset.value === v)) facets[box.dataset.facet!] = v;
  }
  showFilters();

  const initial = new URLSearchParams(location.search).get("q");
  if (initial) {
    const { tags, text } = parseQuery(initial);
    tags.forEach(addChip); input.value = text;
  }
  updateSuggest();
  if (initial || owner || Object.values(facets).some(Boolean)) void run();
}
