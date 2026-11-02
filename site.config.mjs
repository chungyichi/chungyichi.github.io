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
  //   owners   who a post belongs to / is for: `owner: me` in the front matter. Each one is a filter button on the section's one page, /zh/<section>/?owner=<id> (filtered in the browser).
  //            Pages show the owner as an icon (person | block | star | tag, drawn in src/icons.tsx) in a colour (--owner-<id> in src/styles/tokens.css), never as text.
  //            `short` (optional {zh, en}): a shorter name for the small owner chips on the search page (the title is used when absent)
  //   facets   more filters that combine with the owner, in the address too (?own=no&type=comic): own | type (books), platform (games)
  //   platforms (games) the platform ids a game may list (`platform: steam, ps`), each with its shown name
  //   ownerLabel, empty, scope  the filter's name, the text of an empty grid, the search page's scope button
  sections: [
    { id: "tech", title: { zh: "技術", en: "Tech" } },
    { id: "life", title: { zh: "生活", en: "Life" } },
    { id: "toys", title: { zh: "玩具庫", en: "Toys" },   // one post per toy
      grid: { perPage: 24, ownerLabel: { zh: "擁有者", en: "Owner" }, empty: { zh: "還沒有玩具。", en: "No toys yet." }, scope: { zh: "玩具", en: "Toys" },
        owners: [
          { id: "me", title: { zh: "我", en: "Me" }, icon: "person" },
          { id: "son", title: { zh: "兒子(紀大哥)", en: "Son" }, short: { zh: "兒子", en: "Son" }, icon: "block" },
          { id: "brother", title: { zh: "弟弟", en: "Brother" }, icon: "star" },
        ] } },
    { id: "books", title: { zh: "書庫", en: "Books" },   // one post per book; `owner` is who reads it
      // authors: the one spelling of each author. A book's `author` (several: comma separated) must be a name or an alias here; an alias is
      // rewritten to the name at build and `npm run check` fails for any other author. A new author is a new entry: { name, aliases: [...] }.
      // facets: more filters next to the owners that combine with them (see FACETS in src/toys.mjs): own = ?own=no (`own: no` = only read), type = 小說 | 漫畫
      grid: { perPage: 48, facets: ["type", "own"], authors: [{ name: "R．A．薩爾瓦多", aliases: ["R.A. Salvatore", "R. A. Salvatore", "薩爾瓦多"] },
      { name: "葛雷克．凱斯", aliases: ["Greg Keyes", "Gregory Keyes", "J. Gregory Keyes", "葛雷克·凱斯", "凱斯"] },
      { name: "荒川弘", aliases: ["Hiromu Arakawa", "荒川 弘", "荒川宏"] },
      { name: "柴田啓子", aliases: ["柴田ケイコ", "Keiko Shibata", "柴田 啓子"] },
      { name: "田中光", aliases: ["田中 光"] },
      { name: "艾瑞．卡爾", aliases: ["Eric Carle", "艾瑞·卡爾", "艾瑞‧卡爾"] },
      { name: "比爾．馬丁", aliases: ["Bill Martin Jr.", "Bill Martin", "比爾·馬丁", "比爾‧馬丁"] },
      { name: "傑茲．阿波羅", aliases: ["Jez Alborough", "傑茲·阿波羅", "傑茲‧阿波羅"] },
      { name: "風車編輯部", aliases: [] },
      { name: "入山智", aliases: ["Satoshi Iriyama"] },
      { name: "全民熙", aliases: ["전민희", "Jeon Min-hee", "Jeon Minhee"] },
      { name: "史蒂芬．金", aliases: ["Stephen King", "史蒂芬·金", "史蒂芬‧金", "史蒂芬金"] },
      { name: "羅伯特．喬丹", aliases: ["Robert Jordan", "羅伯特·喬丹", "羅伯特‧喬丹", "喬丹"] },
      { name: "泰瑞．古德坎", aliases: ["Terry Goodkind", "泰瑞·古德坎", "泰瑞‧古德坎", "古德金德"] },
      { name: "米雪兒．佩弗", aliases: ["Michelle Paver", "米雪兒·佩弗", "米歇爾·佩弗", "米歇爾．佩弗"] },
      { name: "蘇珊娜．克拉克", aliases: ["Susanna Clarke", "蘇珊娜·克拉克", "蘇珊娜‧克拉克"] },
      { name: "李榮道", aliases: ["이영도", "Lee Yeongdo", "Lee Young-do", "李榮度"] },
      { name: "신노아", aliases: ["Shin Noah", "申諾亞"] },
      { name: "烽火戲諸侯", aliases: ["烽火戏诸侯"] },
      { name: "最白的烏鴉", aliases: ["最白的乌鸦"] },
      { name: "聖騎士的傳說", aliases: ["圣骑士的传说"] },
      { name: "臥牛真人", aliases: ["卧牛真人"] },
      { name: "歡顏笑語", aliases: ["欢颜笑语"] },
      { name: "隱語者", aliases: ["隐语者"] },
      { name: "三天兩覺", aliases: ["三天两觉"] }],
        ownerLabel: { zh: "誰在看", en: "Reader" }, empty: { zh: "還沒有書。", en: "No books yet." }, scope: { zh: "書", en: "Books" },
        owners: [
          { id: "me", title: { zh: "我", en: "Me" }, icon: "person" },
          { id: "son", title: { zh: "兒子", en: "Son" }, icon: "block" },
        ] } },
    { id: "games", title: { zh: "遊戲庫", en: "Games" },   // one post per game; `owner` is who plays it
      grid: { perPage: 24, facets: ["platform"], platforms: [{ id: "steam", title: "Steam" }, { id: "ns", title: "NS" }, { id: "ps", title: "PS" }, { id: "other", title: "其他" }],
        empty: { zh: "還沒有遊戲。", en: "No games yet." }, scope: { zh: "遊戲", en: "Games" } } },   // no owners: the platform is the only filter
  ],
  // Picture for sharing pages that have none of their own (a 1200x630 JPEG in public/); absent file = no default picture.
  ogImage: "/og-default.jpg",
  // Share previews of the pages people send around (see README "Share previews"). Key: home | toys | books | games | search | tags.
  //   description  { zh, en }; {n} = published posts of that section in that language (filled at build time). A page without an entry keeps its old description.
  //   image        optional "<section>/<slug>" of a published post with an og.jpg; missing post or file = the default picture (one warning in the build output)
  meta: {
    home: { description: { zh: "認識我是你一生最大的榮幸。收藏、書庫、遊戲庫，還有我們三個人的裝備欄。", en: "Chungyi Chi's site: toys, books, games and our equipment sheets." } },
    toys: { description: { zh: "我們家的玩具收藏，共 {n} 件：戰鬥陀螺、公仔、迪士尼爆米花桶。", en: "Our toy collection: {n} items, mostly Beyblade X tops, figures and Disney popcorn buckets." }, image: "toys/mayday-max" },
    books: { description: { zh: "共 {n} 本書，奇幻小說和網路小說，也有原名與作者資料。", en: "{n} books: fantasy and web novels, with original titles and authors." } },
    games: { description: { zh: "Steam、NS、PS 上的遊戲，共 {n} 款，記下已經買過的，不要重複買。", en: "Games on Steam, NS and PS: {n} so far, so we do not buy the same one twice." } },
    search: { description: { zh: "搜尋標題、摘要與標籤，也能依誰的、類型、平台篩選。", en: "Search titles, summaries and tags. Filter by owner, type or platform." } },
    tags: { description: { zh: "所有標籤，點一個看用到它的文章與收藏。", en: "All tags. Pick one to see the posts and items that use it." } },
  },
  postsPerPage: 10,
  // Posts on the home page, as "<section>/<slug>" (a post missing in a language is skipped); newest first. An empty list shows the latest few.
  featured: ["tech/site-design", "tech/technique-behind-git", "life/part-1", "life/2023-nikko-day-1-jr", "life/2019-day-1"],
  // Toys in the home page's picture carousel (between the motto and the featured posts), "toys/<slug>" in this order; unpublished ones are skipped, none hides the carousel.
  featuredToys: ["toys/mayday-max", "toys/mivi-king-of-destruction-3", "toys/soc-franky-general", "toys/mcdonalds-eva-robots"],
  // Equipment slots (裝備欄): the home page's character-sheet carousel (see README "Equipment slots").
  // <person>: { <slot>: { item: "<section>/<slug>" of a published toy or game (a book cannot be equipped), rarity: poor | common | uncommon | rare | epic | legendary (default rare) } }
  // slots: head neck shoulder back chest shirt wrist hands | waist legs feet ring1 ring2 trinket1 trinket2 emblem | mainhand offhand. An item once per person.
  // A DRAFT first pick (by loose theme), edit freely. `npm run check` fails for an unknown slot or rarity, an item that is not a published toy or game (a book is refused), or an item twice for one person.
  //
  // profile (optional, per person): level, title and mood shown under the name on the home sheet.
  //   level  a whole number >= 1;  title  "text" | { zh, en } | "ach:<achievement id>" (the title that achievement grants, shown once it is unlocked);
  //   mood   { zh, en, icon } with one simple emoji (or none)
  gear: {
    // What orbits the stick figure of the home overview (the word cloud): "items" (the equipped things, coloured by rarity; default) or "title" (title, level, mood and unlocked achievements). Not a person.
    overview: "items",
    me: {
      head: { item: "toys/mayday-max", rarity: "legendary" },           // 25th anniversary 究極合體, NT$15,525: the most expensive thing
      chest: { item: "toys/mivi-king-of-destruction-3", rarity: "epic" },  // 1/6 figure
      mainhand: { item: "games/elden-ring", rarity: "legendary" },     // the sword-and-shield game
      offhand: { item: "toys/yoyo-dragon-claw", rarity: "rare" },      // a yo-yo is a weapon too
      back: { item: "games/death-stranding", rarity: "epic" },         // carrying the cargo on the back
      ring1: { item: "games/dave-the-diver", rarity: "rare" },
      trinket1: { item: "games/microsoft-flight-simulator-2020", rarity: "rare" },
      shoulder: { item: "games/witcher-3", rarity: "legendary" },       // DRAFT: the new games, edit freely
      legs: { item: "games/the-elder-scrolls-v-skyrim-special-edition", rarity: "legendary" },
      waist: { item: "games/black-myth-wukong", rarity: "legendary" },   // the staff at the belt
      hands: { item: "games/portal-2", rarity: "epic" },               // the portal gun
      ring2: { item: "games/sid-meiers-civilization-vi", rarity: "rare" },
      wrist: { item: "games/celeste", rarity: "rare" },
      trinket2: { item: "games/slay-the-spire", rarity: "rare" },
      feet: { item: "games/euro-truck-simulator-2", rarity: "uncommon" },   // always on the road
    },
    son: {
      head: { item: "toys/playmate-air", rarity: "epic" },             // the priciest one (about NT$7,000-8,000)
      mainhand: { item: "toys/uppsta", rarity: "common" },             // a hitting toy: NT$299
      offhand: { item: "toys/anpanman-steering-wheel", rarity: "rare" },   // round, like a shield
      chest: { item: "toys/weplay-big-blocks-45", rarity: "rare" },    // the big 45-piece set
      hands: { item: "toys/fisher-price-animal-piano", rarity: "uncommon" },   // a piano played by kicking
      legs: { item: "toys/bebehaha-rocking-car", rarity: "uncommon" },
      feet: { item: "toys/buzz-lightyear-ride-on", rarity: "rare" },   // a vehicle you ride
      trinket1: { item: "toys/my-first-book-4", rarity: "rare" },      // cloth book, NT$1,856
    },
    brother: {
      head: { item: "toys/soc-franky-general", rarity: "legendary" },  // die-cast robot (超合金)
      mainhand: { item: "toys/beyx-bx-01", rarity: "epic" },           // the first blade of the line, "God Sword"
      offhand: { item: "toys/usj-minion-bottle", rarity: "rare" },     // a bottle
      neck: { item: "toys/beyx-cx-16", rarity: "epic" },               // the alternate-colour edition
      back: { item: "toys/beyx-ux-17", rarity: "rare" },               // two of them
      chest: { item: "toys/mcdonalds-eva-robots", rarity: "uncommon" },   // the transforming robots from a meal
      hands: { item: "toys/beyx-bxg-57", rarity: "epic" },             // the EVA collaboration, two of them
      trinket1: { item: "toys/usj-eva-unit01-popcorn", rarity: "epic" },   // popcorn buckets are trinkets
      trinket2: { item: "toys/tdr-monsters-inc-popcorn", rarity: "rare" },
      ring1: { item: "toys/hkdl-cookieann-train-popcorn", rarity: "uncommon" },
    },
  },
  // Achievements (成就), shown on the 閱歷 tab of the home gear block; each is judged for every person from the published posts (src/achievements.mjs).
  // { id, name, desc, title (the title it unlocks, usable as a profile title "ach:<id>"), rule }. A rule is data:
  //   kind  count (posts of a section) | volumes (volumes of books) | tag (things that carry a tag) | things (all things) | item (volumes / quantity of one post)
  //   section toys | books, tag, own "yes" | "no" (books we have / only read), owner (the person it is for; the others stay locked), item "books/slug", min (the goal)
  achievements: [
    { id: "fantasy-5", name: { zh: "奇幻讀者", en: "Fantasy Reader" }, desc: { zh: "閱讀 5 本奇幻", en: "Read 5 fantasy books" }, title: { zh: "奇幻旅人", en: "Fantasy Wanderer" }, rule: { kind: "count", section: "books", tag: "奇幻", min: 5 } },
    { id: "wheel-of-time", name: { zh: "讀完時光之輪", en: "Wheel of Time, Done" }, desc: { zh: "讀完《時光之輪》全部 21 卷", en: "Finish all 21 volumes of The Wheel of Time" }, title: { zh: "時光編織者", en: "Weaver of Time" }, rule: { kind: "item", item: "books/wheel-of-time", min: 21 } },
    { id: "web-reader", name: { zh: "網文讀者", en: "Web Novel Reader" }, desc: { zh: "讀 5 本網路小說", en: "Read 5 web novels" }, title: { zh: "網文老司機", en: "Web Novel Veteran" }, rule: { kind: "count", section: "books", own: "no", min: 5 } },
    { id: "hundred-volumes", name: { zh: "讀滿百卷", en: "A Hundred Volumes" }, desc: { zh: "共讀 100 卷", en: "Read 100 volumes in all" }, title: { zh: "百卷書蟲", en: "Bookworm" }, rule: { kind: "volumes", min: 100 } },
    { id: "collector", name: { zh: "收藏家", en: "Collector" }, desc: { zh: "擁有 50 件東西", en: "Own 50 things" }, title: { zh: "收藏大師", en: "Master Collector" }, rule: { kind: "things", min: 50 } },
    { id: "toy-trove", name: { zh: "玩具滿箱", en: "Toy Trove" }, desc: { zh: "擁有 20 款玩具", en: "Own 20 different toys" }, title: { zh: "玩具大亨", en: "Toy Tycoon" }, rule: { kind: "count", section: "toys", min: 20 } },
    { id: "bey-starter", name: { zh: "陀螺入門", en: "Top Starter" }, desc: { zh: "弟弟有 10 個戰鬥陀螺", en: "Brother has 10 battle tops" }, title: { zh: "陀螺新手", en: "Top Rookie" }, rule: { kind: "tag", tag: "戰鬥陀螺", owner: "brother", min: 10 } },
    { id: "bey-master", name: { zh: "陀螺大師", en: "Top Master" }, desc: { zh: "弟弟有 50 個戰鬥陀螺", en: "Brother has 50 battle tops" }, title: { zh: "陀螺大師", en: "Top Master" }, rule: { kind: "tag", tag: "戰鬥陀螺", owner: "brother", min: 50 } },
    { id: "anpanman-fan", name: { zh: "麵包超人迷", en: "Anpanman Fan" }, desc: { zh: "有 5 件麵包超人", en: "Have 5 Anpanman things" }, title: { zh: "麵包超人小英雄", en: "Little Anpanman Hero" }, rule: { kind: "tag", tag: "麵包超人", min: 5 } },
    { id: "baby-toys", name: { zh: "嬰幼兒玩具", en: "Baby Toys" }, desc: { zh: "有 8 件嬰幼兒玩具", en: "Have 8 baby toys" }, title: { zh: "遊戲小達人", en: "Play Expert" }, rule: { kind: "tag", tag: "嬰幼兒", min: 8 } },
    { id: "dark-tower", name: { zh: "讀完黑塔", en: "The Dark Tower, Done" }, desc: { zh: "讀完《黑塔》全部 10 本", en: "Finish all 10 books of The Dark Tower" }, title: { zh: "槍客", en: "Gunslinger" }, rule: { kind: "item", item: "books/dark-tower", min: 10 } },
    { id: "game-shelf", name: { zh: "遊戲滿架", en: "Full Game Shelf" }, desc: { zh: "遊戲庫有 50 款遊戲", en: "Have 50 games on the shelf" }, title: { zh: "遊戲收藏家", en: "Game Collector" }, rule: { kind: "count", section: "games", min: 50 } },
    { id: "game-hundred", name: { zh: "百款遊戲", en: "A Hundred Games" }, desc: { zh: "遊戲庫有 100 款遊戲", en: "Have 100 games on the shelf" }, title: { zh: "遊戲館長", en: "Game Curator" }, rule: { kind: "count", section: "games", min: 100 } },
    { id: "picture-books", name: { zh: "繪本小書迷", en: "Picture Book Fan" }, desc: { zh: "兒子有 10 本繪本", en: "Son has 10 picture books" }, title: { zh: "繪本小書迷", en: "Little Bookworm" }, rule: { kind: "count", section: "books", tag: "繪本", owner: "son", min: 10 } },
  ],
  // Seasonal decoration (see README "Seasons"). The first season whose window holds today (Asia/Taipei) wins, so the order is the priority.
  //   window  { from: "MM-DD", to: "MM-DD" } every year (from > to wraps over New Year) | { around: "cny", daysBefore, daysAfter } around a date of
  //           data/calendar.mjs LUNAR_TABLE (2026-2030; a year outside the table has no window)
  //   art     which decoration layer (src/SeasonArt.tsx): halloween | leaves | snow | lanterns | petals
  //   interaction (optional) what a touch does (src/season-client.ts): leaf-push | lights | lantern-burst
  seasons: [
    { id: "halloween", icon: "\u{1F383}", label: { zh: "萬聖節", en: "Halloween" }, window: { from: "10-15", to: "11-02" }, art: "halloween" },
    { id: "autumn", icon: "\u{1F341}", label: { zh: "落葉", en: "Autumn leaves" }, window: { from: "11-03", to: "11-30" }, art: "leaves", interaction: "leaf-push" },
    { id: "winter", icon: "\u2744\uFE0F", label: { zh: "冬季", en: "Winter" }, window: { from: "12-01", to: "12-31" }, art: "snow", interaction: "lights" },
    { id: "lunar", icon: "\u{1F3EE}", label: { zh: "春節", en: "Lunar New Year" }, window: { around: "cny", daysBefore: 14, daysAfter: 14 }, art: "lanterns", interaction: "lantern-burst" },
    { id: "spring", icon: "\u{1F338}", label: { zh: "春櫻", en: "Spring blossoms" }, window: { from: "03-10", to: "04-15" }, art: "petals" },
  ],
  homePosts: 5,
  // Google Analytics 4 Measurement ID ("G-XXXXXXXXXX", not a secret). Empty = no analytics script at all. See template.mjs.
  analytics: { gaId: "G-YP5V272CSS" },
  timezone: "Asia/Taipei", // a post dated "today" in this zone is published
};
