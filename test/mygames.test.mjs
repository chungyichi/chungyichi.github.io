import { test } from "node:test";
import assert from "node:assert/strict";
import { buildModel } from "../scripts/content.mjs";
import { buildRoutes } from "../scripts/routes.mjs";
import { resolveMyGames, LOOK_INIT, LOOK_KEY, RETRO_CLASS } from "../src/mygames.mjs";
import { site } from "../site.config.mjs";

const fake = {
  island: { title: { zh: "島" }, kicker: { zh: "小遊戲" }, blurb: { zh: "島的介紹" }, cta: { zh: "開始玩" }, picture: "/media/games/island/card.webp" },
  myGames: { slug: "my-games", title: { zh: "我的遊戲" }, intro: { zh: "自己做的" }, games: [
    { id: "island", use: "island", status: { zh: "已公開" }, updated: "2026-11-04", news: { zh: "島上線" }, href: "/island/" },
    { id: "street", title: { zh: "街" }, blurb: { zh: "街的介紹" }, cta: { zh: "即將推出" }, updated: "2026-11-07", news: { zh: "街內測" }, href: "" },
  ] },
};

test("resolveMyGames: the island card takes its texts from site.island; news newest first; no title in a language = no page", () => {
  const page = resolveMyGames(fake, "zh");
  assert.equal(page.path, "/zh/my-games/");
  assert.equal(page.title, "我的遊戲");
  const [island, street] = page.games;
  assert.deepEqual([island.title, island.blurb, island.picture, island.cta, island.href], ["島", "島的介紹", "/media/games/island/card.webp", "開始玩", "/island/"]);
  assert.deepEqual([street.title, street.href, street.picture], ["街", "", ""]);
  assert.deepEqual(page.news.map((n) => n.id), ["street", "island"]);
  assert.equal(resolveMyGames(fake, "en"), null);
  assert.equal(resolveMyGames({ island: fake.island }, "zh"), null);
});

test("routes: the page exists only in the languages the config names, with its share description", () => {
  const routes = buildRoutes(buildModel([], ["zh", "en"], site.sections), {}, { langs: ["zh", "en"] });
  const mine = routes.filter((r) => r.kind === "mygames");
  assert.deepEqual(mine.map((r) => r.path), [`/zh/${site.myGames.slug}/`]);
  assert.deepEqual(mine[0].alternates, []);   // no English page, so no alternate
  assert.equal(mine[0].description, site.meta.mygames.description.zh);
  assert.ok(mine[0].props.games.some((g) => g.href === "/island/"));
  assert.ok(mine[0].props.games.some((g) => g.href === ""), "the unreleased game has no link");
  assert.ok(!JSON.stringify(mine[0].props).match(/192\.168\.|localhost|:\d{4}\//), "no LAN address on the page");
});

test("LOOK_INIT: a saved retro choice adds the class; anything else, or storage that throws, keeps modern", () => {
  const run = (getItem) => {
    const classes = new Set();
    const document = { getElementById: (id) => (id === "mygames" ? { classList: { add: (c) => classes.add(c) } } : null) };
    new Function("localStorage", "document", LOOK_INIT)({ getItem }, document);
    return classes.has(RETRO_CLASS);
  };
  assert.equal(run((k) => (k === LOOK_KEY ? "retro" : null)), true);
  assert.equal(run(() => "modern"), false);
  assert.equal(run(() => null), false);
  assert.equal(run(() => { throw new Error("private mode"); }), false);
});
