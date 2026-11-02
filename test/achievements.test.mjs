import test from "node:test";
import assert from "node:assert/strict";
import { site } from "../site.config.mjs";
import { progressOf, evaluateAchievements, resolveProfile, validateAchievements, validateProfile, lockedTitleProblems, questLog, questSummary, questPageCount, clampPage, QUEST_PAGE_SIZE, unitsOf, thingsOf, ACHIEVEMENT_KINDS } from "../src/achievements.mjs";
import { validateGear } from "../src/gear.mjs";

const owners = ["me", "son", "brother"];
const book = (slug, o = {}) => ({ section: "books", slug, title: `B-${slug}`, owner: "me", tags: ["小說"], own: true, type: "novel", volumes: [], date: "2026-11-01", author: "A", ...o });
const toy = (slug, o = {}) => ({ section: "toys", slug, title: `T-${slug}`, owner: "brother", tags: ["戰鬥陀螺"], quantity: 1, date: "2026-11-01", ...o });
const vols = (n) => Array.from({ length: n }, (_, i) => `v${i + 1}`);
const posts = [
  book("wheel", { tags: ["奇幻", "小說"], volumes: vols(21), date: "2026-10-01" }),
  book("rune", { tags: ["奇幻"], volumes: vols(7), date: "2026-11-01" }),
  book("web1", { own: false, tags: ["網路小說"] }), book("web2", { own: false, tags: ["網路小說"] }),
  book("manga", { type: "comic", volumes: vols(3), owner: "son" }),
  toy("b1"), toy("b2", { quantity: 2 }), toy("b3", { status: "want" }), toy("car", { owner: "son", tags: ["麵包超人"] }),
];
const published = posts.map((p) => `${p.section}/${p.slug}`);

test("count: posts of a section, with tag and own, scoped to the person", () => {
  assert.equal(progressOf({ kind: "count", section: "books", min: 1 }, posts, "me"), 4);
  assert.equal(progressOf({ kind: "count", section: "books", tag: "奇幻", min: 1 }, posts, "me"), 2);
  assert.equal(progressOf({ kind: "count", section: "books", own: "no", min: 1 }, posts, "me"), 2);
  assert.equal(progressOf({ kind: "count", section: "books", own: "yes", min: 1 }, posts, "me"), 2);
  assert.equal(progressOf({ kind: "count", section: "toys", min: 1 }, posts, "brother"), 3);   // a wish-list toy is still a post
  assert.equal(progressOf({ kind: "count", section: "books", min: 1 }, posts, "brother"), 0);
});

test("volumes: listed volumes, a book that lists none is 1, only books", () => {
  assert.equal(progressOf({ kind: "volumes", min: 1 }, posts, "me"), 21 + 7 + 1 + 1);
  assert.equal(progressOf({ kind: "volumes", own: "yes", min: 1 }, posts, "me"), 28);
  assert.equal(progressOf({ kind: "volumes", tag: "奇幻", min: 1 }, posts, "me"), 28);
  assert.equal(progressOf({ kind: "volumes", min: 1 }, posts, "son"), 3);
  assert.equal(unitsOf(posts[0]), 21);
  assert.equal(unitsOf(posts[2]), 1);
});

test("tag and things: quantity and owned volumes, a wish-list toy and a book only read count 0", () => {
  assert.equal(progressOf({ kind: "tag", tag: "戰鬥陀螺", min: 1 }, posts, "brother"), 1 + 2);
  assert.equal(progressOf({ kind: "tag", tag: "奇幻", section: "toys", min: 1 }, posts, "me"), 0);
  assert.equal(progressOf({ kind: "tag", tag: "奇幻", min: 1 }, posts, "me"), 28);
  assert.equal(progressOf({ kind: "things", min: 1 }, posts, "me"), 28);
  assert.equal(progressOf({ kind: "things", section: "toys", min: 1 }, posts, "son"), 1);
  assert.equal(progressOf({ kind: "things", tag: "麵包超人", min: 1 }, posts, "son"), 1);
});

test("item: the volumes of one post, 0 when the person does not have it", () => {
  assert.equal(progressOf({ kind: "item", item: "books/wheel", min: 21 }, posts, "me"), 21);
  assert.equal(progressOf({ kind: "item", item: "books/wheel", min: 21 }, posts, "son"), 0);
  assert.equal(progressOf({ kind: "item", item: "toys/b2", min: 1 }, posts, "brother"), 2);
  assert.equal(progressOf({ kind: "item", item: "books/none", min: 1 }, posts, "me"), 0);
});

test("owner scoping: a rule with owner is only for that person; an unknown kind counts 0", () => {
  const rule = { kind: "tag", tag: "戰鬥陀螺", owner: "brother", min: 1 };
  assert.equal(progressOf(rule, posts, "brother"), 3);
  assert.equal(progressOf(rule, posts, "son"), 0);
  assert.equal(progressOf({ kind: "magic", min: 1 }, posts, "me"), 0);
  assert.equal(progressOf(undefined, posts, "me"), 0);
});

