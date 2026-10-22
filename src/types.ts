import type { Lang } from "./i18n";

export type Brief = { section: string; slug: string; title: string; summary: string; date: string; tags: string[]; thumb: string };
export type Alt = { lang: Lang; path: string; translated?: boolean };

export type Route =
  | { kind: "entry"; path: string; lang: Lang; alternates: Alt[] }
  | { kind: "notfound"; path: string; lang: Lang; alternates: Alt[] }
  | { kind: "home"; path: string; lang: Lang; alternates: Alt[]; props: { sections: { id: string; latest: Brief[]; total: number }[] } }
  | { kind: "index"; path: string; lang: Lang; alternates: Alt[]; props: { section: string; groups: { date: string; items: Brief[] }[]; page: number; pages: number } }
  | { kind: "post"; path: string; lang: Lang; alternates: Alt[]; props: Brief & { updated: string; html: string; draft: boolean; private: boolean; words: number } }
  | { kind: "tags"; path: string; lang: Lang; alternates: Alt[]; props: { tags: { tag: string; slug: string; count: number }[] } }
  | { kind: "tag"; path: string; lang: Lang; alternates: Alt[]; props: { tag: string; slug: string; groups: { date: string; items: Brief[] }[]; page: number; pages: number } }
  | { kind: "search"; path: string; lang: Lang; alternates: Alt[]; props: { index: string; tags: { tag: string; slug: string; count: number }[] } }
  | { kind: "page"; path: string; lang: Lang; alternates: Alt[]; props: { name: string; title: string; summary: string; html: string } };
