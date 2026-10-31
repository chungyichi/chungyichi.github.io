import type { Lang } from "./i18n";

/** One post in a list. thumb: 400x210 (any section); card: 480x480, toys only, "" when scripts/og-image.sh --square has not run. */
export type Brief = { section: string; slug: string; title: string; summary: string; date: string; tags: string[]; thumb: string; card: string; owner: string; status: string };
export type Alt = { lang: Lang; path: string; translated?: boolean };
/** A picture on a toy page's panel (scripts/content.mjs toyHero): empty for a post without one. */
export type Picture = { src: string; alt: string };

export type Route =
  | { kind: "entry"; path: string; lang: Lang; alternates: Alt[] }
  | { kind: "notfound"; path: string; lang: Lang; alternates: Alt[] }
  | { kind: "home"; path: string; lang: Lang; alternates: Alt[]; props: { featured: Brief[]; sections: { id: string; total: number }[] } }
  | { kind: "index"; path: string; lang: Lang; alternates: Alt[]; props: { section: string; groups: { date: string; items: Brief[] }[]; page: number; pages: number } }
  | { kind: "post"; path: string; lang: Lang; alternates: Alt[]; props: Omit<Brief, "thumb" | "card"> & { updated: string; html: string; draft: boolean; private: boolean; words: number; source: string; price: string; pictures: Picture[] } }
  | { kind: "toys"; path: string; lang: Lang; alternates: Alt[]; props: { section: string; owner: string; owners: { id: string; total: number }[]; total: number; items: Brief[]; page: number; pages: number } }
  | { kind: "tags"; path: string; lang: Lang; alternates: Alt[]; props: { tags: { tag: string; slug: string; count: number }[] } }
  | { kind: "tag"; path: string; lang: Lang; alternates: Alt[]; props: { tag: string; slug: string; groups: { date: string; items: Brief[] }[]; page: number; pages: number } }
  | { kind: "search"; path: string; lang: Lang; alternates: Alt[]; props: { index: string; tags: { tag: string; slug: string; count: number }[] } }
  | { kind: "page"; path: string; lang: Lang; alternates: Alt[]; props: { name: string; title: string; summary: string; html: string } };
