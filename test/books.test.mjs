import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePost, buildModel } from "../scripts/content.mjs";
import { buildRoutes } from "../scripts/routes.mjs";
import { site } from "../site.config.mjs";
import { inScope, SCOPES } from "../src/search-core.mjs";

const book = (name, extra, section = "books") => parsePost(name, `---\ntitle: Book ${name}\ntags: 書\n${extra}---\nx\n`, undefined, section);
const names = (n) => Array.from({ length: n }, (_, i) => `2026-10-${String(1 + (i % 28)).padStart(2, "0")}-b${i}.zh.md`);

test("books: owner, author and source are read; the author line stands in for an empty summary; price is for toys only", () => {
  const b = book("2026-10-21-a.zh.md", "owner: son\nauthor: Roald Dahl\nsource: https://shop.example/1\n");
  assert.deepEqual([b.owner, b.author, b.summary, b.source], ["son", "Roald Dahl", "Roald Dahl", "https://shop.example/1"]);
  assert.equal(book("2026-10-21-a.zh.md", "summary: Funny\nauthor: X\n").summary, "Funny");
  assert.throws(() => book("2026-10-21-a.zh.md", "owner: me\n"), /'summary' is required/);               // no summary, no author: still refused when published
  assert.throws(() => book("2026-10-21-a.zh.md", "summary: S\nprice: \"1\"\n"), /'price' is only for posts in content\/toys\//);
  assert.throws(() => book("2026-10-21-a.zh.md", "summary: S\nstatus: want\n"), /'status' is only for posts in content\/toys\//);
  assert.throws(() => book("2026-10-21-a.zh.md", "summary: S\nauthor: X\n", "toys"), /'author' is only for posts in content\/books\//);
});

test("books: 130 books make 3 pages of 48, 48 and 34; every owner has its own pages; the pager links exist", () => {
  const posts = names(130).map((n, i) => book(n, `summary: S\nowner: ${i % 3 ? "son" : "me"}\n`));
  const routes = buildRoutes(buildModel(posts, ["zh", "en"], site.sections), {}, { langs: ["zh"] });
  const grids = routes.filter((r) => r.kind === "grid" && r.props.section === "books");
  const paths = new Set(routes.map((r) => r.path));
  const all = grids.filter((r) => !r.props.owner);
  assert.deepEqual(all.map((r) => r.path), ["/zh/books/", "/zh/books/page/2/", "/zh/books/page/3/"]);
  assert.deepEqual(all.map((r) => r.props.items.length), [48, 48, 34]);
  assert.deepEqual(all.map((r) => r.props.pages), [3, 3, 3]);
  assert.equal(new Set(all.flatMap((r) => r.props.items.map((p) => p.slug))).size, 130);              // every book once
  const me = grids.filter((r) => r.props.owner === "me"), son = grids.filter((r) => r.props.owner === "son");
  assert.deepEqual([me.length, son.length], [1, 2]);                                                    // 44 and 86 books
  assert.deepEqual([me[0].props.items.length, son.map((r) => r.props.items.length)], [44, [48, 38]]);
  assert.deepEqual(all[0].props.owners, [{ id: "me", total: 44 }, { id: "son", total: 86 }]);
  for (const r of grids) {
    assert.ok(r.props.page >= 1 && r.props.page <= r.props.pages);
    for (let n = 1; n <= r.props.pages; n++) assert.ok(paths.has(r.props.owner ? `/zh/books/owner/${r.props.owner}/${n > 1 ? `page/${n}/` : ""}` : n > 1 ? `/zh/books/page/${n}/` : "/zh/books/"), `page ${n} of ${r.path}`);
    for (const p of r.props.items) assert.ok(paths.has(`/zh/books/${p.slug}/`));                          // a card opens an existing page
  }
  assert.equal(routes.filter((r) => r.kind === "grid" && r.props.section === "toys").length, 1 + 3);   // the toys grids are still there, empty: all + three owners
});

test("books: a book page has the picture panel; search has a books scope next to toys", () => {
  const b = book("2026-10-21-a.zh.md", "summary: S\nowner: me\n");
  const routes = buildRoutes(buildModel([b], ["zh"], site.sections), {}, { langs: ["zh"], fileExists: (u) => u === "/media/books/a/cover.webp" });
  const page = routes.find((r) => r.path === "/zh/books/a/");
  assert.deepEqual(page.props.pictures, [{ src: "/media/books/a/cover.webp", alt: "Book 2026-10-21-a.zh.md" }]);
  assert.deepEqual(SCOPES, ["all", "posts", "toys", "books"]);
  assert.equal(inScope({ u: "/zh/books/a/" }, "books", "zh"), true);
  assert.equal(inScope({ u: "/zh/books/a/" }, "toys", "zh"), false);
  assert.equal(inScope({ u: "/zh/books/a/" }, "posts", "zh"), false);
  assert.equal(inScope({ u: "/zh/tech/a/" }, "posts", "zh"), true);
});
