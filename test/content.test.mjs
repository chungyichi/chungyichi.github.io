import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseFrontMatter, parsePost, selectPublished, sortPosts, buildModel, paginate, groupByDate,
  todayIn, atomFeed, sitemap, postPath, indexPath, ContentError,
} from "../scripts/content.mjs";

const fm = (extra = "") => `---\ntitle: "Hello"\nsummary: A short summary.\n${extra}---\nBody **text**.\n`;
const post = (name, extra, body) => parsePost(name, body ?? fm(extra));

test("front matter: strings, booleans, quotes, comments", () => {
  const { data, body } = parseFrontMatter(`---\n# note\ntitle: 'It''s'\nsummary: "a: b"\ndraft: true\n---\nx`);
  assert.deepEqual(data, { title: "It's", summary: "a: b", draft: true });
  assert.equal(body, "x");
});

test("front matter: strict errors name the file", () => {
  for (const [text, msg] of [
    ["no block", /missing front matter/],
    ["---\ntitle: x\nbogus: 1\n---\n", /unknown front matter key 'bogus'/],
    ["---\ntitle: x\ntitle: y\n---\n", /duplicate/],
    ["---\nnot a pair\n---\n", /not 'key: value'/],
  ]) assert.throws(() => parseFrontMatter(text, "f.md"), (e) => e instanceof ContentError && msg.test(e.message) && e.message.includes("f.md"));
});

test("post: file name rules", () => {
  for (const bad of ["post.zh.md", "2026-10-21-Hello.zh.md", "2026-10-21-hello.fr.md", "2026-13-40-x.zh.md", "2026-02-30-x.en.md", "2026-10-21-a_b.en.md"]) {
    assert.throws(() => parsePost(bad, fm()), ContentError, bad);
  }
  const p = post("2026-10-21-hello-world.en.md", "");
  assert.deepEqual([p.date, p.slug, p.lang, p.draft], ["2026-10-21", "hello-world", "en", false]);
});

test("post: required fields and limits", () => {
  assert.throws(() => parsePost("2026-10-21-a.zh.md", "---\nsummary: s\n---\nx"), /'title' is required/);
  assert.throws(() => parsePost("2026-10-21-a.zh.md", "---\ntitle: t\n---\nx"), /'summary' is required/);
  assert.throws(() => post("2026-10-21-a.zh.md", "", `---\ntitle: t\nsummary: ${"x".repeat(301)}\n---\n`), /max 300/);
  assert.throws(() => post("2026-10-21-a.zh.md", "draft: maybe\n"), /'draft' must be true or false/);
  assert.throws(() => post("2026-10-21-a.zh.md", "updated: yesterday\n"), /'updated' must be YYYY-MM-DD/);
});

test("post: a draft may have an empty summary, a published post may not", () => {
  const d = parsePost("2026-10-21-a.zh.md", "---\ntitle: t\nsummary: \"\"\ndraft: true\n---\nx");
  assert.deepEqual([d.draft, d.summary], [true, ""]);
  assert.throws(() => parsePost("2026-10-21-a.zh.md", "---\ntitle: t\nsummary: \"\"\n---\nx"), /'summary' is required/);
  assert.throws(() => parsePost("2026-10-21-a.zh.md", "---\nsummary: s\ndraft: true\n---\nx"), /.title. is required/);
  parsePost("2026-10-21-a.zh.md", "---\ntitle: t\ndraft: true\n---\nx");   // no summary line at all is fine for a draft
});