test("evaluate: locked and unlocked, progress numbers above and below the goal, texts in the language", () => {
  const list = [
    { id: "fantasy", name: { zh: "奇幻", en: "Fantasy" }, desc: { zh: "d", en: "d" }, title: { zh: "旅人", en: "Wanderer" }, rule: { kind: "count", section: "books", tag: "奇幻", min: 2 } },
    { id: "big", name: { zh: "大", en: "Big" }, desc: { zh: "d", en: "d" }, title: { zh: "大師", en: "Master" }, rule: { kind: "volumes", min: 100 } },
    { id: "web", name: { zh: "網", en: "Web" }, desc: { zh: "d", en: "d" }, title: { zh: "網文", en: "Web" }, rule: { kind: "count", section: "books", own: "no", min: 1 } },
  ];
  const me = evaluateAchievements(list, posts, "me", "zh");
  assert.deepEqual(me.map((a) => [a.id, a.unlocked, a.progress, a.min]), [["fantasy", true, 2, 2], ["big", false, 30, 100], ["web", true, 2, 1]]);
  assert.equal(me[0].title, "旅人");
  assert.equal(evaluateAchievements(list, posts, "me", "en")[0].title, "Wanderer");
  assert.deepEqual(evaluateAchievements(list, posts, "son", "zh").map((a) => a.unlocked), [false, false, false]);
  const mine = { ...list[0], id: "bro", rule: { kind: "count", section: "toys", owner: "brother", min: 1 } };
  assert.deepEqual(evaluateAchievements([mine], posts, "brother", "zh").map((a) => [a.id, a.unlocked]), [["bro", true]]);
  assert.deepEqual(evaluateAchievements([mine], posts, "son", "zh"), []);   // an achievement made for another person is not shown
  assert.deepEqual(evaluateAchievements(undefined, posts, "me", "zh"), []);
});

test("profile: plain text, { zh, en }, an achievement title only when unlocked, missing parts empty", () => {
  const ev = [{ id: "a", title: "T-a", unlocked: true }, { id: "b", title: "T-b", unlocked: false }];
  assert.deepEqual(resolveProfile({ level: 5, title: "Hero", mood: { zh: "好", en: "ok", icon: "🙂" } }, ev, "zh"), { level: 5, title: "Hero", mood: { text: "好", icon: "🙂" } });
  assert.equal(resolveProfile({ title: { zh: "大師", en: "Master" } }, ev, "en").title, "Master");
  assert.equal(resolveProfile({ title: "ach:a" }, ev, "zh").title, "T-a");
  assert.equal(resolveProfile({ title: "ach:b" }, ev, "zh").title, "");
  assert.deepEqual(resolveProfile(undefined, ev, "zh"), { level: 0, title: "", mood: { text: "", icon: "" } });
  assert.equal(resolveProfile({ level: 0 }, ev, "zh").level, 0);
});

test("validate achievements: the real config is fine; unknown kind, bad min, duplicates, unknown item / person / field are rejected", () => {
  assert.deepEqual(validateAchievements(site.achievements, { owners, published: [...published, "books/wheel-of-time"] }), []);
  assert.ok(site.achievements.length >= 8 && site.achievements.length <= 10);
  const ok = { id: "x", name: { zh: "a", en: "a" }, desc: { zh: "a", en: "a" }, title: { zh: "a", en: "a" }, rule: { kind: "count", section: "books", min: 1 } };
  const msgs = validateAchievements([
    ok, { ...ok },
    { ...ok, id: "k", rule: { kind: "magic", min: 1 } },
    { ...ok, id: "m", rule: { kind: "count", section: "books", min: 0 } },
    { ...ok, id: "i", rule: { kind: "item", item: "books/ghost", min: 1 } },
    { ...ok, id: "o", rule: { kind: "tag", tag: "t", owner: "cat", min: 1 } },
    { ...ok, id: "f", rule: { kind: "count", section: "books", min: 1, extra: 1 } },
    { ...ok, id: "t", title: { zh: "a" } },
    { ...ok, id: "s", rule: { kind: "count", section: "games", min: 1 } },
    { ...ok, id: "g", rule: { kind: "tag", min: 1 } },
  ], { owners, published });
  const has = (re) => assert.ok(msgs.some((m) => re.test(m)), `${re} in:\n${msgs.join("\n")}`);
  has(/id 'x' is used twice/); has(/unknown rule kind 'magic'/); has(/min must be a whole number/); has(/item 'books\/ghost' is not a published/);
  has(/rule\.owner 'cat'/); has(/unknown rule field 'extra'/); has(/title needs \{ zh, en \}/); has(/rule\.section must be/); has(/tag rule needs a tag/);
  assert.deepEqual(validateAchievements(undefined, { owners, published }), []);
  assert.equal(validateAchievements({}, { owners, published }).length, 1);
  assert.ok(ACHIEVEMENT_KINDS.includes("item"));
});

