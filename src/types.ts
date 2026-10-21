import type { Lang } from "./i18n";

export type Brief = { slug: string; title: string; summary: string; date: string };
export type Alt = { lang: Lang; path: string; translated?: boolean };

export type Route =
  | { kind: "picker"; path: string; lang: Lang; alternates: Alt[] }
  | { kind: "notfound"; path: string; lang: Lang; alternates: Alt[] }
  | { kind: "home"; path: string; lang: Lang; alternates: Alt[]; props: { latest: Brief[]; total: number } }
  | { kind: "index"; path: string; lang: Lang; alternates: Alt[]; props: { groups: { date: string; items: Brief[] }[]; page: number; pages: number } }
  | { kind: "post"; path: string; lang: Lang; alternates: Alt[]; props: Brief & { updated: string; html: string; draft: boolean; words: number } }
  | { kind: "page"; path: string; lang: Lang; alternates: Alt[]; props: { name: string; title: string; summary: string; html: string } };
