// The equipment slots (裝備欄) of the home page: a character-sheet style showcase of the best toys and games of each person.
// Pure (no DOM), shared by the build (scripts/routes.mjs, scripts/check.mjs), the page (src/Gear.tsx) and the tests.
import { validateProfile } from "./achievements.mjs";
// The data is `gear` in site.config.mjs: { me: { head: { item: "toys/slug", rarity: "epic" }, ... }, son: {...}, brother: {...} }.

/** The rarities, weakest first. The colours are CSS tokens in src/styles/gear.css (--rarity-<id>); the word is always shown too (never colour alone). */
export const RARITIES = [
  { id: "poor", zh: "粗糙", en: "Poor" },
  { id: "common", zh: "普通", en: "Common" },
  { id: "uncommon", zh: "優良", en: "Uncommon" },
  { id: "rare", zh: "精良", en: "Rare" },
  { id: "epic", zh: "史詩", en: "Epic" },
  { id: "legendary", zh: "傳說", en: "Legendary" },
];
export const DEFAULT_RARITY = "rare";

/** The slots in the order of the sheet: the left column, the right column, then the two hands at the bottom (`area`). */
export const SLOTS = [
  { id: "head", area: "left", zh: "頭", en: "Head" },
  { id: "neck", area: "left", zh: "頸", en: "Neck" },
  { id: "shoulder", area: "left", zh: "肩", en: "Shoulder" },
  { id: "back", area: "left", zh: "背", en: "Back" },
  { id: "chest", area: "left", zh: "胸", en: "Chest" },
  { id: "shirt", area: "left", zh: "襯衣", en: "Shirt" },
  { id: "wrist", area: "left", zh: "腕", en: "Wrist" },
  { id: "hands", area: "left", zh: "手", en: "Hands" },
  { id: "waist", area: "right", zh: "腰", en: "Waist" },
  { id: "legs", area: "right", zh: "腿", en: "Legs" },
  { id: "feet", area: "right", zh: "腳", en: "Feet" },
  { id: "ring1", area: "right", zh: "戒指 1", en: "Ring 1" },
  { id: "ring2", area: "right", zh: "戒指 2", en: "Ring 2" },
  { id: "trinket1", area: "right", zh: "飾品 1", en: "Trinket 1" },
  { id: "trinket2", area: "right", zh: "飾品 2", en: "Trinket 2" },
  { id: "emblem", area: "right", zh: "徽記", en: "Emblem" },
  { id: "mainhand", area: "bottom", zh: "主手", en: "Main hand" },
  { id: "offhand", area: "bottom", zh: "副手", en: "Off hand" },
];
export const SLOT_IDS = SLOTS.map((s) => s.id);
export const RARITY_IDS = RARITIES.map((r) => r.id);
/** The sections an item may come from: toys and games. A book cannot be equipped (it is read, see the 閱歷 tab). */
export const GEAR_SECTIONS = ["toys", "games"];

export const slotName = (lang, id) => SLOTS.find((s) => s.id === id)?.[lang] ?? id;
export const rarityName = (lang, id) => RARITIES.find((r) => r.id === id)?.[lang] ?? id;
/** A rarity id as the sheet uses it: an unknown or missing one becomes the default. */
export const rarityOf = (id) => (RARITY_IDS.includes(id) ? id : DEFAULT_RARITY);

/**
 * Problems in the `gear` config as readable messages (empty = fine). `published` is the "<section>/<slug>" of every published post (any language).
 * Checks: unknown owner, unknown slot, unknown rarity, an item that is not "<section>/<slug>" of a published toy / game, the same item twice for one person.
 * `gear.<person>.profile` is not a slot: it is checked by validateProfile (src/achievements.mjs) against `achievementIds`.
 * @param {any} gear @param {{ owners: string[], published: Iterable<string>, achievementIds?: string[] }} ctx
 */
