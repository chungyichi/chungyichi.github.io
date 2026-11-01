import test from "node:test";
import assert from "node:assert/strict";
import { prepare, search, normalize, inScope } from "../src/search-core.mjs";
import { buildSearchIndex, headingsOf, parsePost } from "../scripts/content.mjs";

const E = (t, s = "", h = [], d = "2026-01-01") => ({ t, s, h, d, c: "Tech", u: "/x/" });

test("normalize folds case and full-width forms", () => {
  assert.equal(normalize("Ｔech ＡＢＣ"), "tech abc");
});

test("substring matching works for Chinese without word breaks and for English", () => {
  const p = prepare([E("京都三日慢遊"), E("Kyoto in three days"), E("別的")]);
  assert.deepEqual(search(p, "三日").map((e) => e.t), ["京都三日慢遊"]);
  assert.deepEqual(search(p, "KYOTO").map((e) => e.t), ["Kyoto in three days"]);
});

test("every term must match (AND), across title, headings and summary", () => {
  const p = prepare([E("Allocator notes", "about tlsf", ["Proofs"]), E("Allocator", "about slab")]);
  assert.deepEqual(search(p, "allocator tlsf").map((e) => e.s), ["about tlsf"]);
  assert.deepEqual(search(p, "allocator proofs").length, 1);
  assert.equal(search(p, "allocator missing").length, 0);
});

test("ranking: title beats heading beats summary; ties go to the newer post", () => {
  const p = prepare([E("x", "rust here", [], "2026-03-01"), E("x", "", ["rust"], "2026-02-01"), E("rust", "", [], "2026-01-01"), E("y", "rust", [], "2026-04-01")]);
  assert.deepEqual(search(p, "rust").map((e) => e.d), ["2026-01-01", "2026-02-01", "2026-04-01", "2026-03-01"]);
});

test("an empty or blank query finds nothing, and the limit applies", () => {
  const p = prepare(Array.from({ length: 80 }, (_, i) => E(`post ${i}`)));
  assert.deepEqual(search(p, "   "), []);
  assert.equal(search(p, "post", 50).length, 50);
});

test("headingsOf returns plain text from h2-h4, decoding entities", () => {
  assert.deepEqual(headingsOf("<p>x</p><h2>A &amp; <em>B</em></h2><h3 id=\"c\">C &lt;3</h3><h5>no</h5>"), ["A & B", "C <3"]);
});

test("the index is per language and carries section title, address and headings", () => {
  const md = (name, extra = "") => parsePost(name, `---\ntitle: T ${name}\nsummary: S\n---\n## Part one\n\ntext`, undefined, "life");
  const idx = buildSearchIndex([md("2026-10-01-a.zh.md"), md("2026-10-01-a.en.md")], "zh", () => "生活");
  assert.equal(idx.length, 1);
  assert.deepEqual(idx[0], { t: "T 2026-10-01-a.zh.md", s: "S", h: ["Part one"], g: [], d: "2026-10-01", c: "生活", u: "/zh/life/a/" });
});

test("tags are searched too, and #term means tags only", () => {
  const p = prepare([{ t: "Allocator", s: "about memory", h: [], g: ["Linux", "BPF"], d: "2026-01-01" }, { t: "bpf notes", s: "", h: [], g: ["日本"], d: "2026-01-02" }]);
  assert.deepEqual(search(p, "linux").map((e) => e.t), ["Allocator"]);          // a plain word finds the tag
  assert.deepEqual(search(p, "#bpf").map((e) => e.t), ["Allocator"]);           // #bpf: only the tagged post, not the title match
  assert.deepEqual(search(p, "#日本").map((e) => e.t), ["bpf notes"]);
  assert.deepEqual(search(p, "#lin").map((e) => e.t), ["Allocator"]);
  assert.deepEqual(search(p, "#"), []);
  assert.deepEqual(search(p, "#bpf allocator").map((e) => e.t), ["Allocator"]);  // combined with a normal term
});

test("parseQuery and buildQuery round-trip tags (also tags with a space) and free text", async () => {
  const { parseQuery, buildQuery } = await import("../src/search-core.mjs");
  const q = '#日本 #"road trip" 伊吹山';
  const { tags, text } = parseQuery(q);
  assert.deepEqual(tags, ["日本", "road trip"]);
  assert.equal(text, "伊吹山");
  assert.equal(buildQuery(tags, text), q);
  assert.deepEqual(parseQuery("#a #A # x").tags, ["a"]);        // duplicates fold, a lone # is ignored
  assert.equal(buildQuery([], "  "), "");
});

