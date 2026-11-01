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
  // A section with `grid` is a picture grid instead of a text list (the toy library, the books; see README "Toys" and "Books"):
  //   perPage  cards per page (a grid shows more than a text list)
  //   owners   who a post belongs to / is for: `owner: me` in the front matter. Each one gets a filter page, /zh/<section>/owner/<id>/.
  //            Pages show the owner as an icon (person | block | star | tag, drawn in src/icons.tsx) in a colour (--owner-<id> in src/styles/tokens.css), never as text.
  //   ownerLabel, empty, scope  the filter's name, the text of an empty grid, the search page's scope button
  sections: [
    { id: "tech", title: { zh: "技術", en: "Tech" } },
    { id: "life", title: { zh: "生活", en: "Life" } },
    { id: "toys", title: { zh: "玩具庫", en: "Toys" },   // one post per toy
      grid: { perPage: 24, ownerLabel: { zh: "擁有者", en: "Owner" }, empty: { zh: "還沒有玩具。", en: "No toys yet." }, scope: { zh: "玩具", en: "Toys" },
        owners: [
          { id: "me", title: { zh: "我", en: "Me" }, icon: "person" },
          { id: "son", title: { zh: "兒子(紀大哥)", en: "Son" }, icon: "block" },
          { id: "brother", title: { zh: "弟弟", en: "Brother" }, icon: "star" },
        ] } },
    { id: "books", title: { zh: "書庫", en: "Books" },   // one post per book; `owner` is who reads it
      // authors: the one spelling of each author. A book's `author` (several: comma separated) must be a name or an alias here; an alias is
      // rewritten to the name at build and `npm run check` fails for any other author. A new author is a new entry: { name, aliases: [...] }.
      grid: { perPage: 48, authors: [{ name: "R．A．薩爾瓦多", aliases: ["R.A. Salvatore", "R. A. Salvatore", "薩爾瓦多"] }],
        ownerLabel: { zh: "誰在看", en: "Reader" }, empty: { zh: "還沒有書。", en: "No books yet." }, scope: { zh: "書", en: "Books" },
        owners: [
          { id: "me", title: { zh: "我", en: "Me" }, icon: "person" },
          { id: "son", title: { zh: "兒子", en: "Son" }, icon: "block" },
        ] } },
  ],
  // Picture for sharing pages that have none of their own (a 1200x630 JPEG in public/); absent file = no default picture.
  ogImage: "/og-default.jpg",
  postsPerPage: 10,
  // Posts on the home page, as "<section>/<slug>" (a post missing in a language is skipped); newest first. An empty list shows the latest few.
  featured: ["tech/site-design", "tech/technique-behind-git", "life/part-1", "life/2023-nikko-day-1-jr", "life/2019-day-1"],
  // Toys in the home page's picture carousel (between the motto and the featured posts), "toys/<slug>" in this order; unpublished ones are skipped, none hides the carousel.
  featuredToys: ["toys/mayday-max", "toys/mivi-king-of-destruction-3"],
  homePosts: 5,
  // Google Analytics 4 Measurement ID ("G-XXXXXXXXXX", not a secret). Empty = no analytics script at all. See template.mjs.
  analytics: { gaId: "G-YP5V272CSS" },
  timezone: "Asia/Taipei", // a post dated "today" in this zone is published
};
