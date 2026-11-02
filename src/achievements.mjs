// Achievements (成就), profiles (level, title, mood) and the quest log (閱歷) of the home gear block. Pure (no DOM): shared by the build (scripts/routes.mjs,
// scripts/check.mjs), the pages (src/Gear.tsx) and the tests (test/achievements.test.mjs).
// The data is `achievements` and `gear.<person>.profile` in site.config.mjs. A rule is DATA, never code:
//   { kind: "count",   section, tag?, own?, owner?, min }  how many posts of the section (a book or a toy is one)
//   { kind: "volumes", tag?, own?, owner?, min }           volumes of books (a book that lists none is 1)
//   { kind: "tag",     tag, section?, owner?, min }        things (a toy's quantity, an owned book's volumes) that carry the tag
//   { kind: "things",  section?, tag?, owner?, min }       things of the person (same counting as the tag kind, a tag is optional)
//   { kind: "item",    item: "books/slug", owner?, min }   one post: its volumes (book) or quantity (toy) must reach min (default 1); 0 when the person does not have it
// A rule is always judged for ONE person and only counts that person's posts (`owner` in the post). `owner` in the rule makes the achievement that
// person's alone (everybody else stays locked at 0). `own: "no"` = books only read, `own: "yes"` = books we have.
import { BOOKS_SECTION, TOYS_SECTION } from "./toys.mjs";

export const ACHIEVEMENT_KINDS = ["count", "volumes", "tag", "things", "item"];
const RULE_KEYS = ["kind", "section", "owner", "tag", "min", "own", "item"];
const SECTIONS = [TOYS_SECTION, BOOKS_SECTION];
/** The prefix of a profile title that names an achievement: "ach:wheel-of-time". */
export const ACH_PREFIX = "ach:";

/** How many things a post is: a toy its quantity (a wish-list toy, status want, is 0), a book its volumes (1 when it lists none; 0 when only read), anything else 0. */
export function thingsOf(p) {
  if (p.section === TOYS_SECTION) return p.status === "want" ? 0 : Math.max(1, Number(p.quantity) || 1);
  if (p.section === BOOKS_SECTION) return p.own === false ? 0 : Math.max(1, (p.volumes || []).length);   // a book only read (own: no) is not something we have
  return 0;
}

/** Volumes (parts) of a post as the achievements and a quest card count them: a toy its quantity, a book the volumes it lists (1 when it lists none, e.g. a web novel). */
export const unitsOf = (p) => (p.section === BOOKS_SECTION ? Math.max(1, (p.volumes || []).length) : p.section === TOYS_SECTION ? Math.max(1, Number(p.quantity) || 1) : 0);

const text = (v, lang) => (v && typeof v === "object" ? v[lang] || v.zh || v.en || "" : typeof v === "string" ? v : "");

/** True when the post matches the filters of the rule (person, section, tag, own). */
function matches(p, rule, owner, section) {
  if (p.owner !== owner) return false;
  if (section && p.section !== section) return false;
  if (rule.tag !== undefined && !(p.tags || []).includes(rule.tag)) return false;
  if (rule.own !== undefined && p.section === BOOKS_SECTION && (rule.own === "no") !== (p.own === false)) return false;
  return true;
}

/**
 * How far one person is on one rule: the number that is compared with `min` (it may be bigger: 12 / 5). Unknown kinds count 0.
 * @param {any} rule @param {any[]} posts the published posts of one language @param {string} owner
 */
export function progressOf(rule, posts, owner) {
  if (!rule || (rule.owner && rule.owner !== owner)) return 0;
  switch (rule.kind) {
    case "count": return posts.filter((p) => matches(p, rule, owner, rule.section)).length;
    case "volumes": return posts.filter((p) => matches(p, rule, owner, BOOKS_SECTION)).reduce((a, p) => a + unitsOf(p), 0);
    case "tag": return posts.filter((p) => matches(p, rule, owner, rule.section)).reduce((a, p) => a + thingsOf(p), 0);
    case "things": return posts.filter((p) => matches(p, rule, owner, rule.section)).reduce((a, p) => a + thingsOf(p), 0);
    case "item": {
      const p = posts.find((x) => `${x.section}/${x.slug}` === rule.item);
      return p && p.owner === owner ? unitsOf(p) : 0;
    }
    default: return 0;
  }
}

/**
 * Every achievement that applies to one person (those made for another person with `rule.owner` are left out) in the config order: { id, name, desc, title, unlocked, progress, min } with the texts in `lang`.
 * @param {any[]} achievements @param {any[]} posts @param {string} owner @param {"zh" | "en"} lang
 */
