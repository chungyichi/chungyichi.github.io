import { site } from "../site.config.mjs";

export type Lang = "zh" | "en";

export const t = {
  zh: {
    home: "首頁", about: "關於", github: "GitHub", featured: "精選文章", all: "全部文章",
    prev: "← 較新", next: "較舊 →", page: (n: number, m: number) => `第 ${n} / ${m} 頁`,
    updated: "更新於", noPosts: "還沒有文章。", words: (n: number) => `${n} 字`,
    noTranslation: "這篇文章尚無中文版本。", toggleTheme: "切換深淺色", toggleSeason: "開關{name}裝飾",
    notFound: "找不到這一頁", backHome: "回首頁", draft: "草稿（尚未發佈）", privateNote: "私有（不會發佈）", skip: "跳到內容", langName: "中文",
    tags: "標籤", tagged: (t: string) => `標籤：${t}`, postCount: (n: number) => `${n} 篇`, noTags: "還沒有標籤。",
    copyLink: "複製連結", copied: "已複製 ✓", copyFailed: "複製失敗，請手動複製網址", share: "分享",
    search: "搜尋", searchHint: "搜尋標題、摘要、小標題與標籤。輸入 #標籤 再按空白鍵，會變成標籤晶片，可以組合篩選", searchPlaceholder: "搜尋，或輸入 #標籤", removeTag: "移除標籤 {tag}", searchNoJs: "搜尋需要 JavaScript。沒有的話，請從上方的分類瀏覽。",
    searchLoading: "載入中…", searchNone: "沒有符合的文章。", searchCount: "找到 {n} 篇", searchError: "搜尋索引載入失敗，請重新整理。",
    ownerAll: "全部", scope: "範圍", scopePosts: "文章", statusWant: "想要", ownerLabel: "誰的", typeLabel: "類型", platformLabel: "平台", developer: "開發商", typeNovel: "小說", typeComic: "漫畫", ownAll: "全部", ownYes: "實體", ownNo: "只看過", ownLabel: "有沒有實體書", ownNoLabel: "無實體書",
    price: "價格", added: "加入", viewShop: "前往購買", author: "作者", bookSource: "來源", readHere: "去哪裡看", volumesCount: (n: number) => `共 ${n} 冊`,
    pictures: "圖片", prevPicture: "上一張", nextPicture: "下一張", pictureN: (n: number) => `第 ${n} 張`,
    quantity: "數量", filterNoJs: "篩選與換頁需要 JavaScript；沒有的話，這裡只顯示第一頁。", featuredToys: "精選玩具", allToys: "看全部玩具 →",
    gearPrev: "上一位", gearNext: "下一位",
    gearTitle: "我們的裝備", gearHint: "點一個裝備看說明", gearViews: "總覽或格子", gearViewOverview: "總覽", gearViewSlots: "格子", gearNone: "還沒有裝備", gearNoTitle: "還沒有稱號", gearOverview: (who: string) => `${who}的裝備總覽`, gearWord: (full: string, rarity: string) => `${full}（${rarity}）`, gearOpenItem: "看物品 →", gearClose: "關閉", gearTabs: "裝備或閱歷", gearTabGear: "裝備", gearTabLog: "閱歷", gearLevel: (n: number) => `Lv.${n}`,
    gearFilled: (n: number, m: number) => `已裝備 ${n} / ${m}`, gearSheet: (who: string) => `${who}的裝備欄`, gearSlotEmpty: (slot: string) => `${slot}：空`, gearSlotLabel: (slot: string, name: string, rarity: string) => `${slot}：${name}（${rarity}）`,
    questDone: "已完成", questNone: "還沒有任務", questVolumes: (n: number) => `${n} 卷`, questPage: "第 {p} / {n} 頁", questPrev: "上一頁", questNext: "下一頁", questPager: "任務換頁", questList: "任務",
    achTitle: "成就", achUnlocked: "已解鎖", achLocked: "未解鎖", achGrants: (title: string) => `稱號「${title}」`,
  },
  en: {
    home: "Home", about: "About", github: "GitHub", featured: "Featured", all: "All posts",
    prev: "← Newer", next: "Older →", page: (n: number, m: number) => `Page ${n} of ${m}`,
    updated: "Updated", noPosts: "No posts yet.", words: (n: number) => `${n} words`,
    noTranslation: "This post has no English version yet.", toggleTheme: "Toggle light/dark", toggleSeason: "Turn the {name} decoration on/off",
    notFound: "Page not found", backHome: "Back to the home page", draft: "Draft (not published)", privateNote: "Private (will not be published)", skip: "Skip to content", langName: "English",
    tags: "Tags", tagged: (t: string) => `Tag: ${t}`, postCount: (n: number) => `${n} ${n === 1 ? "post" : "posts"}`, noTags: "No tags yet.",
    copyLink: "Copy link", copied: "Copied ✓", copyFailed: "Could not copy; copy the address by hand", share: "Share",
    search: "Search", searchHint: "Search titles, summaries, headings and tags. Type #tag and a space to turn it into a tag chip; chips combine", searchPlaceholder: "Search, or type #tag", removeTag: "Remove tag {tag}", searchNoJs: "Search needs JavaScript. Without it, browse by section above.",
    searchLoading: "Loading…", searchNone: "No matching posts.", searchCount: "{n} found", searchError: "The search index failed to load; reload the page.",
    ownerAll: "All", scope: "Scope", scopePosts: "Posts", statusWant: "Wish list", ownerLabel: "Whose", typeLabel: "Type", platformLabel: "Platform", developer: "Developer", typeNovel: "Novel", typeComic: "Comic", ownAll: "All", ownYes: "Owned", ownNo: "Read only", ownLabel: "Physical copy", ownNoLabel: "No physical copy",
    price: "Price", added: "Added", viewShop: "Shop", author: "Author", bookSource: "Source", readHere: "Read it here", volumesCount: (n: number) => `${n} ${n === 1 ? "volume" : "volumes"}`,
    pictures: "Pictures", prevPicture: "Previous picture", nextPicture: "Next picture", pictureN: (n: number) => `Picture ${n}`,
    quantity: "Quantity", filterNoJs: "Filters and paging need JavaScript; without it this shows the first page only.", featuredToys: "Featured toys", allToys: "All toys →",
    gearPrev: "Previous person", gearNext: "Next person",
    gearTitle: "Our gear", gearHint: "Tap an item for details", gearViews: "Overview or slots", gearViewOverview: "Overview", gearViewSlots: "Slots", gearNone: "Nothing equipped yet", gearNoTitle: "No title yet", gearOverview: (who: string) => `Gear overview of ${who}`, gearWord: (full: string, rarity: string) => `${full} (${rarity})`, gearOpenItem: "Open the item →", gearClose: "Close", gearTabs: "Equipment or log", gearTabGear: "Gear", gearTabLog: "Log", gearLevel: (n: number) => `Lv.${n}`,
    gearFilled: (n: number, m: number) => `${n} / ${m} equipped`, gearSheet: (who: string) => `Equipment of ${who}`, gearSlotEmpty: (slot: string) => `${slot}: empty`, gearSlotLabel: (slot: string, name: string, rarity: string) => `${slot}: ${name} (${rarity})`,
    questDone: "Done", questNone: "No quests yet", questVolumes: (n: number) => `${n} vol.`, questPage: "Page {p} / {n}", questPrev: "Previous page", questNext: "Next page", questPager: "Quest pages", questList: "Quests",
    achTitle: "Achievements", achUnlocked: "Unlocked", achLocked: "Locked", achGrants: (title: string) => `Title: ${title}`,
  },
} as const;

