import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseFrontMatter, parsePost, selectPublished, sortPosts, buildModel, paginate, groupByDate,
  todayIn, sitemap, postPath, indexPath, ContentError,
} from "../scripts/content.mjs";

const fm = (extra = "") => `---\ntitle: "Hello"\nsummary: A short summary.\n${extra}---\nBody **text**.\n`;
const SECTIONS = [{ id: "tech" }, { id: "life" }];
const post = (name, extra, body, section = "tech") => parsePost(name, body ?? fm(extra), undefined, section);

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
  const m = buildModel(posts, ["zh", "en"], SECTIONS);
  assert.deepEqual(m.byLang.zh.map((p) => p.slug), ["aa", "b", "a"]);          // newest first, ties by slug
  assert.deepEqual(Object.keys(m.translations["tech/a"]).sort(), ["en", "zh"]);
  assert.deepEqual(m.missing.map((p) => `${p.lang}/${p.slug}`).sort(), ["zh/aa", "zh/b"]);
  assert.throws(() => buildModel([post("2026-10-01-a.zh.md", ""), post("2026-10-02-a.zh.md", "")], ["zh", "en"], SECTIONS), /in 'tech' share the slug 'a'/);
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
  assert.equal(postPath("zh", "life", "hi"), "/zh/life/hi/");
  assert.equal(indexPath("en", "tech"), "/en/tech/");
  assert.equal(indexPath("en", "tech", 3), "/en/tech/page/3/");
});

test("sitemap lists alternates", () => {
  const x = sitemap("https://e.org", [{ path: "/zh/", alternates: [{ lang: "en", path: "/en/" }] }]);
  assert.match(x, /<loc>https:\/\/e\.org\/zh\/<\/loc>/);
  assert.match(x, /hreflang="en" href="https:\/\/e\.org\/en\/"/);
});

test("sections: same slug may exist in two sections, unknown sections are rejected, translations pair within a section", () => {
  const a = post("2026-10-01-trip.zh.md", "", undefined, "life"), b = post("2026-10-01-trip.en.md", "", undefined, "life"), c = post("2026-10-01-trip.zh.md", "");
  const m = buildModel([a, b, c], ["zh", "en"], SECTIONS);
  assert.deepEqual(m.bySection.life.zh.map((p) => p.slug), ["trip"]);
  assert.equal(m.bySection.tech.en.length, 0);
  assert.deepEqual(m.missing.map((p) => p.section), ["tech"]);       // only the tech one lacks an English version
  assert.throws(() => buildModel([post("2026-10-01-x.zh.md", "", undefined, "food")], ["zh", "en"], SECTIONS), /unknown section 'food'/);
});

// ---- .html posts, sanitizer, per-post CSS ----
import { sanitizeHtml, safeUrl } from "../scripts/sanitize.mjs";
import { checkPostCss } from "../scripts/load.mjs";

test("sanitizer drops scripts, event handlers, style attributes and javascript: links", () => {
  const out = sanitizeHtml('<p onclick="x()" style="background:url(//e)">hi<script>alert(1)</script></p><a href="javascript:alert(1)">bad</a><a href=" JaVa\nScript:alert(1)">bad2</a><iframe src="//e"></iframe>');
  assert.equal(out, "<p>hi</p>badbad2");
});

test("sanitizer keeps structure, free class names and ids, and marks external links", () => {
  const out = sanitizeHtml('<section class="route day-1" id="d1"><h1>T</h1><a href="https://e.org/x">x</a><span class="bad class!">y</span></section>');
  assert.equal(out, '<section class="route day-1" id="d1"><h2>T</h2><a href="https://e.org/x" rel="noopener noreferrer">x</a><span class="bad">y</span></section>');
});

test("sanitizer requires local images and keeps size hints", () => {
  assert.equal(sanitizeHtml('<img src="/media/life/a.jpg" alt="a&quot;b" width="800" height="x">'), '<img src="/media/life/a.jpg" alt="a&quot;b" loading="lazy" decoding="async" width="800">');
  assert.throws(() => sanitizeHtml('<img src="https://cdn.example/a.jpg">', "p.html"), /images must be local/);
  assert.throws(() => sanitizeHtml('<img src="//cdn.example/a.jpg">', "p.html"), /images must be local/);
});

