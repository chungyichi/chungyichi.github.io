import type { Lang } from "./i18n";

/** One post in a list. thumb: 400x210 (any section); card: 480x480, picture-grid sections only (toys, books), "" when scripts/og-image.sh --square has not run. */
export type Brief = { section: string; slug: string; title: string; summary: string; date: string; tags: string[]; thumb: string; card: string; owner: string; own: boolean; type: string; platform: string[]; author: string; status: string; quantity: number };
/** One entry of the per-language data file (scripts/content.mjs buildSearchIndex): the search, the picture grids and the tag page all read it. */
export type Entry = { t: string; s: string; h: string[]; g?: string[]; d: string; c: string; u: string; o?: string; w?: number; ty?: string; pf?: string[]; a?: string; st?: number; q?: number; im?: number };
/** What src/grid-core.mjs gridView returns: the page of items and the counts of the owner buttons and of each facet. */
export type GridViewData = { total: number; matched: number; owners: { id: string; total: number }[]; facets: { id: string; total: number; values: { id: string; total: number }[] }[]; items: Entry[]; page: number; pages: number };
export type Alt = { lang: Lang; path: string; translated?: boolean };
/** A picture on a toy or book page's panel (scripts/content.mjs toyHero): empty for a post without one. */
export type Picture = { src: string; alt: string };
/** A slide of the home page's toy carousel (site.config.mjs featuredToys): the toy's picture ("" when it has none) and name. */
export type ToySlide = { slug: string; title: string; pic: string };

/** A thing in an equipment slot (src/gear.mjs resolveGear): the post's facts and its picture (card, else thumb; "" = none, a game then shows its title tile). */
export type GearItem = { section: string; slug: string; title: string; summary: string; tags: string[]; date: string; pic: string };
/** One slot of a person's sheet: an unknown rarity is already the default; item is null for an empty slot. */
export type GearSlotData = { slot: string; rarity: string; item: GearItem | null };
/** A person's level, title and mood (src/achievements.mjs resolveProfile; level 0 and "" = not set). */
export type GearProfile = { level: number; title: string; mood: { text: string; icon: string } };
/** One achievement for one person (src/achievements.mjs evaluateAchievements). */
export type AchievementState = { id: string; name: string; desc: string; title: string; unlocked: boolean; progress: number; min: number };
/** The reading summary (閱歷) of a person: their books as finished quests, counted (questLog). `volumes` counts listed volumes only, `web` the books that list none. */
export type QuestLog = { done: number; volumes: number; web: number; games: number };
/** One person's sheet: all slots in the order of SLOTS, `filled` of them with an item; plus the 閱歷 tab (achievements and quest log). */
export type GearSet = { owner: string; filled: number; slots: GearSlotData[]; profile: GearProfile; achievements: AchievementState[]; log: QuestLog };


export type Route =
  | { kind: "entry"; path: string; lang: Lang; alternates: Alt[] }
  | { kind: "notfound"; path: string; lang: Lang; alternates: Alt[] }
  | { kind: "home"; path: string; lang: Lang; alternates: Alt[]; props: { featured: Brief[]; toys: ToySlide[]; gear: GearSet[]; gearOverview: "items" | "title" } }
  | { kind: "index"; path: string; lang: Lang; alternates: Alt[]; props: { section: string; groups: { date: string; items: Brief[] }[]; page: number; pages: number } }
  | { kind: "post"; path: string; lang: Lang; alternates: Alt[]; props: Omit<Brief, "thumb" | "card"> & { updated: string; html: string; draft: boolean; private: boolean; words: number; original: string; developer: string; volumes: string[]; source: string; price: string; pictures: Picture[] } }
  | { kind: "grid"; path: string; lang: Lang; alternates: Alt[]; props: { section: string; index: string; entries: Entry[] } }
  | { kind: "tags"; path: string; lang: Lang; alternates: Alt[]; props: { index: string; entries: Entry[] } }
  | { kind: "search"; path: string; lang: Lang; alternates: Alt[]; props: { index: string; tags: { tag: string; count: number }[] } }
  | { kind: "page"; path: string; lang: Lang; alternates: Alt[]; props: { name: string; title: string; summary: string; html: string } };