export const sectionTitle = (lang: Lang, id: string) => site.sections.find((s: { id: string }) => s.id === id)?.title[lang] ?? id;
type Owner = { id: string; title: Record<Lang, string>; short?: Record<Lang, string>; icon?: string };
type Grid = { perPage: number; facets?: string[]; platforms?: { id: string; title: string }[]; owners?: Owner[]; ownerLabel?: Record<Lang, string>; empty: Record<Lang, string>; scope: Record<Lang, string> };
/** The grid settings of a section (site.config.mjs sections[].grid), or undefined for a text section. */
export const gridOf = (id: string): Grid | undefined => site.sections.find((s: { id: string }) => s.id === id)?.grid;
/** The owners of a grid section, or (no section given) of every grid; the first with that id wins. */
const ownersOf = (section?: string): Owner[] => (section ? gridOf(section)?.owners ?? [] : site.sections.flatMap((s: { grid?: Grid }) => s.grid?.owners ?? []));
/** The label of an owner id in a section (site.config.mjs grid.owners); an unknown id is shown as is. */
export const ownerTitle = (lang: Lang, id: string, section?: string) => (ownersOf(section).find((o) => o.id === id) ?? ownersOf().find((o) => o.id === id))?.title[lang] ?? id;
/** The short name of an owner (search chips); the title when the owner has no `short`. */
export const ownerShort = (lang: Lang, id: string, section?: string) => (ownersOf(section).find((o) => o.id === id) ?? ownersOf().find((o) => o.id === id))?.short?.[lang] ?? ownerTitle(lang, id, section);
/** The icon name of an owner id (a tag when the id or its icon is unknown). */
export const ownerIconName = (id: string): string | undefined => ownersOf().find((o) => o.id === id)?.icon;
export const title = (lang: Lang) => site.title[lang];
export const tagline = (lang: Lang) => site.tagline[lang];

/** The text of a filter value (a facet of a grid, see FACETS in toys.mjs): "yes" of own, "comic" of type, "ps" of platform. */
export const facetValueLabel = (lang: Lang, facet: string, value: string, section?: string): string => {
  const s = t[lang];
  if (facet === "platform") return gridOf(section ?? "games")?.platforms?.find((p) => p.id === value)?.title ?? value;
  const names: Record<string, string> = { yes: s.ownYes, no: s.ownNo, novel: s.typeNovel, comic: s.typeComic };
  return names[value] ?? value;
};
/** The name of a facet (the aria-label of its tabs or toggle). */
export const facetLabel = (lang: Lang, facet: string): string => ({ own: t[lang].ownLabel, type: t[lang].typeLabel, platform: t[lang].platformLabel } as Record<string, string>)[facet] ?? facet;
