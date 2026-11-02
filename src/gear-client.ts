// The home page's gear block (only pages with [data-gear] load this), three small jobs on clicks that bubble up to the document:
// 1. a slot button opens THE dialog (#gear-dialog, a native <dialog>): filled from the button's data-item, opened with showModal(), so Esc, the focus trap and the
//    return of the focus to the slot are the browser's; a click on the backdrop or on × closes it. A word of the overview (a link to the item, data-ref = the slot id)
//    opens the dialog of that slot's button, so the item data exists once; a drag of the cloud never reaches here (the cloud swallows its click).
// 2. the tabs 裝備 | 閱歷 show one panel in every sheet (the bar is hidden in the HTML and shown here: without this script only 裝備 exists).
// 3. the switch 總覽 | 格子 shows one view of the tab 裝備 in every sheet (the same: without this script only the overview exists).

export {};   // a module (the entry loads it with import())

type Item = { title: string; rarity: string; rarityName: string; slotName: string; summary: string; tags: string[]; date: string; pic: string; href: string };

const dialog = document.getElementById("gear-dialog") as HTMLDialogElement | null;
const field = (name: string) => dialog!.querySelector<HTMLElement>(`[data-f="${name}"]`)!;

function fill(item: Item) {
  dialog!.className = `gear-dialog rarity-${item.rarity}`;
  field("title").textContent = item.title;
  field("rarity").textContent = item.rarityName;
  field("slot").textContent = item.slotName;
  field("summary").textContent = item.summary;
  field("summary").hidden = !item.summary;
  field("tags").replaceChildren(...item.tags.map((x) => Object.assign(document.createElement("li"), { textContent: x })));
  field("date").textContent = item.date;
  field("date").hidden = !item.date;
  const pic = field("pic") as HTMLImageElement;
  field("picbox").hidden = !item.pic;
  pic.src = item.pic;
  const link = field("link") as HTMLAnchorElement;
  link.href = item.href;
  link.textContent = dialog!.dataset.open ?? "";
}

function openSlot(button: HTMLElement) {
  if (!dialog || typeof dialog.showModal !== "function") return;
  try { fill(JSON.parse(button.dataset.item ?? "")); } catch { return; }
  dialog.scrollTop = 0;
  dialog.showModal();
}

function showTab(block: HTMLElement, tab: string) {
  block.querySelectorAll<HTMLElement>("[data-tab]").forEach((b) => { const on = b.dataset.tab === tab; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; });
  block.querySelectorAll<HTMLElement>("[data-panel]").forEach((p) => { p.hidden = p.dataset.panel !== tab; });
  block.querySelectorAll<HTMLElement>("[data-gear-only]").forEach((h) => { h.hidden = tab !== "gear"; });
}

function showView(block: HTMLElement, view: string) {
  block.querySelectorAll<HTMLElement>("[data-view-btn]").forEach((b) => { b.setAttribute("aria-pressed", String(b.dataset.viewBtn === view)); });
  block.querySelectorAll<HTMLElement>("[data-view]").forEach((v) => { v.hidden = v.dataset.view !== view; });
}


document.addEventListener("click", (e) => {
  const target = e.target instanceof Element ? e.target : null;
  if (!target) return;
  if (dialog?.open) {
    if (target === dialog || target.closest("[data-close]")) dialog.close();   // the backdrop belongs to the dialog element itself
    return;
  }
  const slot = target.closest<HTMLElement>("button[data-slot]");
  if (slot) { openSlot(slot); return; }
  const word = target.closest<HTMLElement>("a[data-ref]");
  if (word && !(e.ctrlKey || e.metaKey || e.shiftKey || e.altKey)) {
    const button = word.closest(".gear-sheet")?.querySelector<HTMLElement>(`button[data-slot-id="${word.dataset.ref}"]`);
    if (button && dialog && typeof dialog.showModal === "function") { e.preventDefault(); openSlot(button); return; }   // no dialog support or no button: the link to the item page works as it is
  }
  const view = target.closest<HTMLElement>("button[data-view-btn]");
  if (view) { showView(view.closest<HTMLElement>("[data-gear]")!, view.dataset.viewBtn!); return; }
  const tab = target.closest<HTMLElement>("button[data-tab]");
  if (tab) { showTab(tab.closest<HTMLElement>("[data-gear]")!, tab.dataset.tab!); return; }
});

// Arrow keys move between the two tabs
document.addEventListener("keydown", (e) => {
  const tab = e.target instanceof Element ? e.target.closest<HTMLElement>("button[data-tab]") : null;
  if (!tab || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
  e.preventDefault();
  const tabs = [...tab.parentElement!.querySelectorAll<HTMLElement>("button[data-tab]")], next = tabs[(tabs.indexOf(tab) + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
  if (!next) return;
  next.focus();
  showTab(tab.closest<HTMLElement>("[data-gear]")!, next.dataset.tab!);
});

// the tab bar and the view switch need the script, so they appear only now
document.querySelectorAll<HTMLElement>("[data-gear] .gear-tabs, [data-gear] .gear-views").forEach((bar) => { bar.hidden = false; });
