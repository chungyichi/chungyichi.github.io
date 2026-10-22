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

// The Halloween toggle renders nothing until the inline script has flagged the season window.
const seasonIsland = document.getElementById(SEASON_ISLAND_ID);
if (seasonIsland) {
  const lang = (document.documentElement.lang === "en" ? "en" : "zh") as Lang;
  hydrateRoot(seasonIsland, <SeasonToggle label={t[lang].toggleSeason} />);
}

// The search page (only) loads its own small script.
if (document.getElementById("search")) void import("./search-client");

// Posts get copy-link / share buttons.
if (document.querySelector("[data-share]")) void import("./share-client");
