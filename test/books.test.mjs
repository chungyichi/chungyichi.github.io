import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePost, buildModel } from "../scripts/content.mjs";
import { buildRoutes } from "../scripts/routes.mjs";
import { site } from "../site.config.mjs";
import { buildSearchIndex } from "../scripts/content.mjs";
import { resolveAuthors, isAdultText, filterByOwn, ownPath, gridPath } from "../src/toys.mjs";
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
  const all = grids.filter((r) => !r.props.owner && !r.props.own);
  const hrefFor = (r, n) => gridPath("zh", "books", r.props.owner, r.props.own, n);
  assert.deepEqual(all.map((r) => r.path), ["/zh/books/", "/zh/books/page/2/", "/zh/books/page/3/"]);
  assert.deepEqual(all.map((r) => r.props.items.length), [48, 48, 34]);
  assert.deepEqual(all.map((r) => r.props.pages), [3, 3, 3]);
  assert.equal(new Set(all.flatMap((r) => r.props.items.map((p) => p.slug))).size, 130);              // every book once
  const me = grids.filter((r) => r.props.owner === "me" && !r.props.own), son = grids.filter((r) => r.props.owner === "son" && !r.props.own);
  assert.deepEqual([me.length, son.length], [1, 2]);                                                    // 44 and 86 books
  assert.deepEqual([me[0].props.items.length, son.map((r) => r.props.items.length)], [44, [48, 38]]);
  assert.deepEqual(all[0].props.owners, [{ id: "me", total: 44 }, { id: "son", total: 86 }]);
  for (const r of grids) {
    assert.ok(r.props.page >= 1 && r.props.page <= r.props.pages);
    for (let n = 1; n <= r.props.pages; n++) assert.ok(paths.has(hrefFor(r, n)), `page ${n} of ${r.path}`);
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

const AUTHOR = "R．A．薩爾瓦多";

test("books: an author alias is rewritten to the one spelling; several authors are each checked; an unknown one is named with the nearest known names", () => {
  for (const a of ["R.A. Salvatore", "r. a. salvatore", "薩爾瓦多", AUTHOR]) assert.equal(book("2026-10-21-a.zh.md", `summary: S\nauthor: ${a}\n`).author, AUTHOR, a);
  assert.equal(book("2026-10-21-a.zh.md", "summary: S\nauthor: 薩爾瓦多, Roald Dahl\n").author, `${AUTHOR}, Roald Dahl`);
  const r = resolveAuthors("薩爾瓦多, R.A Salvator, Nobody");
  assert.deepEqual(r.names, [AUTHOR, "R.A Salvator", "Nobody"]);
  assert.deepEqual(r.unknown.map((u) => u.name), ["R.A Salvator", "Nobody"]);                          // "R.A Salvator" is close to a known name but not equal
  assert.equal(r.unknown[0].nearest[0], AUTHOR);
});

test("books: volumes are a comma separated list; the page props and the search index carry them (and the author)", () => {
  const b = book("2026-10-21-a.zh.md", "summary: S\nowner: me\nauthor: 薩爾瓦多\nvolumes: 第一部, 第二部，第三部\n");
  assert.deepEqual(b.volumes, ["第一部", "第二部", "第三部"]);
  assert.deepEqual(book("2026-10-21-a.zh.md", "summary: S\n").volumes, []);
  assert.deepEqual(book("2026-10-21-a.zh.md", "summary: S\nvolumes: 一，二; 三，四\n").volumes, ["一，二", "三，四"]);   // a title with a comma: separate with ;
  assert.throws(() => book("2026-10-21-a.zh.md", "summary: S\nvolumes: ,\n"), /'volumes' needs 1 to/);
  assert.throws(() => book("2026-10-21-a.zh.md", "summary: S\nvolumes: 一\n", "toys"), /'volumes' is only for posts in content\/books\//);
  const routes = buildRoutes(buildModel([b], ["zh"], site.sections), {}, { langs: ["zh"] });
  assert.deepEqual(routes.find((r) => r.path === "/zh/books/a/").props.volumes, ["第一部", "第二部", "第三部"]);
  const entry = buildSearchIndex([b], "zh", () => "書庫")[0];
  assert.ok(entry.h.includes("第二部") && entry.h.includes(AUTHOR));
});

test("books: a series with 5 pictures has 5 on its page panel, one picture has 1", () => {
  const pics = (n) => Array.from({ length: n }, (_, i) => `![v${i + 1}](/media/books/a/v${i + 1}.webp)`).join("\n\n");
  for (const n of [1, 5]) {
    const b = parsePost("2026-10-21-a.zh.md", `---\ntitle: T\nsummary: S\nowner: me\n---\n${pics(n)}\n`, undefined, "books");
    const page = buildRoutes(buildModel([b], ["zh"], site.sections), {}, { langs: ["zh"] }).find((r) => r.path === "/zh/books/a/").props;
    assert.deepEqual([page.pictures.length, page.html], [n, ""]);
  }
});

test("books: own is yes or no (absent = yes), only for books", () => {
  assert.deepEqual([book("2026-10-21-a.zh.md", "summary: S\n").own, book("2026-10-21-a.zh.md", "summary: S\nown: yes\n").own, book("2026-10-21-a.zh.md", "summary: S\nown: no\n").own], [true, true, false]);
  assert.throws(() => book("2026-10-21-a.zh.md", "summary: S\nown: maybe\n"), /'own' must be one of yes, no/);
  assert.throws(() => book("2026-10-21-a.zh.md", "summary: S\nown: false\n"), /'own' must be one of yes, no/);
  assert.throws(() => book("2026-10-21-a.zh.md", "summary: S\nown: no\n", "toys"), /'own' is only for posts in content\/books\//);
});

test("books: the own filter combines with the owner: a paged page for every pair, counts follow the other filter, toys have none", () => {
  // 130 books: owner me for i%3==0, own no for i%4==0
  const posts = names(130).map((n, i) => book(n, `summary: S\nowner: ${i % 3 ? "son" : "me"}\n${i % 4 === 0 ? "own: no\n" : ""}`));
  const routes = buildRoutes(buildModel(posts, ["zh", "en"], site.sections), {}, { langs: ["zh", "en"] });
  const paths = routes.map((r) => r.path);
  const grid = (owner, own) => routes.filter((r) => r.kind === "grid" && r.lang === "zh" && r.props.section === "books" && r.props.owner === owner && r.props.own === own);
  assert.deepEqual(grid("", "no").map((r) => r.path), ["/zh/books/own/no/"]);
  assert.deepEqual(grid("", "yes").map((r) => r.path), ["/zh/books/own/yes/", "/zh/books/own/yes/page/2/", "/zh/books/own/yes/page/3/"]);
  assert.deepEqual(grid("me", "no").map((r) => r.path), ["/zh/books/owner/me/own/no/"]);
  assert.deepEqual(grid("son", "yes").map((r) => r.path), ["/zh/books/owner/son/own/yes/", "/zh/books/owner/son/own/yes/page/2/"]);
  assert.deepEqual(grid("me", "").map((r) => r.path), ["/zh/books/owner/me/"]);
  assert.ok(paths.includes("/en/books/owner/me/own/no/"));
  assert.deepEqual(grid("me", "no")[0].alternates, [{ lang: "en", path: "/en/books/owner/me/own/no/" }]);
  const meNo = grid("me", "no")[0].props;                                   // me and own no: i%12==0 -> 11 books
  assert.equal(meNo.items.length, 11);
  assert.ok(meNo.items.every((p) => p.own === false && p.owner === "me"));
  assert.deepEqual([meNo.total, meNo.ownTotal], [33, 44]);                     // owner pills count own-no books (33); the toggle counts me's books (44)
  assert.deepEqual(meNo.owners, [{ id: "me", total: 11 }, { id: "son", total: 22 }]);
  assert.deepEqual(meNo.owns, [{ id: "yes", total: 33 }, { id: "no", total: 11 }]);
  assert.equal(routes.find((r) => r.kind === "post" && r.lang === "zh" && r.props.slug === "b0").props.own, false);
  assert.ok(!paths.some((p) => p.startsWith("/zh/toys/own/") || p.includes("/zh/toys/owner/me/own/")));
  assert.equal(ownPath("zh", "books", "no", 2), "/zh/books/own/no/page/2/");
  assert.equal(gridPath("zh", "books", "me", "no", 2), "/zh/books/owner/me/own/no/page/2/");
  assert.deepEqual([gridPath("zh", "books", "", "", 1), gridPath("en", "books", "son", "", 3), gridPath("zh", "books", "", "yes")], ["/zh/books/", "/en/books/owner/son/page/3/", "/zh/books/own/yes/"]);
  assert.equal(filterByOwn(posts, "").length, 130);
});

test("books: adult text-only rule applies to own: no with the tag 成人", () => {
  const mk = (extra, tags = "成人") => parsePost("2026-10-21-a.zh.md", `---\ntitle: T\nsummary: S\ntags: ${tags}\n${extra}---\nx\n`, undefined, "books");
  assert.equal(isAdultText(mk("own: no\n")), true);
  assert.equal(isAdultText(mk("")), false);
  assert.equal(isAdultText(mk("own: no\n", "小說")), false);
});