test("validate profile: title reference must name an achievement; level and mood checked", () => {
  const ids = ["a", "b"];
  assert.deepEqual(validateProfile({ level: 3, title: "ach:a", mood: { zh: "a", en: "a", icon: "🙂" } }, "p", ids), []);
  assert.deepEqual(validateProfile({ title: { zh: "a", en: "b" } }, "p", ids), []);
  assert.deepEqual(validateProfile(undefined, "p", ids), []);
  const msgs = validateProfile({ level: 1.5, title: "ach:zzz", mood: { zh: "a" }, fame: 1 }, "p", ids);
  assert.equal(msgs.length, 4, msgs.join("\n"));
  assert.ok(validateProfile({ title: "" }, "p", ids).length === 1);
  assert.ok(validateProfile({ mood: { zh: "a", en: "a", icon: "not an emoji" } }, "p", ids).length === 1);
  // wired into validateGear
  const g = validateGear({ me: { profile: { title: "ach:nope" } } }, { owners, published, achievementIds: ids });
  assert.ok(g.some((m) => /gear\.me\.profile\.title/.test(m)));
});

test("a profile title naming a locked achievement is reported", () => {
  const list = [{ id: "web", name: { zh: "a", en: "a" }, desc: { zh: "a", en: "a" }, title: { zh: "a", en: "a" }, rule: { kind: "count", section: "books", own: "no", min: 5 } }];
  assert.equal(lockedTitleProblems({ me: { profile: { title: "ach:web" } } }, list, posts, owners).length, 1);
  assert.deepEqual(lockedTitleProblems({ me: { profile: { title: "ach:web" } } }, list.map((a) => ({ ...a, rule: { ...a.rule, min: 2 } })), posts, owners), []);
  assert.deepEqual(lockedTitleProblems({ me: { profile: { title: "plain" } } }, list, posts, owners), []);
});

test("quest log: only the person's books, newest first, no date shown; listed volumes in the total, web novels counted apart", () => {
  const log = questLog(posts, "me");
  assert.equal(log.done, 4);
  assert.equal(log.volumes, 21 + 7);   // listed volumes only
  assert.equal(log.web, 2);            // books that list none
  assert.equal(log.quests.length, 4);
  assert.deepEqual(log.quests.map((q) => q.slug), ["rune", "web1", "web2", "wheel"]);   // newest first, then by slug
  assert.equal(log.quests[3].volumes, 21);
  assert.equal(log.quests[1].volumes, 1);   // a card shows 1 for a book without volumes
  assert.ok(log.quests.every((q) => !("date" in q)));
  assert.deepEqual(questLog(posts, "brother"), { done: 0, volumes: 0, web: 0, quests: [] });
});

test("quest summary text, with and without web novels", () => {
  assert.equal(questSummary("zh", { done: 15, volumes: 56, web: 0 }), "完成 15 項任務 · 共 56 卷");
  assert.equal(questSummary("zh", { done: 15, volumes: 56, web: 3 }), "完成 15 項任務 · 共 56 卷 + 3 部網文");
  assert.equal(questSummary("en", { done: 1, volumes: 1, web: 0 }), "1 quest done · 1 volume");
  assert.equal(questSummary("en", { done: 5, volumes: 20, web: 1 }), "5 quests done · 20 volumes + 1 web novel");
});

test("quest paging: pages of 6, at least one page, a page is clamped", () => {
  assert.equal(QUEST_PAGE_SIZE, 6);
  assert.deepEqual([0, 1, 6, 7, 12, 13, 15].map((n) => questPageCount(n)), [1, 1, 1, 2, 2, 3, 3]);
  assert.equal(clampPage(0, 3), 1);
  assert.equal(clampPage(4, 3), 3);
  assert.equal(clampPage(2, 3), 2);
  assert.equal(clampPage(NaN, 3), 1);
  assert.equal(clampPage(1, 0), 1);
});

test("the real config shows both unlocked and locked achievements across the people", async () => {
  const { loadPosts } = await import("../scripts/load.mjs");
  const { selectPublished, todayIn } = await import("../scripts/content.mjs");
  const real = selectPublished(loadPosts(), todayIn(site.timezone)).filter((p) => p.lang === "zh");
  const all = owners.flatMap((o) => evaluateAchievements(site.achievements, real, o, "zh"));
  assert.ok(all.some((a) => a.unlocked) && all.some((a) => !a.unlocked));
  for (const o of owners) assert.ok(evaluateAchievements(site.achievements, real, o, "zh").some((a) => a.unlocked), `${o} has no unlocked achievement`);
  assert.deepEqual(lockedTitleProblems(site.gear, site.achievements, real, owners), []);
});

test("thingsOf: a toy its quantity (a wish is 0), a book its volumes (1 without; only read is 0), games 0", () => {
  assert.equal(thingsOf(toy("a", { quantity: 3 })), 3);
  assert.equal(thingsOf(toy("a", { quantity: undefined })), 1);
  assert.equal(thingsOf(toy("a", { status: "want" })), 0);
  assert.equal(thingsOf(book("a", { volumes: vols(4) })), 4);
  assert.equal(thingsOf(book("a")), 1);
  assert.equal(thingsOf(book("a", { own: false })), 0);
  assert.equal(thingsOf({ section: "games", slug: "g" }), 0);
});