test("safeUrl accepts only http(s), mailto, root-relative and fragments", () => {
  for (const ok of ["https://a.b/c", "http://a.b", "mailto:a@b.c", "/x/y", "#top"]) assert.ok(safeUrl(ok), ok);
  for (const bad of ["//evil.example", "/\\evil.example", "data:text/html,x", "vbscript:x", "ftp://a", "x/y", ""]) assert.equal(safeUrl(bad), null, bad);
});

test("an .html post is parsed with the same file rules and sanitized", () => {
  const p = parsePost("2026-10-21-trip.zh.html", '---\ntitle: T\nsummary: S\n---\n<div class="gallery"><img src="/media/life/a.jpg" alt=""><script>x</script></div>', undefined, "life");
  assert.equal(p.section, "life");
  assert.ok(p.html.startsWith('<div class="gallery"><img src="/media/life/a.jpg"'));
  assert.ok(!p.html.includes("script"));
});

test("per-post CSS may not load anything from other hosts", () => {
  assert.ok(checkPostCss(".post-a .hero{background:url(/media/life/a.jpg)} .x{color:red}"));
  for (const bad of ['@import "x.css";', ".a{background:url(https://e.org/a.png)}", ".a{background:url(//e.org/a.png)}", ".a{width:expression(alert(1))}"]) {
    assert.throws(() => checkPostCss(bad, "x.css"), /x\.css/, bad);
  }
});

// ---- picture lookup while previewing ----
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join as pjoin } from "node:path";
import { resolveMedia } from "../scripts/media.mjs";

function mediaFixture() {
  const root = mkdtempSync(pjoin(tmpdir(), "media-"));
  const touch = (p) => { mkdirSync(pjoin(p, ".."), { recursive: true }); writeFileSync(p, "x"); };
  touch(pjoin(root, "content/life/media/kyoto/001.webp"));
  touch(pjoin(root, "content/_private/life/media/draft/002.webp"));
  touch(pjoin(root, "originals/life/kyoto/001.jpg"));
  return { contentRoot: pjoin(root, "content"), originals: pjoin(root, "originals"), root };
}

test("pictures: web versions by default, originals only in original mode, matched without the extension", () => {
  const f = mediaFixture();
  assert.equal(resolveMedia({ ...f, section: "life", rest: "kyoto/001.webp" }).source, "web");
  assert.equal(resolveMedia({ ...f, section: "life", rest: "kyoto/001.webp", mode: "web" }).source, "web");
  const o = resolveMedia({ ...f, section: "life", rest: "kyoto/001.webp", mode: "original" });
  assert.equal(o.source, "original");
  assert.ok(o.file.endsWith("001.jpg"));
});

test("pictures: no original -> the web version; private drafts are found; nothing found -> null", () => {
  const f = mediaFixture();
  assert.equal(resolveMedia({ ...f, section: "life", rest: "draft/002.webp", mode: "original" }).source, "web");
  assert.equal(resolveMedia({ ...f, section: "life", rest: "draft/nope.webp" }), null);
  assert.equal(resolveMedia({ ...f, section: "life", rest: "kyoto/001.webp", mode: "original", originals: "" }).source, "web");
});

test("pictures: path tricks are refused", () => {
  const f = mediaFixture();
  for (const rest of ["../../../etc/passwd", "/etc/passwd", "kyoto/../../x", ".."]) assert.equal(resolveMedia({ ...f, section: "life", rest, mode: "original" }), null, rest);
  assert.equal(resolveMedia({ ...f, section: "../x", rest: "a" }), null);
  assert.equal(resolveMedia({ ...f, section: "Life", rest: "kyoto/001.webp" }), null);
});

// ---- trusted posts ----
import { externalHosts } from "../scripts/content.mjs";

test("a trusted .html post is used as written; an untrusted one is still sanitized", () => {
  const body = '<style>.a{color:red}</style><svg viewBox="0 0 1 1"><circle r="1"/></svg><div style="x:1" onclick="f()">hi</div><script>go()</script>';
  const t = parsePost("2026-10-21-x.zh.html", `---\ntitle: T\nsummary: S\ntrusted: true\n---\n${body}`);
  assert.equal(t.trusted, true);
  assert.equal(t.html, body);
  const u = parsePost("2026-10-21-x.zh.html", `---\ntitle: T\nsummary: S\n---\n${body}`);
  assert.equal(u.trusted, false);
  assert.ok(!/script|svg|style=|onclick/.test(u.html));
});

