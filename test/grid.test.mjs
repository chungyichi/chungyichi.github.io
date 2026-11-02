import test from "node:test";
import assert from "node:assert/strict";
import { gridOf } from "../src/toys.mjs";
import { entriesOfSection, pageOf, parseFilters, writeFilters, parseGridState, gridHref, gridView, parseTagState, tagCounts, tagView, briefOfEntry, groupByDate } from "../src/grid-core.mjs";
import { tagPath } from "../src/tags.mjs";

// 130 books: owner me for i%3==0, own no for i%4==0, comic for i%5==0
const books = Array.from({ length: 130 }, (_, i) => ({
  t: `B${i}`, s: "S", h: [], g: i % 2 ? ["書", "Road Trip"] : ["書"], d: `2026-10-${String(1 + (i % 28)).padStart(2, "0")}`, c: "Books", u: `/zh/books/b${i}/`,
  o: i % 3 ? "son" : "me", ...(i % 4 === 0 ? { w: 0 } : {}), ...(i % 5 === 0 ? { ty: "comic" } : {}),
}));
const grid = gridOf("books");
const section = entriesOfSection([...books, { t: "x", s: "", h: [], d: "2026-11-01", c: "T", u: "/zh/tech/x/" }, { ...books[0], u: "/en/books/b0/" }], "zh", "books");

test("a section is its own language's entries, newest first", () => {
  assert.equal(section.length, 130);
  assert.ok(section.every((e, i) => i === 0 || section[i - 1].d >= e.d));
});

test("paging: 130 books are 48, 48, 34; a page out of range is clamped", () => {
  const sizes = [1, 2, 3].map((n) => gridView(section, grid, { page: n }).items.length);
  assert.deepEqual(sizes, [48, 48, 34]);
  assert.deepEqual([pageOf(section, 9, 48).page, pageOf(section, 0, 48).page, pageOf([], 1, 48).pages], [3, 1, 1]);
  const seen = [1, 2, 3].flatMap((n) => gridView(section, grid, { page: n }).items.map((e) => e.u));
  assert.equal(new Set(seen).size, 130);                                                   // every book once
});

test("counts: owner buttons follow the facets, each facet follows the owner and the other facets", () => {
  const all = gridView(section, grid, {});
  assert.deepEqual([all.total, all.matched, all.owners], [130, 130, [{ id: "me", total: 44 }, { id: "son", total: 86 }]]);
  const meNo = gridView(section, grid, { owner: "me", filters: { own: "no" } });
  assert.equal(meNo.matched, 11);                                                           // i%12==0
  assert.ok(meNo.items.every((e) => e.o === "me" && e.w === 0));
  assert.deepEqual([meNo.total, meNo.owners], [33, [{ id: "me", total: 11 }, { id: "son", total: 22 }]]);   // the pills count own-no books
  const own = meNo.facets.find((f) => f.id === "own");
  assert.deepEqual([own.total, own.values], [44, [{ id: "yes", total: 33 }, { id: "no", total: 11 }]]);    // the toggle counts me's books
  const type = meNo.facets.find((f) => f.id === "type");
  assert.equal(type.total, 11);                                                             // the type tabs keep the own choice
  assert.equal(type.values.reduce((n, v) => n + v.total, 0), 11);                           // novel + comic
});

test("combinations: type, own and owner together; an empty combination has no items and one page", () => {
  const v = gridView(section, grid, { owner: "me", filters: { own: "no", type: "comic" } });
  assert.deepEqual(v.items.map((e) => e.t), section.filter((e) => e.o === "me" && e.w === 0 && e.ty === "comic").map((e) => e.t));
  const none = gridView(section, grid, { owner: "me", filters: { type: "comic", own: "no" } });
  assert.deepEqual([none.matched === v.matched], [true]);                                   // the order of the filters does not matter
  const nobody = gridView(section.filter((e) => e.o === "me"), grid, { owner: "son" });
  assert.deepEqual([nobody.items.length, nobody.pages, nobody.page], [0, 1, 1]);
});

