// Everything that is "the site" rather than "a post". Plain JS so build scripts and React share it.
export const site = {
  title: { zh: "Chungyi Chi", en: "Chungyi Chi" },
  tagline: { zh: "系統、驗證與開源", en: "Systems, verification and open source" },
  author: "Chungyi Chi",
  baseUrl: "https://chungyichi.github.io",
  github: "https://github.com/chungyichi",
  langs: ["zh", "en"],
  defaultLang: "zh",
  // Posts live in content/<section>/ ; content/_private/<section>/ is git-ignored and only shown by `npm run dev`.
  sections: [
    { id: "tech", title: { zh: "技術", en: "Tech" } },
    { id: "travel", title: { zh: "旅行", en: "Travel" } },
  ],
  postsPerPage: 10,
  homePosts: 5,
  timezone: "Asia/Taipei", // a post dated "today" in this zone is published
};