export function evaluateAchievements(achievements, posts, owner, lang) {
  return (achievements ?? []).filter((a) => !a.rule?.owner || a.rule.owner === owner).map((a) => {
    const min = Math.max(1, Number(a.rule?.min) || 1), progress = progressOf(a.rule, posts, owner);
    return { id: a.id, name: text(a.name, lang), desc: text(a.desc, lang), title: text(a.title, lang), unlocked: progress >= min, progress, min };
  });
}

/**
 * The profile of a person as the pages show it: { level, title, mood: { text, icon } }. `title` is a plain string, { zh, en }, or "ach:<id>" = the title of
 * that achievement, used only once it is unlocked (else empty). Missing parts are 0 / "".
 * @param {any} profile @param {{ id: string, title: string, unlocked: boolean }[]} evaluated @param {"zh" | "en"} lang
 */
export function resolveProfile(profile, evaluated, lang) {
  const p = profile ?? {};
  let title = "";
  if (typeof p.title === "string" && p.title.startsWith(ACH_PREFIX)) { const a = evaluated.find((x) => x.id === p.title.slice(ACH_PREFIX.length)); title = a?.unlocked ? a.title : ""; }
  else title = text(p.title, lang);
  const level = Number.isInteger(p.level) && p.level > 0 ? p.level : 0;
  return { level, title, mood: { text: text(p.mood, lang), icon: typeof p.mood?.icon === "string" ? p.mood.icon : "" } };
}

/** "1/5": the progress numbers as written on a card. */
export const progressText = (a) => `${a.progress}/${a.min}`;

const isText = (v) => v && typeof v === "object" && typeof v.zh === "string" && v.zh && typeof v.en === "string" && v.en;

/**
 * Problems in the `achievements` list as messages (empty = fine): ids unique, texts in both languages, a known rule kind with its fields, known sections,
 * people, positive whole `min`, an `item` that is a published post.
 * @param {any} list @param {{ owners: string[], published: Iterable<string> }} ctx
 */
export function validateAchievements(list, { owners, published }) {
  const errors = [], known = new Set(published);
  if (list == null) return errors;
  if (!Array.isArray(list)) return ["achievements must be a list: [{ id, name, desc, title, rule }]"];
  const seen = new Set();
  list.forEach((a, i) => {
    const where = `achievements[${i}]${a && typeof a.id === "string" ? ` (${a.id})` : ""}`;
    if (!a || typeof a !== "object") { errors.push(`${where}: must be an object`); return; }
    if (typeof a.id !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(a.id)) errors.push(`${where}: id must be lowercase letters, digits and dashes`);
    else if (seen.has(a.id)) errors.push(`${where}: id '${a.id}' is used twice`);
    else seen.add(a.id);
    for (const f of ["name", "desc", "title"]) if (!isText(a[f])) errors.push(`${where}: ${f} needs { zh, en }`);
    const r = a.rule;
    if (!r || typeof r !== "object") { errors.push(`${where}: needs a rule`); return; }
    if (!ACHIEVEMENT_KINDS.includes(r.kind)) { errors.push(`${where}: unknown rule kind '${r.kind}' (known: ${ACHIEVEMENT_KINDS.join(", ")})`); return; }
    for (const k of Object.keys(r)) if (!RULE_KEYS.includes(k)) errors.push(`${where}: unknown rule field '${k}'`);
    if (!Number.isInteger(r.min) || r.min < 1) errors.push(`${where}: rule.min must be a whole number >= 1`);
    if (r.section !== undefined && !SECTIONS.includes(r.section)) errors.push(`${where}: rule.section must be ${SECTIONS.join(" or ")}`);
    if (r.owner !== undefined && !owners.includes(r.owner)) errors.push(`${where}: rule.owner '${r.owner}' is not a known person (${owners.join(", ")})`);
    if (r.own !== undefined && !["yes", "no"].includes(r.own)) errors.push(`${where}: rule.own must be yes or no`);
    if (r.tag !== undefined && (typeof r.tag !== "string" || !r.tag)) errors.push(`${where}: rule.tag must be a tag`);
    if (r.kind === "count" && !r.section) errors.push(`${where}: a count rule needs a section`);
    if (r.kind === "tag" && !r.tag) errors.push(`${where}: a tag rule needs a tag`);
    if (r.kind === "item") {
      if (typeof r.item !== "string" || !/^[a-z]+\/[^/]+$/.test(r.item)) errors.push(`${where}: an item rule needs item: "<section>/<slug>"`);
      else if (!known.has(r.item)) errors.push(`${where}: item '${r.item}' is not a published post`);
    }
  });
  return errors;
}

