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
    { id: "toys", title: { zh: "玩具庫", en: "Toys" } },   // one post per toy, shown as a picture grid (see README "Toys")
  ],
  // Who a toy belongs to: `owner: me` in a toys post. Each one gets a filter page, /zh/toys/owner/<id>/.
  toyOwners: [
    { id: "me", title: { zh: "我", en: "Me" } },
    { id: "son", title: { zh: "兒子", en: "Son" } },
  ],
  // Picture for sharing pages that have none of their own (a 1200x630 JPEG in public/); absent file = no default picture.
  ogImage: "/og-default.jpg",
  postsPerPage: 10,
  toysPerPage: 24,       // the toy grid shows more per page than a text list
  // Posts on the home page, as "<section>/<slug>" (a post missing in a language is skipped); newest first. An empty list shows the latest few.
  featured: ["tech/site-design", "tech/technique-behind-git", "life/part-1", "life/2023-nikko-day-1-jr", "life/2019-day-1"],
  homePosts: 5,
  timezone: "Asia/Taipei", // a post dated "today" in this zone is published
};