test("a toy is found by its name and by its tag, and the result names the toy section", () => {
  const toy = parsePost("2026-10-21-robot.zh.md", "---\ntitle: 遙控機器人\nsummary: 會走路\ntags: 機器人, 遙控\nowner: son\nsource: https://shop.example/1\n---\n一段不進索引的內文 secretword\n", undefined, "toys");
  const idx = buildSearchIndex([toy, parsePost("2026-10-21-a.zh.md", "---\ntitle: 別的\nsummary: S\n---\nx")], "zh", (id) => (id === "toys" ? "玩具庫" : "技術"));
  const p = prepare(idx);
  assert.deepEqual(search(p, "機器人").map((e) => [e.t, e.c, e.u]), [["遙控機器人", "玩具庫", "/zh/toys/robot/"]]);
  assert.deepEqual(search(p, "#遙控").map((e) => e.t), ["遙控機器人"]);
  assert.deepEqual(search(p, "secretword"), []);                                   // body text is not indexed
  assert.ok(!JSON.stringify(idx).includes("shop.example"));   // the source stays off the index (the owner id is there as `o`, for the filter)
});

test("a quoted #tag with a space matches that tag only", async () => {
  const p = prepare([{ ...E("A"), g: ["road trip"] }, { ...E("B"), g: ["road", "trip"] }]);
  assert.deepEqual(search(p, '#"road trip"').map((e) => e.t), ["A"]);
});

test("the search scope: everything, the posts only, or the toys only; the limit counts what is in scope", () => {
  const entries = [{ ...E("T1"), u: "/zh/toys/a/" }, { ...E("P1"), u: "/zh/tech/b/" }];
  const p = prepare(entries);
  assert.deepEqual(search(p, "1", 50, (e) => inScope(e, "toys", "zh")).map((e) => e.t), ["T1"]);
  assert.deepEqual(search(p, "1", 50, (e) => inScope(e, "posts", "zh")).map((e) => e.t), ["P1"]);
  assert.equal(search(p, "1", 50, (e) => inScope(e, "all", "zh")).length, 2);
  assert.equal(inScope({ u: "/en/toys/a/" }, "toys", "zh"), false);   // another language's address is not this language's toys
});

test("search: owner and own filters combine with the keyword; a filter alone lists everything it matches, newest first", async () => {
  const { inFilter, list, SCOPES } = await import("../src/search-core.mjs");
  const e = (t, d, extra) => ({ t, s: "", h: [], g: [], d, c: "Books", u: `/zh/books/${t}/`, ...extra });
  const p = prepare([e("red-a", "2026-10-01", { o: "me" }), e("red-b", "2026-10-03", { o: "son", w: 0 }), e("blue-c", "2026-10-02", { o: "son" }), e("red-d", "2026-10-04", { o: "me", w: 0 }), { ...e("red-post", "2026-10-05"), u: "/zh/tech/red-post/" }]);
  const hits = (q, owner, own, scope = "books") => (q ? search(p, q, 50, (x) => inScope(x, scope, "zh") && inFilter(x, owner, own)) : list(p, 50, (x) => inScope(x, scope, "zh") && inFilter(x, owner, own))).map((x) => x.t);
  assert.deepEqual(hits("red", "", ""), ["red-d", "red-b", "red-a"]);
  assert.deepEqual(hits("red", "son", ""), ["red-b"]);
  assert.deepEqual(hits("red", "", "no"), ["red-d", "red-b"]);
  assert.deepEqual(hits("red", "me", "no"), ["red-d"]);
  assert.deepEqual(hits("red", "me", "yes"), ["red-a"]);
  assert.deepEqual(hits("", "son", ""), ["red-b", "blue-c"]);            // no keyword: all of that owner, newest first
  assert.deepEqual(hits("", "", "yes"), ["blue-c", "red-a"]);            // own absent = owned
  assert.deepEqual(hits("", "me", "no"), ["red-d"]);
  assert.deepEqual(hits("red", "me", "", "all"), ["red-d", "red-a"]);     // scope all: only items that have that owner, a post (no owner) drops out
  assert.deepEqual(hits("", "son", "", "posts"), []);
  assert.deepEqual(hits("", "me", "", "all"), ["red-d", "red-a"]);
  assert.deepEqual(hits("red", "nobody", "", "all"), []);
  assert.equal(list(p, 2).length, 2);                                     // the limit counts
  assert.equal(inFilter({ u: "x" }, "", ""), true);
  assert.ok(SCOPES.includes("books"));
});

test("search index: grid posts carry owner `o` and `w: 0` for own: no; other entries have neither", async () => {
  const { buildSearchIndex, parsePost } = await import("../scripts/content.mjs");
  const mk = (section, extra) => parsePost("2026-10-21-a.zh.md", `---\ntitle: T\nsummary: S\ntags: x\n${extra}---\nbody\n`, undefined, section);
  const idx = buildSearchIndex([mk("books", "owner: me\nown: no\n"), mk("books", "owner: son\n"), mk("toys", "owner: me\n"), mk("tech", "")], "zh", (s) => s);
  assert.deepEqual(idx.map((x) => [x.o, x.w]), [["me", 0], ["son", undefined], ["me", undefined], [undefined, undefined]]);
  assert.ok(!("o" in idx[3]) && !("w" in idx[3]) && !("w" in idx[1]));
});