test("a Markdown post can have widget mount points; raw HTML in it stays escaped; trusted must be a boolean", () => {
  const p = parsePost("2026-10-21-x.zh.md", "---\ntitle: T\nsummary: S\ntrusted: true\n---\nText\n\n{{widget: tlsf-map}}\n\n<script>x()</script>\n\n{{widget: Bad Name}}\n");
  assert.equal(p.trusted, true);
  assert.ok(p.html.includes('<div class="widget" data-widget="tlsf-map"></div>'));
  assert.ok(p.html.includes("&lt;script&gt;"));
  assert.ok(!p.html.includes('data-widget="bad'));
  assert.throws(() => parsePost("2026-10-21-x.zh.html", '---\ntitle: T\nsummary: S\ntrusted: "yes"\n---\nx'), /must be true or false/);
});

test("externalHosts finds the outside hosts of scripts, frames, images and stylesheets", () => {
  const text = '<script src="https://cdn.example.com/a.js"></script><iframe src="//maps.example.org/x?y=1"></iframe> url(https://fonts.example.net/f.woff2) /local/path fetch("http://api.example.io:8080/v")';
  assert.deepEqual(externalHosts(text), ["api.example.io", "cdn.example.com", "fonts.example.net", "maps.example.org"]);
  assert.deepEqual(externalHosts('<a href="/zh/">x</a> <img src="/media/a.webp">'), []);
});

// ---- length ----
import { countWords } from "../scripts/content.mjs";

test("length counts Chinese characters one by one and other words once, ignoring markup, style and script", () => {
  assert.equal(countWords("<p>今天去伊吹山，天氣很好。</p>"), 10);                 // 10 characters; punctuation is not counted
  assert.equal(countWords("<p>Hello brave new world</p>"), 4);
  assert.equal(countWords("<p>在 Google Map 上看 2019 年</p>"), 4 + 3);          // 在 上 看 年, plus Google Map 2019
  assert.equal(countWords('<style>.a{color:red}</style><script>var x = 1;</script><p>字 a</p>'), 2);
  assert.equal(countWords("<p>a&amp;b &nbsp; 好</p>"), 3);
});

test("a Markdown post is counted on its rendered text too", () => {
  const p = parsePost("2026-10-21-x.zh.md", "---\ntitle: T\nsummary: S\n---\n# 標題\n\n這是**一段**文字。\n");
  assert.equal(p.words, 8);                                                       // 標題 這是 一段 文字
});

// ---- share meta ----
import { metaTags } from "../scripts/meta.mjs";
import { ogImageFor } from "../scripts/content.mjs";

const BASE = "https://e.org";
const P = (over = {}) => ({ section: "life", slug: "trip", title: "T", html: "<p>x</p>", image: "", ...over });

test("share picture: front matter image, then og.jpg, then the first body picture, then the default, else none", () => {
  const has = (set) => (p) => set.includes(p);
  const body = '<img alt="" src="/media/life/trip/a.webp" width="1200" height="800">';
  assert.equal(ogImageFor(P({ image: "cover.jpg", html: body }), { baseUrl: BASE, exists: has(["/media/life/trip/cover.jpg", "/media/life/trip/og.jpg"]) }).url, `${BASE}/media/life/trip/cover.jpg`);
  const og = ogImageFor(P({ html: body }), { baseUrl: BASE, exists: has(["/media/life/trip/og.jpg"]) });
  assert.deepEqual([og.url, og.width, og.height], [`${BASE}/media/life/trip/og.jpg`, 1200, 630]);
  const first = ogImageFor(P({ html: body }), { baseUrl: BASE, exists: has([]) });
  assert.deepEqual([first.url, first.width, first.height], [`${BASE}/media/life/trip/a.webp`, "1200", "800"]);
  assert.equal(ogImageFor(P(), { baseUrl: BASE, exists: has([]), fallback: "/og-default.jpg" }).url, `${BASE}/og-default.jpg`);
  assert.equal(ogImageFor(P(), { baseUrl: BASE, exists: has([]) }), null);
});

