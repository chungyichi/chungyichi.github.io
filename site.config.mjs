// Everything that is "the site" rather than "a post". Plain JS so build scripts and React share it.
export const site = {
  title: { zh: "Chungyi Chi", en: "Chungyi Chi" },
  tagline: { zh: "認識我是你一生最大的榮幸", en: "Systems, verification and open source" },
  author: "Chungyi Chi",
  baseUrl: "https://chungyichi.github.io",
  github: "https://github.com/chungyichi",
  langs: ["zh", "en"],
  defaultLang: "zh",
  // false hides the language switcher (the English pages still build and work at /en/, i18n stays); "/" then always opens defaultLang.
  languageSwitcher: false,
  // Posts live in content/<section>/ ; content/_private/<section>/ is git-ignored and only shown by `npm run dev`.
  sections: [
    { id: "tech", title: { zh: "技術", en: "Tech" } },
    { id: "life", title: { zh: "生活", en: "Life" } },
  ],
  // Picture for sharing pages that have none of their own (a 1200x630 JPEG in public/); absent file = no default picture.
  ogImage: "/og-default.jpg",
  postsPerPage: 10,
  homePosts: 5,
  timezone: "Asia/Taipei", // a post dated "today" in this zone is published
};
