// Copy-link and native share buttons on a post. Runs only on pages that have [data-share].
const box = document.querySelector<HTMLElement>("[data-share]");
if (box) {
  const copy = box.querySelector<HTMLButtonElement>("[data-copy]")!;
  const native = box.querySelector<HTMLButtonElement>("[data-native]")!;
  // The canonical address (not the dev server's or a ?q= variant).
  const url = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href || location.href.split("#")[0]!;
  const title = box.dataset.title || document.title;
  const label = copy.textContent;
  let timer: number | undefined;

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement("textarea");                      // older browsers, or no permission for the clipboard API
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.append(ta); ta.select();
      try { return document.execCommand("copy"); } finally { ta.remove(); }
    }
  }

  copy.addEventListener("click", async () => {
    const ok = await copyText(url);
    copy.textContent = ok ? (box.dataset.copied ?? "✓") : (box.dataset.failed ?? "!");
    window.clearTimeout(timer);
    timer = window.setTimeout(() => { copy.textContent = label; }, 2000);
  });

  if (typeof navigator.share === "function") {
    native.hidden = false;
    native.addEventListener("click", () => { void navigator.share({ title, url }).catch(() => {}); });
  }
  box.hidden = false;
}
export {};
