import { hydrateRoot } from "react-dom/client";
import "./styles/main.css";
import { ThemeToggle } from "./ThemeToggle";
import { t, type Lang } from "./i18n";

// Everything else on the page is static HTML. Only the theme button is hydrated.
const island = document.getElementById("theme-island");
if (island) {
  const lang = (document.documentElement.lang === "en" ? "en" : "zh") as Lang;
  hydrateRoot(island, <ThemeToggle label={t[lang].toggleTheme} />);
}

// The search page (only) loads its own small script.
if (document.getElementById("search")) void import("./search-client");