test("markdown: raw HTML and scripts are escaped, dangerous links are not links", () => {
  const p = parsePost("2026-10-21-x.en.md", fm().replace("Body **text**.", '<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[bad](javascript:alert(1)) [ok](https://example.org)'));
  assert.ok(!p.html.includes("<script>"), p.html);
  assert.ok(!p.html.includes("<img"), p.html);
  assert.ok(!/href="javascript:/i.test(p.html), p.html);
  assert.match(p.html, /<a href="https:\/\/example\.org" rel="noopener noreferrer">ok<\/a>/);
});

test("markdown: code blocks are highlighted, unknown languages are still escaped", () => {
  const p = parsePost("2026-10-21-x.en.md", fm().replace("Body **text**.", "```c\nint x = 1 < 2;\n```\n\n```nope\n<b>\n```"));
  assert.match(p.html, /class="hljs language-c"/);
  assert.match(p.html, /&lt;b&gt;/);
});

test("publishing: drafts and future dates are held back, today is published, dev can include drafts", () => {
  const a = post("2026-10-20-a.en.md", ""), b = post("2026-10-21-b.en.md", ""), c = post("2026-10-22-c.en.md", ""), d = post("2026-10-01-d.en.md", "draft: true\n");
  const today = "2026-10-21";
  assert.deepEqual(selectPublished([a, b, c, d], today).map((p) => p.slug), ["a", "b"]);
  assert.equal(selectPublished([a, b, c, d], today, { includeDrafts: true }).length, 4);
});

test("today is computed in the site's zone, not UTC", () => {
  const t = new Date("2026-10-20T20:00:00Z");           // 04:00 on the 21st in Taipei
  assert.equal(todayIn("Asia/Taipei", t), "2026-10-21");
  assert.equal(todayIn("UTC", t), "2026-10-20");
});

test("model: sorting, translation pairing, missing translations, duplicate slugs", () => {
  const posts = [post("2026-10-01-a.zh.md", ""), post("2026-10-01-a.en.md", ""), post("2026-10-05-b.zh.md", ""), post("2026-10-05-aa.zh.md", "")];
  const m = buildModel(posts, ["zh", "en"]);
  assert.deepEqual(m.byLang.zh.map((p) => p.slug), ["aa", "b", "a"]);          // newest first, ties by slug
  assert.deepEqual(Object.keys(m.translations.a).sort(), ["en", "zh"]);
  assert.deepEqual(m.missing.map((p) => `${p.lang}/${p.slug}`).sort(), ["zh/aa", "zh/b"]);
  assert.throws(() => buildModel([post("2026-10-01-a.zh.md", ""), post("2026-10-02-a.zh.md", "")], ["zh", "en"]), /share the slug 'a'/);
});

test("pagination and date grouping", () => {
  const items = Array.from({ length: 23 }, (_, i) => i);
  const pages = paginate(items, 10);
  assert.deepEqual(pages.map((p) => p.items.length), [10, 10, 3]);
  assert.equal(paginate([], 10).length, 1);                                  // an empty blog still has a page 1
  assert.throws(() => paginate(items, 0), ContentError);
  const g = groupByDate(sortPosts([post("2026-10-05-a.en.md", ""), post("2026-10-05-b.en.md", ""), post("2026-10-01-c.en.md", "")]));
  assert.deepEqual(g.map((x) => [x.date, x.items.length]), [["2026-10-05", 2], ["2026-10-01", 1]]);
});

test("paths", () => {
  assert.equal(postPath("zh", "hi"), "/zh/blog/hi/");
  assert.equal(indexPath("en"), "/en/blog/");
  assert.equal(indexPath("en", 3), "/en/blog/page/3/");
});

test("atom feed escapes everything and uses absolute URLs", () => {
  const p = post("2026-10-21-x.en.md", "", `---\ntitle: "A & <B>"\nsummary: 'say "hi" & bye'\n---\nx`);
  const xml = atomFeed({ lang: "en", title: "T & Co", baseUrl: "https://e.org", author: "Me", posts: [p], now: new Date("2026-10-21T00:00:00Z") });
  assert.match(xml, /<title>A &amp; &lt;B&gt;<\/title>/);
  assert.match(xml, /<link href="https:\/\/e\.org\/en\/blog\/x\/"\/>/);
  assert.match(xml, /<title>T &amp; Co<\/title>/);
  assert.ok(!xml.includes("<B>"));
});

test("sitemap lists alternates", () => {
  const x = sitemap("https://e.org", [{ path: "/zh/", alternates: [{ lang: "en", path: "/en/" }] }]);
  assert.match(x, /<loc>https:\/\/e\.org\/zh\/<\/loc>/);
  assert.match(x, /hreflang="en" href="https:\/\/e\.org\/en\/"/);
});
