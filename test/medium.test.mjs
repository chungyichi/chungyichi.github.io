import test from "node:test";
import assert from "node:assert/strict";
import { convertMedium, slugFromFilename, guessLang } from "../scripts/medium.mjs";

const SAMPLE = `<!DOCTYPE html><html><head><title>Fallback</title></head><body><article class="h-entry">
<header><h1 class="p-name">京都三日</h1></header>
<section data-field="subtitle" class="p-summary">慢慢走的一趟</section>
<section data-field="body" class="e-content"><section class="section"><div class="section-content"><div class="section-inner">
<h3 class="graf graf--h3">第一天</h3>
<p class="graf" onclick="x()">早上到 <a href="https://example.org/">站</a><script>alert(1)</script></p>
<figure class="graf graf--figure"><div class="aspectRatioPlaceholder"><img class="graf-image" src="https://cdn-images-1.medium.com/max/800/1*abc.jpeg"></div><figcaption class="imageCaption">鴨川</figcaption></figure>
<h4 class="graf graf--h4">午餐</h4>
<figure class="graf--iframe"><iframe src="https://gist.github.com/x/1" width="700"></iframe></figure>
<p></p>
</div></div></section></section>
<footer><a class="p-author h-card" href="https://medium.com/@x">X</a> <time class="dt-published" datetime="2023-04-02T10:00:00.000Z">April 2</time></footer></article></body></html>`;

test("converts a Medium post: title, date, summary, headings, localized image, embed as link, nothing unsafe", async () => {
  const fetched = [];
  const r = await convertMedium(SAMPLE, { mediaDir: "/media/life/kyoto", fetchImage: async (u) => { fetched.push(u); return { bytes: Buffer.from("x"), type: "image/jpeg" }; } });
  assert.equal(r.title, "京都三日");
  assert.equal(r.date, "2023-04-02");
  assert.equal(r.summary, "慢慢走的一趟");
  assert.deepEqual(fetched, ["https://cdn-images-1.medium.com/max/800/1*abc.jpeg"]);
  assert.equal(r.files.length, 1);
  assert.match(r.files[0].name, /^[0-9a-f]{12}\.jpg$/);
  assert.ok(r.body.includes("<h2>第一天</h2>") && r.body.includes("<h3>午餐</h3>"));
  assert.ok(r.body.includes(`src="/media/life/kyoto/${r.files[0].name}"`));
  assert.ok(r.body.includes("<figcaption") && r.body.includes("鴨川"));
  assert.ok(r.body.includes('<a href="https://gist.github.com/x/1" rel="noopener noreferrer">') && !r.body.includes("iframe"));
  assert.ok(!/script|onclick|<p><\/p>/.test(r.body));
  assert.equal(r.notes.length, 1);
});

test("the same picture used twice is downloaded once", async () => {
  const html = SAMPLE.replace("<h4", '<figure><img src="https://cdn-images-1.medium.com/max/800/1*abc.jpeg"></figure><h4');
  let n = 0;
  const r = await convertMedium(html, { mediaDir: "/m", fetchImage: async () => { n++; return { bytes: Buffer.from("x"), type: "image/jpeg" }; } });
  assert.equal(n, 1);
  assert.equal(r.files.length, 1);
});

test("a non-image or unknown type is an error, not a broken post", async () => {
  await assert.rejects(convertMedium(SAMPLE, { mediaDir: "/m", fetchImage: async () => ({ bytes: Buffer.from("x"), type: "text/html" }) }), /unsupported image type/);
});

test("file names and language", () => {
  assert.equal(slugFromFilename("2020-01-01_My-First-Trip-1a2b3c4d5e6f.html"), "my-first-trip");
  assert.match(slugFromFilename("2020-01-01_京都三日-1a2b3c4d5e6f.html"), /^post-[0-9a-f]{8}$/);
  assert.equal(guessLang("京都三日 慢慢走"), "zh");
  assert.equal(guessLang("Three days in Kyoto"), "en");
});