export function validateGear(gear, { owners, published, achievementIds = [] }) {
  const errors = [], known = new Set(published);
  if (gear == null) return errors;
  if (typeof gear !== "object" || Array.isArray(gear)) return ["gear must be an object: { me: { head: { item: \"toys/slug\" } }, ... }"];
  if (gear.overview !== undefined && !OVERVIEW_MODES.includes(gear.overview)) errors.push(`gear.overview must be one of ${OVERVIEW_MODES.map((m) => `"${m}"`).join(", ")} (got ${JSON.stringify(gear.overview)})`);
  for (const [owner, slots] of Object.entries(gear)) {
    if (owner === "overview") continue;   // not a person: the mode of the home overview
    if (!owners.includes(owner)) { errors.push(`gear: unknown person '${owner}' (known: ${owners.join(", ")})`); continue; }
    if (!slots || typeof slots !== "object" || Array.isArray(slots)) { errors.push(`gear.${owner} must be an object of slots`); continue; }
    const seen = new Map();
    errors.push(...validateProfile(slots.profile, `gear.${owner}.profile`, achievementIds));
    for (const [slot, entry] of Object.entries(slots)) {
      if (slot === "profile") continue;
      const where = `gear.${owner}.${slot}`;
      if (!SLOT_IDS.includes(slot)) { errors.push(`${where}: unknown slot '${slot}' (known: ${SLOT_IDS.join(", ")})`); continue; }
      if (!entry || typeof entry !== "object" || typeof entry.item !== "string") { errors.push(`${where}: needs { item: "<section>/<slug>" }`); continue; }
      if (entry.rarity !== undefined && !RARITY_IDS.includes(entry.rarity)) errors.push(`${where}: unknown rarity '${entry.rarity}' (known: ${RARITY_IDS.join(", ")})`);
      const [section = "", slug = "", ...rest] = entry.item.split("/");
      if (section === "books") { errors.push(`${where}: '${entry.item}' is a book; a book cannot be equipped (only toys and games)`); continue; }
      if (!GEAR_SECTIONS.includes(section) || !slug || rest.length) errors.push(`${where}: item '${entry.item}' must look like toys/<slug> or games/<slug>`);
      else if (!known.has(entry.item)) errors.push(`${where}: item '${entry.item}' is not a published post`);
      if (seen.has(entry.item)) errors.push(`${where}: item '${entry.item}' is already in slot '${seen.get(entry.item)}' of ${owner} (an item may be used once per person)`);
      else seen.set(entry.item, slot);
    }
  }
  return errors;
}

/**
 * The sheets of one language: for every owner (in the order of `owners`) all slots in SLOTS order, empty ones included.
 * `posts` are the published posts of that language; `itemOf(post)` makes the item shown (title, summary, tags, date, picture ...).
 * An item whose post does not exist in this language is an empty slot; an unknown slot is ignored; an unknown rarity is the default.
 * @returns {{ owner: string, filled: number, slots: { slot: string, rarity: string, item: any | null }[] }[]}
 */
export function resolveGear(gear, posts, owners, itemOf) {
  const byKey = new Map(posts.map((p) => [`${p.section}/${p.slug}`, p]));
  return owners.map((owner) => {
    const mine = gear?.[owner] ?? {};
    const slots = SLOTS.map(({ id }) => {
      const entry = mine[id];
      const post = entry && typeof entry.item === "string" ? byKey.get(entry.item) : undefined;
      return { slot: id, rarity: rarityOf(entry?.rarity), item: post ? itemOf(post) : null };
    });
    return { owner, filled: slots.filter((s) => s.item).length, slots };
  });
}
/** The sheets that have something, for the home carousel (the block is hidden when none has). */
export const filledSets = (sets) => sets.filter((s) => s.filled > 0);

/** What the home overview (the word cloud with the stick figure) orbits: "items" (the equipped things) or "title" (title, level, mood and unlocked achievements). */
export const OVERVIEW_MODES = ["items", "title"];
export const overviewMode = (gear) => (gear?.overview === "title" ? "title" : "items");
/** Most words in one overview cloud, and the length (in CJK characters; a Latin letter counts 0.6) that a label is cut to. */
export const OVERVIEW_MAX = 18, LABEL_WIDTH = 10;

