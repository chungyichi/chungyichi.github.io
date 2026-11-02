import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePost, buildModel } from "../scripts/content.mjs";
import { buildRoutes } from "../scripts/routes.mjs";
import { site } from "../site.config.mjs";
import { buildSearchIndex } from "../scripts/content.mjs";
import { resolveAuthors, isAdultText } from "../src/toys.mjs";
import { inScope, SCOPES } from "../src/search-core.mjs";
import { gridView } from "../src/grid-core.mjs";
import { gridOf } from "../src/toys.mjs";

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

test("books: 130 books are ONE grid route with every book once; the first page has 48 cards, 3 pages in all", () => {
  const posts = names(130).map((n, i) => book(n, `summary: S\nowner: ${i % 3 ? "son" : "me"}\n`));
  const routes = buildRoutes(buildModel(posts, ["zh", "en"], site.sections), {}, { langs: ["zh"] });
  const grids = routes.filter((r) => r.kind === "grid" && r.props.section === "books");
  assert.deepEqual(grids.map((r) => r.path), ["/zh/books/"]);
  const entries = grids[0].props.entries;
  assert.equal(new Set(entries.map((e) => e.u)).size, 130);
  const v = gridView(entries, gridOf("books"), { page: 1 });
  assert.deepEqual([v.items.length, v.pages, v.owners], [48, 3, [{ id: "me", total: 44 }, { id: "son", total: 86 }]]);
  const paths = new Set(routes.map((r) => r.path));
  for (const e of entries) assert.ok(paths.has(e.u));                                                   // a card opens an existing page
  assert.equal(routes.filter((r) => r.kind === "grid" && r.props.section === "toys").length, 1);        // the toys grid is still there, empty
});

test("books: a book page has the picture panel; search has a books scope next to toys", () => {
  const b = book("2026-10-21-a.zh.md", "summary: S\nowner: me\n");
  const routes = buildRoutes(buildModel([b], ["zh"], site.sections), {}, { langs: ["zh"], fileExists: (u) => u === "/media/books/a/cover.webp" });
  const page = routes.find((r) => r.path === "/zh/books/a/");
  assert.deepEqual(page.props.pictures, [{ src: "/media/books/a/cover.webp", alt: "Book 2026-10-21-a.zh.md" }]);
  assert.deepEqual(SCOPES, ["all", "posts", "toys", "books", "games"]);
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

test("books: own and type are in the data file (w: 0 for read only, ty: comic), toys have none", () => {
  const posts = names(8).map((n, i) => book(n, `summary: S\nowner: ${i % 2 ? "son" : "me"}\n${i % 4 === 0 ? "own: no\n" : ""}${i % 3 === 0 ? "type: 漫畫\n" : ""}`));
  const entries = buildRoutes(buildModel(posts, ["zh"], site.sections), {}, { langs: ["zh"] }).find((r) => r.path === "/zh/books/").props.entries;
  assert.deepEqual([entries.filter((e) => e.w === 0).length, entries.filter((e) => e.ty === "comic").length], [2, 3]);
  const page = buildRoutes(buildModel(posts, ["zh"], site.sections), {}, { langs: ["zh"] }).find((r) => r.kind === "post" && r.props.slug === "b0");
  assert.equal(page.props.own, false);
});

test("books: adult text-only rule applies to own: no with the tag 成人", () => {
  const mk = (extra, tags = "成人") => parsePost("2026-10-21-a.zh.md", `---\ntitle: T\nsummary: S\ntags: ${tags}\n${extra}---\nx\n`, undefined, "books");
  assert.equal(isAdultText(mk("own: no\n")), true);
  assert.equal(isAdultText(mk("")), false);
  assert.equal(isAdultText(mk("own: no\n", "小說")), false);
});

test("the search index carries an author's aliases, so the original script and the English name find the book", () => {
  const posts = [{ lang: "zh", section: "books", slug: "x", title: "X", summary: "", html: "", tags: [], date: "2026-11-01", author: "史蒂芬．金", volumes: [], owner: "me", own: true }];
  const [e] = buildSearchIndex(posts, "zh", () => "書庫");
  assert.ok(e.h.includes("史蒂芬．金") && e.h.includes("Stephen King"), e.h.join());
});

test("books: original is read (books only, up to 160 characters) and is searchable whole and by its parts", async () => {
  const { buildSearchIndex } = await import("../scripts/content.mjs");
  const b = book("2026-10-21-a.zh.md", "summary: S\noriginal: 원제 / English Title\n");
  assert.equal(b.original, "원제 / English Title");
  assert.equal(book("2026-10-21-a.zh.md", "summary: S\n").original, "");
  assert.throws(() => book("2026-10-21-a.zh.md", `summary: S\noriginal: ${"x".repeat(161)}\n`), /'original' must be a short text/);
  assert.throws(() => book("2026-10-21-a.zh.md", "summary: S\noriginal: x\n", "toys"), /'original' is only for posts in content\/books\//);
  const h = buildSearchIndex([b], "zh", (s) => s)[0].h;
  assert.deepEqual(h.slice(-3), ["원제 / English Title", "원제", "English Title"]);
  const page = buildRoutes(buildModel([b], ["zh"], site.sections), {}, { langs: ["zh"] }).find((r) => r.path === "/zh/books/a/").props;
  assert.equal(page.original, "원제 / English Title");
});
