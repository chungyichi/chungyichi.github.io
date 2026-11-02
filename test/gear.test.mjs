import test from "node:test";
import assert from "node:assert/strict";
import { figureOf, figureFramesOf, figureMsOf, frameIndexAt, mirror, FIGURE_OWNERS, FIGURE_COLS } from "../src/gearfigure.mjs";
import { sharkPose, sharkBounds, sharkLength, NODES } from "../src/sharkfx/sharkpose.mjs";
import { site } from "../site.config.mjs";
import { overviewWords, overviewMode, shortTitle, OVERVIEW_MAX, OVERVIEW_MODES, LABEL_WIDTH, SLOTS, SLOT_IDS, RARITIES, DEFAULT_RARITY, validateGear, resolveGear, filledSets, rarityOf, slotName, rarityName, dialogData, GEAR_SECTIONS } from "../src/gear.mjs";

const owners = ["me", "son", "brother"];
const post = (section, slug) => ({ section, slug, title: `T-${slug}`, summary: "S", tags: ["a"], date: "2026-11-01" });
const posts = [post("toys", "robot"), post("books", "wheel"), post("toys", "bottle"), post("games", "elden")];
const itemOf = (p) => ({ section: p.section, slug: p.slug, title: p.title });
const published = ["toys/robot", "books/wheel", "toys/bottle", "games/elden"];

test("the sheet has 8 + 8 slots and two hands, unique ids, six rarities", () => {
  assert.equal(SLOTS.filter((s) => s.area === "left").length, 8);
  assert.equal(SLOTS.filter((s) => s.area === "right").length, 8);
  assert.deepEqual(SLOTS.filter((s) => s.area === "bottom").map((s) => s.id), ["mainhand", "offhand"]);
  assert.equal(new Set(SLOT_IDS).size, SLOT_IDS.length);
  assert.deepEqual(RARITIES.map((r) => r.id), ["poor", "common", "uncommon", "rare", "epic", "legendary"]);
  assert.equal(slotName("zh", "head"), "頭");
  assert.equal(slotName("en", "mainhand"), "Main hand");
  assert.equal(rarityName("zh", "epic"), "史詩");
});

test("resolve: every owner, every slot in sheet order, empty ones included, default rarity", () => {
  const gear = { son: { offhand: { item: "toys/bottle" }, head: { item: "toys/robot", rarity: "epic" } } };
  const sets = resolveGear(gear, posts, owners, itemOf);
  assert.deepEqual(sets.map((s) => s.owner), owners);
  for (const s of sets) assert.deepEqual(s.slots.map((x) => x.slot), SLOT_IDS);
  const son = sets[1];
  assert.equal(son.filled, 2);
  assert.deepEqual(son.slots[0], { slot: "head", rarity: "epic", item: { section: "toys", slug: "robot", title: "T-robot" } });
  assert.equal(son.slots.at(-1).rarity, DEFAULT_RARITY);
  assert.equal(son.slots.at(-1).item.slug, "bottle");
  assert.equal(son.slots[1].item, null);
  assert.equal(sets[0].filled, 0);
});

test("resolve: an unknown slot is ignored, an unknown rarity is the default, an item missing in this language is empty", () => {
  const gear = { me: { tail: { item: "toys/robot" }, head: { item: "toys/robot", rarity: "mythic" }, neck: { item: "toys/gone" }, chest: { item: 5 } } };
  const [me] = resolveGear(gear, posts, ["me"], itemOf);
  assert.equal(me.filled, 1);
  assert.equal(me.slots[0].rarity, DEFAULT_RARITY);
  assert.equal(me.slots[1].item, null);
  assert.equal(me.slots.length, SLOTS.length);
  assert.equal(rarityOf("legendary"), "legendary");
  assert.equal(rarityOf(undefined), DEFAULT_RARITY);
  assert.deepEqual(resolveGear(undefined, posts, ["me"], itemOf)[0].filled, 0);
  // a person in the config that the grids do not know is not part of the sheets
  assert.deepEqual(resolveGear({ cat: { head: { item: "toys/robot" } } }, posts, owners, itemOf).map((s) => s.owner), owners);
});