/** Size options of the overview cloud (src/wordcloud.mjs DEFAULTS): smaller labels than a tag cloud, because the stick figure needs the middle; boxR matches --wc-R of .gear-overview (34vw, at most 10rem; 8.5rem at 400px). */
export const OVERVIEW_TUNE = { minRem: 0.72, maxRem: 1.05, fitFrom: 8, fitMin: 0.65, boxR: 8.5, fade: 0.3 };

const isCjk = (ch) => ch.codePointAt(0) >= 0x2e80;
/**
 * A title cut to about `max` characters for a cloud label (the full title stays in the dialog and in the tooltip): the part before a subtitle mark (｜ | ： : — ( （) when
 * that leaves a real label, then cut at the width (a CJK character is 1, other characters 0.6), back to a space when a Latin word would be split, with an ellipsis.
 */
export function shortTitle(title, max = LABEL_WIDTH) {
  let s = String(title ?? "").trim();
  const cut = s.search(/\s*[｜|：:—–(（]/);
  if (cut >= 2) s = s.slice(0, cut).trim();
  let w = 0, end = 0;
  const chars = [...s];
  for (; end < chars.length; end++) { w += isCjk(chars[end]) ? 1 : 0.6; if (w > max + 1e-9) break; }
  if (end >= chars.length) return s;
  let out = chars.slice(0, end).join("");
  const space = out.lastIndexOf(" "), midWord = chars[end] !== " " && !isCjk(chars[end]) && !isCjk(chars[end - 1] ?? " ");
  if (midWord && space >= 2) out = out.slice(0, space);
  return `${out.trimEnd()}…`;
}

/**
 * The words that orbit the stick figure of one person (for src/WordCloud.tsx): [{ label, count, percent, title?, href?, ref?, tone? }] biggest first, at most OVERVIEW_MAX.
 * "items": the equipped things, the rarest first (then in slot order); count = rarity rank (1 poor .. 6 legendary), tone = the rarity id (the colour), ref = the slot id
 * (the click opens the dialog of that slot), href = the item's page (the way without JavaScript), title = the full title.
 * "title": the title, the level, the mood and the names of the unlocked achievements (plain words: no href, no ref); the weight falls with the order.
 * @param {{ slots: { slot: string, rarity: string, item: any }[], profile: any, achievements: { name: string, unlocked: boolean }[] }} set
 * @param {"items" | "title"} mode @param {{ href: (item: any) => string, level: (n: number) => string }} fmt
 */
export function overviewWords(set, mode, fmt) {
  if (mode === "title") {
    const p = set.profile ?? {}, labels = [
      p.title, p.level > 0 ? fmt.level(p.level) : "", p.mood?.text ? `${p.mood.icon ? `${p.mood.icon} ` : ""}${p.mood.text}` : "",
      ...(set.achievements ?? []).filter((a) => a.unlocked).map((a) => a.name),
    ].filter(Boolean).slice(0, OVERVIEW_MAX);
    return labels.map((label, i) => ({ label: shortTitle(label, LABEL_WIDTH + 2), count: labels.length - i, percent: 0, title: label, plain: true }));
  }
  return set.slots.map((d, order) => ({ d, order })).filter(({ d }) => d.item)
    .sort((a, b) => RARITY_IDS.indexOf(b.d.rarity) - RARITY_IDS.indexOf(a.d.rarity) || a.order - b.order).slice(0, OVERVIEW_MAX)
    .map(({ d }) => ({ label: shortTitle(d.item.title), count: RARITY_IDS.indexOf(d.rarity) + 1, percent: 0, title: d.item.title, href: fmt.href(d.item), ref: d.slot, tone: d.rarity }));
}

/**
 * What the shared dialog shows for a filled slot (small, goes into the slot button's data-item as JSON): title, rarity id and word, slot name, one-line summary, tags, date, picture and the item's page.
 * @param {"zh" | "en"} lang @param {{ slot: string, rarity: string, item: any }} d @param {string} href the item's own page
 */
export function dialogData(lang, d, href) {
  const { title, summary, tags, date, pic } = d.item;
  return { title, rarity: d.rarity, rarityName: rarityName(lang, d.rarity), slotName: slotName(lang, d.slot), summary: summary || "", tags: (tags || []).slice(0, 4), date: date || "", pic: pic || "", href };
}