test("share picture: a front matter image that does not exist is skipped, not published as a broken link", () => {
  assert.equal(ogImageFor(P({ image: "gone.jpg" }), { baseUrl: BASE, exists: () => false }), null);
  assert.throws(() => parsePost("2026-10-21-x.zh.md", "---\ntitle: T\nsummary: S\nimage: ../x.jpg\n---\nx"), /'image' must be a file name/);
});

test("meta tags: article type, picture, locale alternates, and everything escaped", () => {
  const route = { kind: "post", lang: "zh", path: "/zh/life/trip/", alternates: [{ lang: "en", path: "/en/life/trip/", translated: true }], props: { date: "2026-10-01", section: "life", updated: "" } };
  const out = metaTags(route, { siteName: 'S "x"', baseUrl: BASE, title: 'A & <B>', description: "d", image: { url: `${BASE}/media/life/trip/og.jpg`, width: 1200, height: 630 }, author: "Me" });
  for (const want of ['og:type" content="article"', 'og:title" content="A &amp; &lt;B&gt;"', `og:url" content="${BASE}/zh/life/trip/"`, 'og:locale" content="zh_TW"',
    'og:locale:alternate" content="en_US"', 'article:published_time" content="2026-10-01"', 'og:image:width" content="1200"', 'twitter:card" content="summary_large_image"',
    'og:site_name" content="S &quot;x&quot;"']) assert.ok(out.includes(want), want);
  assert.ok(!out.includes("<B>"));
});

test("meta tags: no picture means a plain summary card, and a page is a website", () => {
  const out = metaTags({ kind: "home", lang: "en", path: "/en/", alternates: [] }, { siteName: "S", baseUrl: BASE, title: "T", description: "D", author: "Me" });
  assert.ok(out.includes('twitter:card" content="summary"') && out.includes('og:type" content="website"') && !out.includes("og:image"));
});

// ---- tags ----
import { normalizeTags } from "../scripts/content.mjs";
import { tagSlug, tagPath } from "../src/tags.mjs";

test("tags: comma list or JSON list in the front matter, tidied and de-duplicated", () => {
  const a = parsePost("2026-10-21-x.zh.md", "---\ntitle: T\nsummary: S\ntags: 日本,  旅行 , Linux  BPF, linux bpf\n---\nx");
  assert.deepEqual(a.tags, ["日本", "旅行", "Linux BPF"]);
  const b = parsePost("2026-10-21-x.zh.md", '---\ntitle: T\nsummary: S\ntags: ["日本", "旅行"]\n---\nx');
  assert.deepEqual(b.tags, ["日本", "旅行"]);
  assert.deepEqual(parsePost("2026-10-21-x.zh.md", "---\ntitle: T\nsummary: S\n---\nx").tags, []);
});

test("tags: bad ones are refused with a message that names the problem", () => {
  assert.throws(() => normalizeTags(["a/b"], "f"), /cannot be in an address/);
  assert.throws(() => normalizeTags(["x".repeat(31)], "f"), /longer than 30/);
  assert.throws(() => normalizeTags(Array.from({ length: 4 }, (_, i) => `t${i}`), "f"), /more than 3 tags/);
  assert.throws(() => parsePost("2026-10-21-x.zh.md", "---\ntitle: T\nsummary: S\ntags: [oops\n---\nx"), /tags must look like/);
});

test("tags: slugs and the address of the one tag page", () => {
  assert.equal(tagSlug("Linux BPF"), "linux-bpf");
  assert.equal(tagSlug("日本"), "日本");
  assert.equal(tagPath("zh", "日本"), "/zh/tags/?tag=%E6%97%A5%E6%9C%AC");
  assert.equal(tagPath("en", "road trip", 2), "/en/tags/?tag=road+trip&page=2");
});

test("tags: at most three per post", () => {
  assert.equal(normalizeTags(["a", "b", "c"]).length, 3);
  assert.throws(() => normalizeTags(["a", "b", "c", "d"], "x.md"), /more than 3 tags/);
});

// ---- toys ----
import { checkSourceUrl } from "../scripts/content.mjs";
import { pickFeaturedToys } from "../src/toys.mjs";