test("home block: only the people with items are shown (none = the block is hidden)", () => {
  assert.deepEqual(filledSets(resolveGear({}, posts, owners, itemOf)), []);
  const some = resolveGear({ brother: { head: { item: "toys/robot" } } }, posts, owners, itemOf);
  assert.deepEqual(filledSets(some).map((s) => s.owner), ["brother"]);
  // all three sheets keep all 18 slots even when the person has one item
  assert.equal(some[0].slots.length, 18);
});

test("validate: a good config has no problems", () => {
  const gear = { me: { head: { item: "toys/robot", rarity: "epic" }, mainhand: { item: "games/elden" } }, son: { head: { item: "toys/robot" } } };
  assert.deepEqual(validateGear(gear, { owners, published }), []);
  assert.deepEqual(validateGear(undefined, { owners, published }), []);
  assert.deepEqual(validateGear({}, { owners, published }), []);
});

test("validate: unknown slot, rarity, person, unpublished item, wrong section, same item twice", () => {
  const msgs = validateGear({
    me: { tail: { item: "toys/robot" }, head: { item: "toys/robot", rarity: "mythic" }, neck: { item: "toys/ghost" }, chest: { item: "tech/post" }, back: { item: "toys/bottle" }, wrist: { item: "toys/bottle" }, hands: {} },
    cat: { head: { item: "toys/robot" } },
  }, { owners, published });
  const has = (re) => assert.ok(msgs.some((m) => re.test(m)), `${re} in:\n${msgs.join("\n")}`);
  has(/gear\.me\.tail: unknown slot 'tail'/);
  has(/gear\.me\.head: unknown rarity 'mythic'/);
  has(/gear\.me\.neck: item 'toys\/ghost' is not a published post/);
  has(/gear\.me\.chest: item 'tech\/post' must look like toys\/<slug> or games\/<slug>/);
  has(/gear\.me\.wrist: item 'toys\/bottle' is already in slot 'back'/);
  has(/gear\.me\.hands: needs \{ item/);
  has(/unknown person 'cat'/);
  assert.equal(msgs.length, 6 + 1);
});

test("validate: the same item for two different people is fine", () => {
  assert.deepEqual(validateGear({ me: { head: { item: "toys/robot" } }, son: { head: { item: "toys/robot" } } }, { owners, published }), []);
});

test("the real site.config.mjs gear only uses known slots, rarities and owners (items are checked against the content by npm run check)", () => {
  const gear = site.gear ?? {};
  const fake = Object.values(gear).flatMap((slots) => Object.entries(slots).filter(([k]) => k !== "profile").map(([, e]) => e.item));
  assert.deepEqual(validateGear(gear, { owners, published: fake, achievementIds: (site.achievements ?? []).map((a) => a.id) }), []);
});

test("every person has all 18 slots in the same order (empty ones are placeholders); a profile is not a slot", () => {
  const gear = { me: { profile: { level: 2 }, head: { item: "toys/robot" } } };
  const sets = resolveGear(gear, posts, owners, itemOf);
  for (const s of sets) assert.deepEqual(s.slots.map((x) => x.slot), SLOT_IDS);
  assert.equal(SLOT_IDS.length, 18);
  assert.equal(sets[0].filled, 1);
  assert.deepEqual(validateGear(gear, { owners, published }), []);
  assert.ok(validateGear({ me: { profile: { level: 0 } } }, { owners, published }).some((m) => /gear\.me\.profile\.level/.test(m)));
});

test("a book cannot be equipped: only toys and games are accepted, with a clear message", () => {
  assert.deepEqual(GEAR_SECTIONS, ["toys", "games"]);
  const msgs = validateGear({ me: { mainhand: { item: "books/wheel" }, head: { item: "games/elden" } } }, { owners, published });
  assert.equal(msgs.length, 1);
  assert.match(msgs[0], /gear\.me\.mainhand: 'books\/wheel' is a book; a book cannot be equipped \(only toys and games\)/);
  // a book is refused even when it does not exist
  assert.equal(validateGear({ me: { head: { item: "books/nothing" } } }, { owners, published }).length, 1);
});

test("the real config has no book, and every person keeps their toys; the dialog data of a slot is small and complete", () => {
  for (const [who, slots] of Object.entries(site.gear)) if (who !== "overview") for (const [k, e] of Object.entries(slots)) if (k !== "profile") assert.match(e.item, /^(toys|games)\//);
  const [son] = resolveGear({ son: { head: { item: "toys/robot", rarity: "epic" } } }, [{ ...post("toys", "robot"), summary: "A robot", tags: ["a", "b", "c", "d", "e"], pic: "/media/toys/robot/card.webp" }], ["son"], (p) => ({ section: p.section, slug: p.slug, title: p.title, summary: p.summary, tags: p.tags, date: p.date, pic: p.pic }));
  const data = dialogData("zh", son.slots[0], "/zh/toys/robot/");
  assert.deepEqual(data, { title: "T-robot", rarity: "epic", rarityName: "史詩", slotName: "頭", summary: "A robot", tags: ["a", "b", "c", "d"], date: "2026-11-01", pic: "/media/toys/robot/card.webp", href: "/zh/toys/robot/" });
  assert.equal(dialogData("en", son.slots[0], "/en/toys/robot/").rarityName, "Epic");
  assert.ok(JSON.stringify(data).length < 600);
});

// ---- the overview: the word cloud with the stick figure ----
const fmt = { href: (it) => `/zh/${it.section}/${it.slug}/`, level: (n) => `Lv.${n}` };
const setOf = (slots, extra = {}) => ({ owner: "me", filled: slots.filter((s) => s.item).length, slots, profile: { level: 0, title: "", mood: { text: "", icon: "" } }, achievements: [], log: { done: 0, volumes: 0, web: 0, quests: [] }, ...extra });
const slotOf = (slot, rarity, title, slug = slot) => ({ slot, rarity, item: { section: "toys", slug, title } });

test("overview items: the rarest first, then in slot order; count = rarity rank, tone, ref and the link to the item", () => {
  const set = setOf([slotOf("head", "rare", "Rare head"), slotOf("neck", "legendary", "Legend neck"), { slot: "chest", rarity: "rare", item: null }, slotOf("legs", "rare", "Rare legs"), slotOf("feet", "poor", "Poor feet")]);
  const w = overviewWords(set, "items", fmt);
  assert.deepEqual(w.map((x) => x.ref), ["neck", "head", "legs", "feet"]);
  assert.deepEqual(w.map((x) => x.count), [6, 4, 4, 1]);
  assert.deepEqual(w[0], { label: "Legend neck", count: 6, percent: 0, title: "Legend neck", href: "/zh/toys/neck/", ref: "neck", tone: "legendary" });
  assert.ok(w.every((x) => !x.plain));
  assert.deepEqual(overviewWords(set, "items", fmt), w);   // deterministic
});

test("overview items: at most OVERVIEW_MAX (18) words, and the weakest are the ones dropped", () => {
  assert.equal(OVERVIEW_MAX, 18);
  const slots = SLOT_IDS.map((id, i) => slotOf(id, RARITIES[i % 6].id, `Item ${i}`));
  const w = overviewWords(setOf(slots), "items", fmt);
  assert.equal(w.length, 18);
  for (let i = 1; i < w.length; i++) assert.ok(w[i - 1].count >= w[i].count);
  const many = overviewWords(setOf([...slots, ...slots.map((s) => ({ ...s, slot: s.slot + "x" }))]), "items", fmt);
  assert.equal(many.length, 18);
  assert.ok(many.every((x) => x.count >= 1));
});

test("overview: a person with no items has no words (the page shows the figure alone); title mode too when nothing is set", () => {
  const empty = setOf(SLOT_IDS.map((slot) => ({ slot, rarity: "rare", item: null })));
  assert.deepEqual(overviewWords(empty, "items", fmt), []);
  assert.deepEqual(overviewWords(empty, "title", fmt), []);
});

test("overview title mode: title, level, mood and the unlocked achievements as plain words, the weight falling with the order", () => {
  const set = setOf([slotOf("head", "epic", "Robot")], { profile: { level: 12, title: "Weaver of Time", mood: { text: "Feeling good", icon: "🙂" } },
    achievements: [{ name: "Done", unlocked: true }, { name: "Locked one", unlocked: false }, { name: "Collector", unlocked: true }] });
  const w = overviewWords(set, "title", fmt);
  assert.deepEqual(w.map((x) => x.label), ["Weaver of Time", "Lv.12", "🙂 Feeling good", "Done", "Collector"]);
  assert.deepEqual(w.map((x) => x.count), [5, 4, 3, 2, 1]);
  assert.ok(w.every((x) => x.plain && !x.href && !x.ref && !x.tone));
  assert.ok(!w.some((x) => x.label === "Robot" || x.label === "Locked one"));
  const long = setOf([], { achievements: Array.from({ length: 30 }, (_, i) => ({ name: `A${i}`, unlocked: true })) });
  assert.equal(overviewWords(long, "title", fmt).length, OVERVIEW_MAX);
  // a missing level or mood is just not a word
  assert.deepEqual(overviewWords(setOf([], { profile: { level: 0, title: "Solo", mood: { text: "", icon: "" } } }), "title", fmt).map((x) => x.label), ["Solo"]);
});

test("shortTitle: cuts to about 10 characters (CJK 1, Latin 0.6), before a subtitle, at a space, with an ellipsis; short ones stay", () => {
  assert.equal(LABEL_WIDTH, 10);
  assert.equal(shortTitle("超合金 佛朗基將軍"), "超合金 佛朗基將軍");
  assert.equal(shortTitle("MAYDAY MAX｜25TH ANNIVERSARY 五月天究極合體｜25週年紀念"), "MAYDAY MAX");
  assert.equal(shortTitle("迪士尼美語世界 Playmate Air 語言學習機"), "迪士尼美語世界…");
  assert.equal(shortTitle("Microsoft Flight Simulator 2020"), "Microsoft Flight…");
  assert.equal(shortTitle("一二三四五六七八九十十一"), "一二三四五六七八九十…");
  assert.equal(shortTitle(""), "");
  for (const t of ["香港迪士尼 CookieAnn 火車爆米花桶", "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "超合金 佛朗基將軍 超長的名字還有更多更多"]) assert.ok([...shortTitle(t)].length <= 18, t);
  // the subtitle mark must leave a real label
  assert.equal(shortTitle("A｜BCDEF"), "A｜BCDEF");
});

test("overview mode: only \"title\" switches; the config validates it and it is not a person", () => {
  assert.deepEqual(OVERVIEW_MODES, ["items", "title"]);
  assert.equal(overviewMode({ overview: "title" }), "title");
  assert.equal(overviewMode({ overview: "items" }), "items");
  assert.equal(overviewMode({}), "items"); assert.equal(overviewMode(undefined), "items"); assert.equal(overviewMode({ overview: "x" }), "items");
  assert.deepEqual(validateGear({ overview: "title", me: { head: { item: "toys/robot" } } }, { owners, published }), []);
  assert.match(validateGear({ overview: "cloud" }, { owners, published })[0], /gear\.overview must be one of "items", "title"/);
  assert.equal(overviewMode(site.gear), "items");
  assert.deepEqual(validateGear(site.gear, { owners, published: [...published, ...Object.values(site.gear).flatMap((p) => Object.values(p ?? {}).map((e) => e?.item).filter(Boolean))], achievementIds: site.achievements.map((a) => a.id) }), []);
});

test("the figures: 5-9 lines, at most 19 columns, printable ASCII only, one per person and they differ", () => {
  assert.deepEqual(FIGURE_OWNERS.sort(), ["brother", "me", "son"]);
  assert.equal(FIGURE_COLS, 19);
  const seen = new Set();
  for (const who of [...FIGURE_OWNERS, "unknown"]) {
    const art = figureOf(who), lines = art.split("\n");
    assert.ok(lines.length >= 5 && lines.length <= 9, `${who}: ${lines.length} lines`);
    for (const l of lines) { assert.ok(l.length <= FIGURE_COLS, `${who}: '${l}' is ${l.length} wide`); assert.match(l, /^[\x20-\x7e]*$/); assert.equal(l, l.trimEnd(), "no trailing spaces"); }
    assert.ok(lines.some((l) => l.trim()), "not blank");
    seen.add(art);
  }
  assert.equal(seen.size, 3);   // me, son, brother differ; an unknown person gets the figure of "me"
  assert.equal(figureOf("unknown"), figureOf("me"));
});

test("the figure frames: same number of lines, ASCII only, at most 19 columns, no trailing spaces; frame 0 is figureOf; me and son move", () => {
  for (const who of FIGURE_OWNERS) {
    const frames = figureFramesOf(who).map((f) => f.split("\n"));
    assert.equal(figureFramesOf(who)[0], figureOf(who));
    if (who !== "brother") assert.ok(frames.length >= 4, `${who}: ${frames.length} frames`);
    for (const f of frames) {
      assert.equal(f.length, frames[0].length, `${who}: same height`);
      for (const l of f) { assert.ok(l.length <= FIGURE_COLS, `${who}: '${l}'`); assert.match(l, /^[\x20-\x7e]*$/); assert.equal(l, l.trimEnd()); }
    }
    assert.equal(new Set(figureFramesOf(who)).size > 1, who !== "brother", `${who}: frames differ`);
  }
  // the hero: legs and sword differ between neighbouring frames, he turns round (a mirrored frame appears) and he stays inside the 19 columns
  const me = figureFramesOf("me");
  for (let i = 0; i < me.length; i++) assert.notEqual(me[i], me[(i + 1) % me.length], "every step is a new picture");
  assert.ok(me.some((f) => f.includes("-----*")), "a slash with a spark");
  assert.deepEqual(mirror(["/ \\ (a"], 8), ["  a) / \\"]);   // reversed, and the glyphs that point a way are swapped
});

test("which frame is on show: timing per person, a loop, reduced motion and the shark stay on frame 0", () => {
  assert.notEqual(figureMsOf("me"), figureMsOf("son"));
  assert.ok(figureMsOf("me") >= 150 && figureMsOf("me") <= 200);
  for (const who of ["me", "son"]) {
    const n = figureFramesOf(who).length, ms = figureMsOf(who);
    assert.equal(frameIndexAt(who, 0), 0); assert.equal(frameIndexAt(who, ms - 1), 0); assert.equal(frameIndexAt(who, ms), 1);
    assert.equal(frameIndexAt(who, ms * n), 0); assert.equal(frameIndexAt(who, ms * (n + 2) + 1), 2);
    assert.equal(frameIndexAt(who, ms * 3, true), 0); assert.equal(frameIndexAt(who, -5), 0); assert.equal(frameIndexAt(who, NaN), 0);
  }
  assert.equal(figureMsOf("brother"), 0); assert.equal(frameIndexAt("brother", 5000), 0);
  assert.equal(frameIndexAt("unknown", figureMsOf("me")), 1);   // an unknown person is "me"
});

test("the swimming shark stays inside its box (spine and fins), keeps its length, and really moves", () => {
  for (const [w, h] of [[146, 99], [100, 60], [200, 200], [60, 90]]) {
    const L = sharkLength(w, h);
    assert.ok(L <= w * 0.86 + 1e-9);
    let moved = 0, prev = null;
    for (let t = 0; t < 120; t += 0.37) {
      const p = sharkPose(t, w, h), b = sharkBounds(p);
      assert.equal(p.nodes.length, NODES * 2); assert.equal(p.length, L);
      assert.ok(b.x0 >= -1e-6 && b.x1 <= w + 1e-6 && b.y0 >= -1e-6 && b.y1 <= h + 1e-6, `${w}x${h} t=${t}: ${JSON.stringify(b)}`);
      assert.ok(p.nodes.every(Number.isFinite));
      if (prev && Math.hypot(p.nodes[0] - prev[0], p.nodes[1] - prev[1]) > 0.05) moved++;
      prev = [p.nodes[0], p.nodes[1]];
    }
    assert.ok(moved > 100, "it drifts");
  }
});
