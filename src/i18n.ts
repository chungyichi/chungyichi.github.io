import { site } from "../site.config.mjs";

export type Lang = "zh" | "en";

export const t = {
  zh: {
    home: "首頁", about: "關於", feed: "Atom", github: "GitHub", latest: "最新文章", all: "全部文章", allInSection: "更多",
    readMore: "閱讀全文 →", prev: "← 較新", next: "較舊 →", page: (n: number, m: number) => `第 ${n} / ${m} 頁`,
    updated: "更新於", noPosts: "還沒有文章。", words: (n: number) => `${n} 字`,
    noTranslation: "這篇文章尚無中文版本。", otherLang: "English", toggleTheme: "切換深淺色", redirecting: "正在前往中文版…",
    notFound: "找不到這一頁", backHome: "回首頁", draft: "草稿（尚未發佈）", privateNote: "私有（不會發佈）", skip: "跳到內容", langName: "中文",
    rights: "文章內容", built: "靜態網站，無追蹤。",
    search: "搜尋", searchHint: "搜尋標題、摘要與小標題", searchNoJs: "搜尋需要 JavaScript。沒有的話，請從上方的分類瀏覽，或訂閱 Atom。",
    searchLoading: "載入中…", searchNone: "沒有符合的文章。", searchCount: "找到 {n} 篇", searchError: "搜尋索引載入失敗，請重新整理。",
  },
  en: {
    home: "Home", about: "About", feed: "Atom", github: "GitHub", latest: "Latest posts", all: "All posts", allInSection: "More",
    readMore: "Read more →", prev: "← Newer", next: "Older →", page: (n: number, m: number) => `Page ${n} of ${m}`,
    updated: "Updated", noPosts: "No posts yet.", words: (n: number) => `${n} words`,
    noTranslation: "This post has no English version yet.", otherLang: "中文", toggleTheme: "Toggle light/dark", redirecting: "Redirecting to the English site…",
    notFound: "Page not found", backHome: "Back to the home page", draft: "Draft (not published)", privateNote: "Private (will not be published)", skip: "Skip to content", langName: "English",
    rights: "Posts", built: "A static site, no tracking.",
    search: "Search", searchHint: "Search titles, summaries and headings", searchNoJs: "Search needs JavaScript. Without it, browse by section above or follow the Atom feed.",
    searchLoading: "Loading…", searchNone: "No matching posts.", searchCount: "{n} found", searchError: "The search index failed to load; reload the page.",
  },
} as const;

export const sectionTitle = (lang: Lang, id: string) => site.sections.find((s: { id: string }) => s.id === id)?.title[lang] ?? id;
export const title = (lang: Lang) => site.title[lang];
export const tagline = (lang: Lang) => site.tagline[lang];
