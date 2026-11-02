import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePost, buildModel, buildSearchIndex } from "../scripts/content.mjs";
import { buildRoutes } from "../scripts/routes.mjs";
import { site } from "../site.config.mjs";
import { gridOf } from "../src/toys.mjs";
import { gridView } from "../src/grid-core.mjs";
import { prepare, search, inScope, inFilter, list } from "../src/search-core.mjs";

const game = (name, extra, section = "games") => parsePost(name, `---\ntitle: G ${name}\nsummary: S\ntags: 遊戲\n${extra}---\nx\n`, undefined, section);
const book = (name, extra) => parsePost(name, `---\ntitle: B ${name}\nsummary: S\ntags: 書\nowner: me\n${extra}---\nx\n`, undefined, "books");
const routesOf = (posts) => buildRoutes(buildModel(posts, ["zh", "en"], site.sections), {}, { langs: ["zh", "en"] });

test("games: platform (one or more ids, each once), developer, original are read; bad values and other sections are refused", () => {
  const g = game("2026-10-21-a.zh.md", "platform: steam, ps\ndeveloper: Asobo Studio\noriginal: ELDEN RING\nsource: https://example.com/g\n");
  assert.deepEqual([g.platform, g.developer, g.original, g.source, g.section], [["steam", "ps"], "Asobo Studio", "ELDEN RING", "https://example.com/g", "games"]);
  assert.deepEqual(game("2026-10-21-a.zh.md", "").platform, []);
  assert.throws(() => game("2026-10-21-a.zh.md", "platform: xbox\n"), /'platform' must be one or more of steam, ns, ps, other/);
  assert.throws(() => game("2026-10-21-a.zh.md", "platform: ps, ps\n"), /'platform' must be one or more/);
  assert.throws(() => game("2026-10-21-a.zh.md", "platform: \"\"\n"), /'platform' must be one or more/);
  assert.throws(() => game("2026-10-21-a.zh.md", "status: done\n"), /'status' is only for posts in content\/toys\//);
  assert.throws(() => game("2026-10-21-a.zh.md", "owner: me\n"), /'owner' is only for posts/);
  assert.throws(() => game("2026-10-21-a.zh.md", "own: no\n"), /'own' is only for posts in content\/books\//);
  assert.throws(() => game("2026-10-21-a.zh.md", "platform: steam\n", "toys"), /'platform' is only for posts in content\/games\//);
  assert.throws(() => game("2026-10-21-a.zh.md", "type: 漫畫\n"), /'type' is only for posts in content\/books\//);
});

test("books: type is 小說 (default) or 漫畫; anything else is refused", () => {
  assert.deepEqual([book("2026-10-21-a.zh.md", "").type, book("2026-10-21-a.zh.md", "type: 漫畫\n").type, book("2026-10-21-a.zh.md", "type: 小說\n").type], ["novel", "comic", "novel"]);
  assert.throws(() => book("2026-10-21-a.zh.md", "type: 雜誌\n"), /'type' must be one of 小說, 漫畫/);
});

test("games: a game on two platforms is in both platform tabs; ONE grid route holds them all", () => {
  const posts = [game("2026-10-21-a.zh.md", "platform: steam, ps\n"), game("2026-10-22-b.zh.md", "platform: ps\n"),
    game("2026-10-23-c.zh.md", "platform: steam\n"), game("2026-10-24-d.zh.md", "platform: ns\n")];
  const routes = routesOf(posts);
  const grid = routes.filter((r) => r.kind === "grid" && r.lang === "zh" && r.props.section === "games");
  assert.deepEqual(grid.map((r) => r.path), ["/zh/games/"]);
  assert.deepEqual(routes.find((r) => r.path === "/zh/games/").alternates, [{ lang: "en", path: "/en/games/" }]);
  const slugs = (filters) => gridView(grid[0].props.entries, gridOf("games"), { filters }).items.map((e) => e.u.split("/")[3]);
  assert.deepEqual(slugs({ platform: "ps" }), ["b", "a"]);
  assert.deepEqual(slugs({ platform: "steam" }), ["c", "a"]);
  assert.deepEqual(slugs({ platform: "ns" }), ["d"]);
  assert.deepEqual(slugs({}).length, 4);                                                  // 全部 once
  const v = gridView(grid[0].props.entries, gridOf("games"), {});
  assert.deepEqual(v.facets.find((f) => f.id === "platform").values, [{ id: "steam", total: 2 }, { id: "ns", total: 1 }, { id: "ps", total: 2 }, { id: "other", total: 0 }]);
  assert.deepEqual(v.owners, []);                                                          // games have no owners
});

test("search: games carry platform ids in the index and the platform name is searchable; filters combine", () => {
  const posts = [game("2026-10-21-a.zh.md", "platform: steam, ps\n"), game("2026-10-22-b.zh.md", "platform: ns\n"), book("2026-10-23-c.zh.md", "type: 漫畫\n"), book("2026-10-24-d.zh.md", "")];
  const idx = buildSearchIndex(posts, "zh", (s) => s);
  assert.deepEqual([idx[0].o, idx[0].pf, idx[1].pf, idx[2].ty, idx[3].ty], [undefined, ["steam", "ps"], ["ns"], "comic", undefined]);
  assert.ok(idx[0].h.includes("Steam") && idx[0].h.includes("PS"));
  const p = prepare(idx);
  const ids = (q, filters, scope) => (q ? search(p, q, 50, (e) => inScope(e, scope, "zh") && inFilter(e, "", filters)) : list(p, 50, (e) => inScope(e, scope, "zh") && inFilter(e, "", filters))).map((e) => e.t.slice(-10));
  assert.deepEqual(search(p, "ps").map((e) => e.t), ["G 2026-10-21-a.zh.md"]);
  assert.equal(ids("", { platform: "ps" }, "games").length, 1);
  assert.equal(ids("", { platform: "steam" }, "games").length, 1);
  assert.equal(ids("", { type: "comic" }, "books").length, 1);
  assert.equal(ids("", { type: "novel" }, "books").length, 1);
});
