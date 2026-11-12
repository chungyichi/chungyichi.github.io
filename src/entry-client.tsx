import { hydrateRoot } from "react-dom/client";
import "./styles/main.css";
import { ThemeToggle } from "./ThemeToggle";
import { SeasonToggle, SEASON_ISLAND_ID } from "./SeasonToggle";
import { t, type Lang } from "./i18n";

// Everything else on the page is static HTML. Only the theme button is hydrated.
const island = document.getElementById("theme-island");
if (island) {
  const lang = (document.documentElement.lang === "en" ? "en" : "zh") as Lang;
  hydrateRoot(island, <ThemeToggle label={t[lang].toggleTheme} />);
}

// The season button renders nothing until the inline script has flagged a season window.
const seasonIsland = document.getElementById(SEASON_ISLAND_ID);
if (seasonIsland) {
  const lang = (document.documentElement.lang === "en" ? "en" : "zh") as Lang;
  hydrateRoot(seasonIsland, <SeasonToggle label={t[lang].toggleSeason} />);
}

// The home page's word cloud (sphere, cube or top): the page is static, so each cloud is hydrated here to let it move and be dragged.
const clouds = document.querySelectorAll<HTMLElement>("[data-wordcloud]");
if (clouds.length) void import("./WordCloud").then(({ WordCloud }) => clouds.forEach((host) => hydrateRoot(host, <WordCloud {...JSON.parse(host.dataset.wordcloud!)} />)));

// The search page (only) loads its own small script.
if (document.getElementById("search")) void import("./search-client");

// The picture grids and the tag page filter and page in the browser.
if (document.getElementById("browse")) void import("./browse-client");

// The home page's gear block: slots open the shared dialog, the tabs 裝備 | 閱歷 and the quest paging.
if (document.querySelector("[data-gear]")) void import("./gear-client");

// Posts get copy-link / share buttons.
if (document.querySelector("[data-share]")) void import("./share-client");

// The "my games" page: the 懷舊 / 現代 switch.
if (document.querySelector("[data-mygames]")) void import("./mygames-client");

// A toy page with several pictures gets the picture strip's buttons.
if (document.querySelector("[data-gallery]")) void import("./gallery-client");

// The main menu scrolls sideways when it is too wide: bring the current page's item to the middle (only the menu moves, never the page), and let the
// mouse wheel and a mouse drag move it too (touch scrolls by itself).
const menu = document.querySelector<HTMLElement>(".main-nav"), here = menu?.querySelector<HTMLElement>("[aria-current]");
if (menu && here) menu.scrollLeft = here.offsetLeft - (menu.clientWidth - here.offsetWidth) / 2;
if (menu) {
  menu.addEventListener("wheel", (e) => {
    if (menu.scrollWidth <= menu.clientWidth || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    const before = menu.scrollLeft;
    menu.scrollLeft += e.deltaY;
    if (menu.scrollLeft !== before) e.preventDefault();   // at either end the page scrolls as usual
  }, { passive: false });
  let from = 0, start = 0, moved = false, down = false;
  menu.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse" || e.button !== 0) return; down = true; moved = false; from = e.clientX; start = menu.scrollLeft; });
  window.addEventListener("pointermove", (e) => {
    if (!down) return;
    if (!moved && Math.abs(e.clientX - from) > 4) { moved = true; menu.classList.add("dragging"); }
    if (moved) menu.scrollLeft = start - (e.clientX - from);
  });
  window.addEventListener("pointerup", () => { down = false; menu.classList.remove("dragging"); });
  menu.addEventListener("click", (e) => { if (moved) { e.preventDefault(); moved = false; } }, true);   // a drag is not a click on a link
  menu.addEventListener("dragstart", (e) => e.preventDefault());   // links are draggable by default and would take the drag
}
