import { site } from "../site.config.mjs";

export type Lang = "zh" | "en";

export const t = {
  zh: {
    home: "首頁", about: "關於", github: "GitHub", latest: "最新文章", featured: "精選文章", all: "全部文章", allInSection: "更多",
    readMore: "閱讀全文 →", prev: "← 較新", next: "較舊 →", page: (n: number, m: number) => `第 ${n} / ${m} 頁`,
    updated: "更新於", noPosts: "還沒有文章。", words: (n: number) => `${n} 字`,
    noTranslation: "這篇文章尚無中文版本。", otherLang: "English", toggleTheme: "切換深淺色", toggleSeason: "開關萬聖節裝飾", redirecting: "正在前往中文版…",
    notFound: "找不到這一頁", backHome: "回首頁", draft: "草稿（尚未發佈）", privateNote: "私有（不會發佈）", skip: "跳到內容", langName: "中文",
    rights: "文章內容",
    tags: "標籤", tagged: (t: string) => `標籤：${t}`, postCount: (n: number) => `${n} 篇`, noTags: "還沒有標籤。",
    copyLink: "複製連結", copied: "已複製 ✓", copyFailed: "複製失敗，請手動複製網址", share: "分享",
    search: "搜尋", searchHint: "搜尋標題、摘要、小標題與標籤。輸入 #標籤 再按空白鍵，會變成標籤晶片，可以組合篩選", searchPlaceholder: "搜尋，或輸入 #標籤", removeTag: "移除標籤 {tag}", tagSearch: "在搜尋中組合標籤 →", tagsMoved: "標籤已整合到搜尋頁。", searchNoJs: "搜尋需要 JavaScript。沒有的話，請從上方的分類瀏覽。",
    searchLoading: "載入中…", searchNone: "沒有符合的文章。", searchCount: "找到 {n} 篇", searchError: "搜尋索引載入失敗，請重新整理。",
  },
  en: {
    home: "Home", about: "About", github: "GitHub", latest: "Latest posts", featured: "Featured", all: "All posts", allInSection: "More",
    readMore: "Read more →", prev: "← Newer", next: "Older →", page: (n: number, m: number) => `Page ${n} of ${m}`,
    updated: "Updated", noPosts: "No posts yet.", words: (n: number) => `${n} words`,
    noTranslation: "This post has no English version yet.", otherLang: "中文", toggleTheme: "Toggle light/dark", toggleSeason: "Turn Halloween decoration on/off", redirecting: "Redirecting to the English site…",
    notFound: "Page not found", backHome: "Back to the home page", draft: "Draft (not published)", privateNote: "Private (will not be published)", skip: "Skip to content", langName: "English",
    rights: "Posts",
    tags: "Tags", tagged: (t: string) => `Tag: ${t}`, postCount: (n: number) => `${n} ${n === 1 ? "post" : "posts"}`, noTags: "No tags yet.",
    copyLink: "Copy link", copied: "Copied ✓", copyFailed: "Could not copy; copy the address by hand", share: "Share",
    search: "Search", searchHint: "Search titles, summaries, headings and tags. Type #tag and a space to turn it into a tag chip; chips combine", searchPlaceholder: "Search, or type #tag", removeTag: "Remove tag {tag}", tagSearch: "Combine tags in search →", tagsMoved: "Tags now live on the search page.", searchNoJs: "Search needs JavaScript. Without it, browse by section above.",
    searchLoading: "Loading…", searchNone: "No matching posts.", searchCount: "{n} found", searchError: "The search index failed to load; reload the page.",
  },
} as const;

export const sectionTitle = (lang: Lang, id: string) => site.sections.find((s: { id: string }) => s.id === id)?.title[lang] ?? id;
export const title = (lang: Lang) => site.title[lang];
export const tagline = (lang: Lang) => site.tagline[lang];