const toy = (extra, name = "2026-10-21-robot.zh.md") => parsePost(name, `---\ntitle: Robot\nsummary: S\ntags: 公仔\n${extra}---\n![Robot](/media/toys/robot/cover.webp)\n`, undefined, "toys");

test("toys: owner, source and status are read from the front matter; absent ones are empty", () => {
  const p = toy("owner: son\nsource: https://shop.example/item/1?x=1\nstatus: want\n");
  assert.deepEqual([p.owner, p.source, p.status], ["son", "https://shop.example/item/1?x=1", "want"]);
  assert.deepEqual([toy("").owner, toy("").source, toy("").status], ["", "", ""]);
  assert.ok(p.html.includes('<img src="/media/toys/robot/cover.webp" alt="Robot">'));
});

test("toys: the price is free text, shown as written; absent is empty", () => {
  assert.equal(toy('price: "NT$15,525"\n').price, "NT$15,525");
  assert.equal(toy("price: about 500 yen\n").price, "about 500 yen");
  assert.equal(toy("").price, "");
  assert.equal(toy("price: 1250\n").price, "1250");                                    // a bare number is text too
  assert.throws(() => toy('price: ""\n'), /'price' must be a short text/);
  assert.throws(() => toy("price: true\n"), /'price' must be a short text/);
  assert.throws(() => toy(`price: ${"9".repeat(41)}\n`), /at most 40 characters/);
  assert.throws(() => parsePost("2026-10-21-a.zh.md", '---\ntitle: T\nsummary: S\nprice: "NT$1"\n---\nx', undefined, "tech"), /'price' is only for posts in content\/toys\//);
});

test("toys: the quantity is a whole number from 1 up; absent is 1; it reaches the card and the page", () => {
  assert.equal(toy("quantity: 2\n").quantity, 2);
  assert.equal(toy('quantity: "3"\n').quantity, 3);
  assert.equal(toy("").quantity, 1);
  for (const bad of ["0", "-1", "1.5", "two", "true", '""']) assert.throws(() => toy(`quantity: ${bad}\n`), /'quantity' must be a whole number from 1 up/, bad);
  assert.throws(() => parsePost("2026-10-21-a.zh.md", "---\ntitle: T\nsummary: S\nquantity: 2\n---\nx", undefined, "tech"), /'quantity' is only for posts in content\/toys\//);
  const posts = [toy("owner: me\nquantity: 2\n"), toy("owner: me\n", "2026-10-22-car.zh.md")];
  const routes = buildRoutes(buildModel(posts, ["zh", "en"], site.sections), {}, { langs: ["zh"] });
  assert.deepEqual(briefs(routes.find((r) => r.path === "/zh/toys/").props.entries).map((p) => [p.slug, p.quantity]), [["car", 1], ["robot", 2]]);
  assert.equal(routes.find((r) => r.path === "/zh/toys/robot/").props.quantity, 2);
  assert.equal(routes.find((r) => r.path === "/zh/toys/car/").props.quantity, 1);
});

test("home: the featured toys come in the config's order, only those that exist in the language, with the toy page's picture; none means no carousel", () => {
  const car = parsePost("2026-10-22-car.zh.md", "---\ntitle: Car\nsummary: S\nowner: me\n---\nNo picture in the body.\n", undefined, "toys");
  const posts = [toy("owner: me\n"), car, toy("owner: me\n", "2026-10-23-ball.en.md"), post("2026-10-21-t.zh.md", "")];
  const zh = posts.filter((p) => p.lang === "zh");
  assert.deepEqual(pickFeaturedToys(zh, ["toys/car", "toys/ball", "toys/nope", "tech/t", "toys/robot"]).map((p) => p.slug), ["car", "robot"]);
  assert.deepEqual(pickFeaturedToys(zh, []), []);
  assert.deepEqual(pickFeaturedToys(zh, undefined), []);
  const exists = (u) => u === "/media/toys/car/card.webp";                         // robot's picture is in its body; car has only a card
  const routes = buildRoutes(buildModel(posts, ["zh", "en"], site.sections), {}, { featured: ["tech/t"], featuredToys: ["toys/car", "toys/ball", "toys/robot"], fileExists: exists });
  const home = routes.find((r) => r.path === "/zh/").props;
  assert.deepEqual(home.toys, [{ slug: "car", title: "Car", pic: "/media/toys/car/card.webp" }, { slug: "robot", title: "Robot", pic: "/media/toys/robot/cover.webp" }]);
  assert.deepEqual(routes.find((r) => r.path === "/en/").props.toys.map((x) => x.slug), ["ball"]);
  assert.deepEqual(buildRoutes(buildModel(posts, ["zh", "en"], site.sections), {}, { featuredToys: [] }).find((r) => r.path === "/zh/").props.toys, []);
  assert.deepEqual(home.featured.map((p) => p.slug), ["t"]);                            // the posts list is untouched by the toys
});

test("toys: bad values are refused and the fields are only for the toys section", () => {
  assert.throws(() => toy("owner: My Son\n"), /'owner' must be a short id/);
  assert.throws(() => toy("owner: true\n"), /'owner' must be a short id/);
  assert.throws(() => toy("status: lost\n"), /'status' must be one of own, want/);
  assert.throws(() => toy("source: shop.example/item\n"), /'source' must be a full http\(s\) address/);
  assert.throws(() => toy("source: javascript:alert(1)\n"), /'source' must be a plain http\(s\) address/);
  assert.throws(() => toy("source: https://user:pw@shop.example/\n"), /plain http\(s\)/);
  assert.throws(() => parsePost("2026-10-21-a.zh.md", "---\ntitle: T\nsummary: S\nowner: me\n---\nx", undefined, "tech"), /'owner' is only for posts in content\/toys\//);
  assert.equal(checkSourceUrl("http://shop.example/a b"), "http://shop.example/a%20b");
});

import { buildRoutes } from "../scripts/routes.mjs";
import { site } from "../site.config.mjs";

test("toys: the section index is ONE grid route (all entries of the section, newest first); toys keep their post pages", () => {
  const posts = [toy("owner: me\n"), toy("owner: son\nstatus: want\n", "2026-10-22-car.zh.md"), toy("owner: son\n", "2026-10-23-ball.zh.md"), post("2026-10-21-t.zh.md", "")];
  const model = buildModel(posts, ["zh", "en"], site.sections);
  const routes = buildRoutes(model, {}, { langs: ["zh"], fileExists: (u) => u === "/media/toys/car/thumb.webp" });
  const grids = routes.filter((r) => r.kind === "grid" && r.props.section === "toys");
  assert.deepEqual(grids.map((r) => r.path), ["/zh/toys/"]);
  assert.deepEqual(grids[0].props.entries.map((e) => [e.u, e.o, e.st, e.im]), [["/zh/toys/ball/", "son", undefined, undefined], ["/zh/toys/car/", "son", 1, 1], ["/zh/toys/robot/", "me", undefined, undefined]]);
  assert.match(grids[0].props.index, /^\/search\/zh\.[0-9a-f]{10}\.json$/);
  assert.equal(routes.find((r) => r.path === "/zh/tech/")?.kind, "index");                 // other sections are unchanged
  const page = routes.find((r) => r.path === "/zh/toys/car/");
  assert.deepEqual([page.kind, page.props.owner, page.props.status, page.props.source, page.props.price], ["post", "son", "want", "", ""]);
  assert.ok(!routes.some((r) => /\/(owner|page)\//.test(r.path) && r.path.startsWith("/zh/toys/")));   // no per-owner or paged grid pages
});

import { toyHero } from "../scripts/content.mjs";
import { briefOfEntry } from "../src/grid-core.mjs";
const briefs = (entries) => entries.map(briefOfEntry);

test("toys: the square card picture (im 2) and the list thumbnail (im 1) are flagged in the data file; other sections never get a card", () => {
  const posts = [toy("owner: me\n"), toy("owner: me\n", "2026-10-22-car.zh.md"), post("2026-10-21-t.zh.md", "")];
  const files = ["/media/toys/robot/card.webp", "/media/toys/robot/thumb.webp", "/media/toys/car/thumb.webp", "/media/tech/t/card.webp", "/media/tech/t/thumb.webp"];
  const routes = buildRoutes(buildModel(posts, ["zh", "en"], site.sections), {}, { langs: ["zh"], fileExists: (u) => files.includes(u) });
  const grid = routes.find((r) => r.path === "/zh/toys/").props.entries;
  assert.deepEqual(grid.map((e) => [e.u, e.im]), [["/zh/toys/car/", 1], ["/zh/toys/robot/", 3]]);
  assert.deepEqual(grid.map((e) => briefOfEntry(e)).map((p) => [p.slug, p.card, p.thumb]), [["car", "", "/media/toys/car/thumb.webp"], ["robot", "/media/toys/robot/card.webp", "/media/toys/robot/thumb.webp"]]);
  const tech = routes.find((r) => r.path === "/zh/tech/").props.groups[0].items[0];
  assert.deepEqual([tech.card, tech.thumb], ["", "/media/tech/t/thumb.webp"]);
  assert.equal(routes.find((r) => r.path === "/zh/search/").props.index, routes.find((r) => r.path === "/zh/toys/").props.index);   // one data file for search, grids and tags
});

const COVER = "/media/toys/robot/cover.webp", OWN = "/media/toys/robot/own.webp";
const robot = (body, extra = "") => parsePost("2026-10-21-robot.zh.md", `---\ntitle: Robot\nsummary: S\n${extra}---\n${body}`, undefined, "toys");

test("toys: the page picture is the front matter image, else the body's first picture (then dropped from the body), else cover.webp; the price reaches the page", () => {
  const exists = (u) => [OWN, COVER].includes(u);
  const body = toy('price: "NT$1,250"\n');                                               // ![Robot](/media/toys/robot/cover.webp) as the body
  assert.deepEqual(toyHero(body, exists), { pictures: [{ src: COVER, alt: "Robot" }], src: COVER, html: "" });
  const text = robot("Hello\n\n![R](/media/toys/robot/cover.webp)\n\nMore\n");
  assert.deepEqual(toyHero(text, exists), { pictures: [{ src: COVER, alt: "R" }], src: COVER, html: "<p>Hello</p>\n<p>More</p>\n" });
  const own = robot("Hello\n\n![R](/media/toys/robot/cover.webp)\n", "image: own.webp\n");
  assert.equal(toyHero(own, exists).src, OWN);
  assert.ok(toyHero(own, exists).html.includes("cover.webp"));                            // with `image`, a picture after text is body, not panel
  const none = robot("Just text\n");
  assert.deepEqual(toyHero(none, exists), { pictures: [{ src: COVER, alt: "Robot" }], src: COVER, html: "<p>Just text</p>\n" });
  assert.deepEqual(toyHero(none, () => false), { pictures: [], src: "", html: "<p>Just text</p>\n" });
  const routes = buildRoutes(buildModel([body], ["zh", "en"], site.sections), {}, { langs: ["zh"], fileExists: exists });
  const page = routes.find((r) => r.path === "/zh/toys/robot/").props;
  assert.deepEqual([page.price, page.pictures, page.html], ["NT$1,250", [{ src: COVER, alt: "Robot" }], ""]);
  const tech = buildRoutes(buildModel([post("2026-10-21-t.zh.md", "", "---\ntitle: T\nsummary: S\n---\n![x](/media/tech/t/a.webp)\n")], ["zh", "en"], site.sections), {}, { langs: ["zh"], fileExists: () => true });
  const techPage = tech.find((r) => r.path === "/zh/tech/t/").props;
  assert.ok(techPage.html.includes("a.webp") && techPage.pictures.length === 0);         // other sections keep their body as is
});

test("toys: the pictures that open the body share the panel, in order, with their alt text; the text after them stays", () => {
  const pics = (n) => Array.from({ length: n }, (_, i) => `![Robot ${i + 1}](/media/toys/robot/p${i + 1}.webp)`).join("\n\n");
  const one = toyHero(robot(`${pics(1)}\n`));
  assert.deepEqual([one.pictures.length, one.src, one.html], [1, "/media/toys/robot/p1.webp", ""]);
  const two = toyHero(robot(`${pics(2)}\n\nA *note* below.\n`));
  assert.deepEqual(two.pictures, [{ src: "/media/toys/robot/p1.webp", alt: "Robot 1" }, { src: "/media/toys/robot/p2.webp", alt: "Robot 2" }]);
  assert.deepEqual([two.src, two.html], ["/media/toys/robot/p1.webp", "<p>A <em>note</em> below.</p>\n"]);
  const three = toyHero(robot(`${pics(3)}\n`));
  assert.deepEqual(three.pictures.map((p) => p.src), ["/media/toys/robot/p1.webp", "/media/toys/robot/p2.webp", "/media/toys/robot/p3.webp"]);
  assert.equal(three.html, "");
  // text between pictures ends the run: what follows is body, picture included
  const split = toyHero(robot(`${pics(2)}\n\nBetween\n\n![Robot 3](/media/toys/robot/p3.webp)\n\nAfter\n`));
  assert.equal(split.pictures.length, 2);
  assert.equal(split.html, '<p>Between</p>\n<p><img src="/media/toys/robot/p3.webp" alt="Robot 3"></p>\n<p>After</p>\n');
  // an empty alt falls back to the title; the alt is plain text (entities undone, React escapes it again)
  const alt = toyHero(robot('![](/media/toys/robot/p1.webp)\n\n![A & "B"](/media/toys/robot/p2.webp)\n'));
  assert.deepEqual(alt.pictures.map((p) => p.alt), ["Robot", 'A & "B"']);
  // a picture inside a paragraph with text is body, not panel
  const inline = toyHero(robot("See ![R](/media/toys/robot/p1.webp) here\n"));
  assert.deepEqual([inline.pictures, inline.html.includes("p1.webp")], [[], true]);
});

test("toys: the front matter image comes first, then the opening pictures (the same file is not listed twice)", () => {
  const exists = (u) => [OWN, COVER].includes(u);
  const withOwn = toyHero(robot("![R](/media/toys/robot/cover.webp)\n\n![S](/media/toys/robot/p2.webp)\n\nText\n", "image: own.webp\n"), exists);
  assert.deepEqual(withOwn.pictures.map((p) => p.src), [OWN, COVER, "/media/toys/robot/p2.webp"]);
  assert.equal(withOwn.html, "<p>Text</p>\n");
  const same = toyHero(robot("![R](/media/toys/robot/own.webp)\n\n![S](/media/toys/robot/p2.webp)\n", "image: own.webp\n"), exists);
  assert.deepEqual(same.pictures.map((p) => p.src), [OWN, "/media/toys/robot/p2.webp"]);
  const gone = toyHero(robot("![R](/media/toys/robot/p1.webp)\n", "image: gone.webp\n"), exists);     // a missing `image` is skipped
  assert.deepEqual(gone.pictures.map((p) => p.src), ["/media/toys/robot/p1.webp"]);
});

import { clampSlide, slideAt, deepLink, keyTarget } from "../src/gallery-core.mjs";

test("picture strip: the slide in view, #pic-N links and the arrow keys (held at the ends)", () => {
  assert.deepEqual([clampSlide(-1, 3), clampSlide(1, 3), clampSlide(7, 3), clampSlide(0, 0)], [0, 1, 2, 0]);
  assert.deepEqual([slideAt(0, 500, 3), slideAt(240, 500, 3), slideAt(260, 500, 3), slideAt(1000, 500, 3), slideAt(2000, 500, 3), slideAt(300, 0, 3)], [0, 0, 1, 2, 2, 0]);
  assert.deepEqual([deepLink("#pic-1", 2), deepLink("#pic-2", 2), deepLink("#pic-3", 2), deepLink("#pic-0", 2), deepLink("#pic-x", 2), deepLink("", 2), deepLink("#main", 2)], [0, 1, -1, -1, -1, -1, -1]);
  assert.deepEqual([keyTarget("ArrowRight", 0, 3), keyTarget("ArrowRight", 2, 3), keyTarget("ArrowLeft", 0, 3), keyTarget("ArrowLeft", 2, 3), keyTarget("Home", 2, 3), keyTarget("End", 0, 3), keyTarget("Enter", 1, 3)], [1, 2, 0, 1, 0, 2, null]);
});

import { analyticsTags } from "../scripts/template.mjs";
test("analytics: nothing without an id, a checked id gives the one gtag loader, a bad id throws", () => {
  assert.equal(analyticsTags(""), "");
  const t = analyticsTags("G-ABC1234567");
  assert.match(t, /googletagmanager\.com\/gtag\/js\?id=G-ABC1234567/);
  assert.match(t, /doNotTrack/);
  assert.throws(() => analyticsTags('G-1");alert(1)//'));
});