test("games have no owners and no status: the platform tabs are the only filter", () => {
  const games = [{ pf: ["steam", "ps"] }, { pf: ["ps"] }, { pf: ["ns"] }].map((x, i) => ({ t: `G${i}`, s: "", h: [], d: `2026-10-0${i + 1}`, c: "G", u: `/zh/games/g${i}/`, ...x }));
  const g = gridOf("games"); games.reverse();   // newest first, as entriesOfSection gives
  const v = gridView(games, g, { filters: { platform: "ps" } });
  assert.deepEqual([v.items.map((e) => e.t), v.owners, v.facets.map((f) => f.id)], [["G1", "G0"], [], ["platform"]]);
  assert.deepEqual(v.facets[0].values, [{ id: "steam", total: 1 }, { id: "ns", total: 1 }, { id: "ps", total: 2 }, { id: "other", total: 0 }]);
  assert.deepEqual(parseFilters("owner=me&platform=ps", g), { owner: "", filters: { platform: "ps" } });   // an owner no grid has is ignored
});

test("query parsing and building: only chosen filters are in the address, and it round-trips", () => {
  const path = "/zh/books/";
  assert.equal(gridHref(path, {}), "/zh/books/");
  assert.equal(gridHref(path, { owner: "me", filters: { own: "no", type: "" }, page: 1 }), "/zh/books/?owner=me&own=no");
  assert.equal(gridHref(path, { owner: "", filters: { type: "comic", own: "no" }, page: 3 }), "/zh/books/?own=no&type=comic&page=3");
  for (const state of [{ owner: "", filters: {}, page: 1 }, { owner: "son", filters: { own: "yes" }, page: 2 }, { owner: "me", filters: { own: "no", type: "comic" }, page: 1 }]) {
    const href = gridHref(path, state);
    assert.deepEqual(parseGridState(href.split("?")[1] ?? "", grid), state);
  }
  assert.deepEqual(parseGridState("owner=nobody&own=maybe&type=comic&platform=ps&page=abc", grid), { owner: "", filters: { type: "comic" }, page: 1 });   // junk and foreign facets are dropped
  assert.equal(parseGridState("page=0", grid).page, 1);
  assert.equal(parseGridState("page=-4", grid).page, 1);
  assert.equal(parseGridState("page=7", grid).page, 7);
  const p = new URLSearchParams("q=x&owner=me&own=no");                                      // the search page shares the owner and facet names
  assert.equal(writeFilters(p, "son", { type: "comic" }).toString(), "q=x&owner=son&type=comic");
});

test("the tag page: tags are counted, matched like their slugs, newest first, paged; the address round-trips", () => {
  const counts = tagCounts(books);
  assert.deepEqual(counts.map((c) => [c.tag, c.count]), [["書", 130], ["Road Trip", 65]]);
  const v = tagView(books, "road trip", 1, 10);                                             // case and spaces fold
  assert.deepEqual([v.matched, v.pages, v.items.length], [65, 7, 10]);
  assert.ok(v.items.every((e) => e.g.includes("Road Trip")));
  assert.equal(tagView(books, "Road Trip", 7, 10).items.length, 5);
  assert.equal(tagView(books, "none", 1, 10).matched, 0);
  assert.deepEqual(parseTagState("tag=%E6%97%A5%E6%9C%AC&page=2"), { tag: "日本", page: 2 });
  assert.deepEqual(parseTagState(tagPath("en", "road trip", 3).split("?")[1]), { tag: "road trip", page: 3 });
  assert.deepEqual(parseTagState(""), { tag: "", page: 1 });
  assert.equal(tagPath("zh", "書"), "/zh/tags/?tag=%E6%9B%B8");
});

test("an entry becomes the card's list item; a post list is grouped by date", () => {
  const b = briefOfEntry({ t: "Dune", s: "S", h: [], g: ["書"], d: "2026-10-01", c: "Books", u: "/zh/books/dune/", o: "me", w: 0, ty: "comic", a: "A", q: 2, im: 3 });
  assert.deepEqual([b.section, b.slug, b.title, b.owner, b.own, b.type, b.author, b.quantity, b.card, b.thumb, b.status],
    ["books", "dune", "Dune", "me", false, "comic", "A", 2, "/media/books/dune/card.webp", "/media/books/dune/thumb.webp", ""]);
  const plain = briefOfEntry({ t: "T", s: "", h: [], d: "2026-10-01", c: "Toys", u: "/en/toys/car/", st: 1 });
  assert.deepEqual([plain.own, plain.status, plain.quantity, plain.card, plain.thumb, plain.platform, plain.tags], [true, "want", 1, "", "", [], []]);
  assert.deepEqual(groupByDate([{ date: "b" }, { date: "b" }, { date: "a" }]).map((g) => [g.date, g.items.length]), [["b", 2], ["a", 1]]);
});
