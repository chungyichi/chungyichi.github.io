// Search page behaviour. Loaded only on the search page. Results are built with textContent, never innerHTML,
// so nothing in the index can inject markup.
// Typing #tag and a space (or Enter) turns the word into a tag chip; chips and free text combine into one query.
import { prepare, search, normalize, parseQuery, buildQuery } from "./search-core.mjs";
import { tagSlug, tagPath } from "./tags.mjs";

type Entry = { t: string; s: string; h: string[]; g?: string[]; d: string; c: string; u: string };
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
    if (!q.trim()) { status.textContent = ""; return; }
    if (!prepared) { status.textContent = msg("loading"); return; }
    const hits = search(prepared, q) as Entry[];
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
          link.href = tagPath(lang, tagSlug(name)); link.textContent = name;
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
    history.replaceState(null, "", q.trim() ? `?q=${encodeURIComponent(q)}` : location.pathname);
    show(q);
    if (!prepared && q.trim()) { await load(); show(buildQuery(chips, input.value)); }
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

  const initial = new URLSearchParams(location.search).get("q");
  if (initial) {
    const { tags, text } = parseQuery(initial);
    tags.forEach(addChip); input.value = text;
  }
  updateSuggest();
  if (initial) void run();
}
