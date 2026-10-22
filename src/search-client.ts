// Search page behaviour. Loaded only on the search page. Results are built with textContent, never innerHTML,
// so nothing in the index can inject markup.
import { prepare, search } from "./search-core.mjs";
import { tagSlug, tagPath } from "./tags.mjs";

type Entry = { t: string; s: string; h: string[]; g?: string[]; d: string; c: string; u: string };
const lang = document.documentElement.lang === "en" ? "en" : "zh";

const root = document.getElementById("search");
if (root) {
  const input = root.querySelector<HTMLInputElement>("input[name=q]")!;
  const list = root.querySelector<HTMLUListElement>("#results")!;
  const status = root.querySelector<HTMLElement>("#search-status")!;
  const msg = (k: string) => root.dataset[k] ?? "";
  let prepared: ReturnType<typeof prepare> | null = null;
  let loading: Promise<void> | null = null;

  const load = () => (loading ??= fetch(root.dataset.index!)
    .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<Entry[]>; })
    .then((entries) => { prepared = prepare(entries); })
    .catch(() => { loading = null; status.textContent = msg("error"); }));

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
          item.append(link); ul.append(item);
        }
        li.append(ul);
      }
      list.append(li);
    }
  }

  async function run() {
    const q = input.value;
    history.replaceState(null, "", q.trim() ? `?q=${encodeURIComponent(q)}` : location.pathname);
    show(q);
    if (!prepared && q.trim()) { await load(); show(input.value); }
  }

  input.addEventListener("input", run);
  input.addEventListener("focus", () => { void load(); }, { once: true });
  root.querySelector("form")!.addEventListener("submit", (e) => { e.preventDefault(); void run(); });
  const initial = new URLSearchParams(location.search).get("q");
  if (initial) { input.value = initial; void run(); }
}