/**
 * Problems in one person's `profile` ({ level, title, mood }): level a whole number >= 1, title a string / { zh, en } / "ach:<known id>", mood { zh, en, icon? }.
 * @param {any} profile @param {string} where e.g. "gear.me.profile" @param {string[]} achievementIds
 */
export function validateProfile(profile, where, achievementIds) {
  const errors = [];
  if (profile === undefined) return errors;
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) return [`${where} must be an object: { level, title, mood }`];
  for (const k of Object.keys(profile)) if (!["level", "title", "mood"].includes(k)) errors.push(`${where}: unknown field '${k}' (level, title, mood)`);
  if (profile.level !== undefined && (!Number.isInteger(profile.level) || profile.level < 1)) errors.push(`${where}.level must be a whole number >= 1`);
  const t = profile.title;
  if (t !== undefined) {
    if (typeof t === "string" && t.startsWith(ACH_PREFIX)) { if (!achievementIds.includes(t.slice(ACH_PREFIX.length))) errors.push(`${where}.title: '${t}' names no achievement (known: ${achievementIds.join(", ")})`); }
    else if (!(typeof t === "string" && t) && !isText(t)) errors.push(`${where}.title must be a text, { zh, en } or "ach:<id>"`);
  }
  const m = profile.mood;
  if (m !== undefined) {
    if (!isText(m)) errors.push(`${where}.mood needs { zh, en, icon? }`);
    else if (m.icon !== undefined && (typeof m.icon !== "string" || [...m.icon].length > 4)) errors.push(`${where}.mood.icon must be one short emoji`);
  }
  return errors;
}

/** A profile that names an achievement title but has not unlocked it: the messages (the page would show no title). */
export function lockedTitleProblems(gear, achievements, posts, owners) {
  const out = [];
  for (const owner of owners) {
    const t = gear?.[owner]?.profile?.title;
    if (typeof t !== "string" || !t.startsWith(ACH_PREFIX)) continue;
    const a = evaluateAchievements(achievements, posts, owner, "zh").find((x) => x.id === t.slice(ACH_PREFIX.length));
    if (a && !a.unlocked) out.push(`gear.${owner}.profile.title: '${t}' is not unlocked yet (${progressText(a)}), the page would show no title`);
  }
  return out;
}

/** Quests per page of the 閱歷 tab. */
export const QUEST_PAGE_SIZE = 6;
/** How many pages `n` quests make (at least 1). */
export const questPageCount = (n, size = QUEST_PAGE_SIZE) => Math.max(1, Math.ceil(n / size));
/** A page number kept inside 1..pages (anything else is 1). */
export const clampPage = (page, pages) => (Number.isInteger(page) ? Math.min(Math.max(1, page), Math.max(1, pages)) : 1);

/**
 * The quest log (閱歷) of one person: every book of theirs is a finished quest (there is no reading-progress data), newest first (date, then slug).
 * The date is only used for the order; a quest does not show it (it is when the post was added, not when it was read).
 * `volumes` = the listed volumes of all books; a book that lists none (a web novel) is not in it but in `web`, so the summary says "56 卷 + 3 部網文".
 * A card shows `volumes` = the listed volumes, at least 1 (a book that lists none is one volume there).
 * @returns {{ done: number, volumes: number, web: number, quests: { slug: string, title: string, author: string, volumes: number, tags: string[], own: boolean }[] }}
 */
export function questLog(posts, owner) {
  const mine = posts.filter((p) => p.section === BOOKS_SECTION && p.owner === owner)
    .sort((a, b) => (b.date || "").localeCompare(a.date || "") || a.slug.localeCompare(b.slug));
  return {
    done: mine.length,
    volumes: mine.reduce((a, p) => a + (p.volumes || []).length, 0),
    web: mine.filter((p) => !(p.volumes || []).length).length,
    quests: mine.map((p) => ({ slug: p.slug, title: p.title, author: p.author || "", volumes: unitsOf(p), tags: p.tags || [], own: p.own !== false })),
  };
}

/** The one-line summary of the 閱歷 tab: "完成 15 項任務 · 共 56 卷" and, when some books list no volumes, " + 3 部網文". */
export function questSummary(lang, log) {
  if (lang === "en") return `${log.done} quest${log.done === 1 ? "" : "s"} done · ${log.volumes} volume${log.volumes === 1 ? "" : "s"}${log.web > 0 ? ` + ${log.web} web novel${log.web === 1 ? "" : "s"}` : ""}`;
  return `完成 ${log.done} 項任務 · 共 ${log.volumes} 卷${log.web > 0 ? ` + ${log.web} 部網文` : ""}`;
}
