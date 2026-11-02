import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePost, buildModel } from "../scripts/content.mjs";
import { buildRoutes } from "../scripts/routes.mjs";
import { shareDescription } from "../scripts/meta.mjs";
import { site } from "../site.config.mjs";

const toy = (name) => parsePost(name, `---\ntitle: T ${name}\nsummary: S\ntags: 玩具\nowner: me\n---\nx\n`, undefined, "toys");
const posts = [toy("2026-10-21-mayday-max.zh.md"), toy("2026-10-21-b.zh.md"), toy("2026-10-21-b.en.md")];
const build = (opts = {}) => buildRoutes(buildModel(posts, ["zh", "en"], site.sections), {}, { langs: ["zh", "en"], ...opts });
const find = (routes, path) => routes.find((r) => r.path === path);
const OG = "/og-default.jpg", MAYDAY = "/media/toys/mayday-max/og.jpg";
const has = (...files) => (u) => files.includes(u);

test("shareDescription: {n} filled, zh and en, no entry = empty", () => {
  const meta = { toys: { description: { zh: "共 {n} 件，{n}", en: "{n} items" } } };
  assert.equal(shareDescription(meta, "toys", "zh", 7), "共 7 件，7");
  assert.equal(shareDescription(meta, "toys", "en", 0), "");   // nothing yet: no "0 items", the page keeps its old description
  assert.equal(shareDescription(meta, "books", "zh", 3), "");
  assert.equal(shareDescription(undefined, "toys", "zh", 3), "");
});

test("share meta: grid pages count the published posts of that language; no meta = old behaviour", () => {
  const r = build({ fileExists: has(OG) });
  assert.match(find(r, "/zh/toys/").description, /共 2 件/);
  assert.match(find(r, "/en/toys/").description, /^Our toy collection: 1 items/);
  assert.equal(find(r, "/zh/books/").description, undefined);   // the test posts have no books: no "0 books"
  assert.ok(find(r, "/zh/").description.startsWith("認識我是你一生最大的榮幸。收藏"));
  assert.ok(find(r, "/zh/search/").description && find(r, "/zh/tags/").description);
  const none = build({ meta: {}, fileExists: has(OG) });
  assert.equal(find(none, "/zh/toys/").description, undefined);
  assert.equal(find(none, "/zh/search/").description, undefined);
});

test("share image: toys list uses the post's og.jpg; missing post or file falls back to the default with one warning per language", () => {
  const ok = build({ fileExists: has(OG, MAYDAY) });
  const img = find(ok, "/zh/toys/").ogImage;
  assert.deepEqual([img.url, img.width, img.height], [site.baseUrl + MAYDAY, 1200, 630]);
  assert.equal(find(ok, "/zh/books/").ogImage.url, site.baseUrl + OG);
  const warns = [];
  const nofile = build({ fileExists: has(OG), warn: (m) => warns.push(m) });
  assert.equal(find(nofile, "/zh/toys/").ogImage.url, site.baseUrl + OG);
  assert.equal(warns.length, 2);   // zh and en
  const nopost = build({ fileExists: has(OG, MAYDAY), warn: (m) => warns.push(m) });
  assert.equal(find(nopost, "/en/toys/").ogImage.url, site.baseUrl + OG);   // mayday-max has no English post
  assert.equal(warns.length, 3);
});

test("share meta leaves posts and other pages unchanged", () => {
  const a = build({ fileExists: has(OG, MAYDAY) }), b = build({ meta: {}, fileExists: has(OG, MAYDAY) });
  const post = (r) => find(r, "/zh/toys/b/");
  assert.deepEqual(post(a), post(b));
  assert.equal(post(a).description, undefined);
  assert.equal(find(a, "/zh/search/").ogImage.url, site.baseUrl + OG);
});
