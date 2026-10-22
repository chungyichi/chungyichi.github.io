import test from "node:test";
import assert from "node:assert/strict";
import { prepare, search, normalize } from "../src/search-core.mjs";
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
