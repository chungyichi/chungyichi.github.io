// "My games": the page of the games I make myself (site.config.mjs myGames). Shared by the build (scripts/routes.mjs), the page (src/App.tsx) and its toggle. Pure.

/** The page's address in a language: /zh/my-games/. */
export const myGamesPath = (lang, config) => `/${lang}/${config.slug}/`;

/** localStorage key of the 懷舊 / 現代 choice, and the class that turns the retro look on (all retro CSS sits under it, src/styles/mygames.css). */
export const LOOK_KEY = "mygames-look";
export const RETRO_CLASS = "mygames-retro";

/** Runs inline right after the page's container opens, so a saved retro look is there before the first paint (the container's id is "mygames").
    Anything but "retro" (nothing saved, or storage that throws in private mode) keeps the modern default. */
export const LOOK_INIT = `try{if(localStorage.getItem("${LOOK_KEY}")==="retro")document.getElementById("mygames").classList.add("${RETRO_CLASS}")}catch(e){}`;

const pick = (value, lang) => (typeof value === "string" ? value : value?.[lang] ?? "");

/**
 * The page in one language, or null when the config has no title in it (then: no page, no menu item, and the home card keeps no target page).
 * A game with `use: "island"` takes its title, kicker, blurb and picture from site.island; its own fields win when given.
 */
export function resolveMyGames(site, lang) {
  const config = site.myGames;
  const name = pick(config?.title, lang);
  if (!config?.slug || !name) return null;
  const island = site.island ?? {};
  const games = (config.games ?? []).map((game) => {
    const base = game.use === "island" ? island : {};
    const text = (key) => pick(game[key], lang) || pick(base[key], lang);
    return {
      id: game.id,
      title: text("title"),
      kicker: text("kicker"),
      blurb: text("blurb"),
      picture: text("picture"),
      platform: text("platform"),
      status: text("status"),
      news: text("news"),
      cta: text("cta"),
      updated: game.updated ?? "",
      href: game.href ?? "",
    };
  });
  // The 最新更新 list: one line per game, newest first.
  const news = games
    .filter((game) => game.updated && game.news)
    .map((game) => ({ id: game.id, date: game.updated, text: game.news }))
    .sort((a, b) => b.date.localeCompare(a.date));
  return { path: myGamesPath(lang, config), title: name, intro: pick(config.intro, lang), games, news };
}
