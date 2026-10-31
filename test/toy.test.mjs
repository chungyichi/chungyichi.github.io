import test from "node:test";
import assert from "node:assert/strict";
import { checkHost, isPrivateAddress, fetchChecked, parseProductPage, formatPrice, slugOfTitle, fetchToy, draftText, MAX_IMAGE } from "../scripts/toy.mjs";
import { parseFrontMatter, parsePost } from "../scripts/content.mjs";

const HOSTS = ["shop.example", "img.example"];
const PAGE = `<!DOCTYPE html><html><head><title>Robot Kit | Shop</title>
<meta property="og:title" content="Robot Kit 1/12 NT$1,250" />
<meta property="og:image" content="http://img.example/p/1.jpg">
<meta property="og:image" content="https://img.example/p/1.jpg">
<meta itemprop="priceCurrency" content="TWD" /><meta itemprop="price" content="1250.00" />
</head><body><p>hi</p></body></html>`;

/** A fake network: { url: { status, headers, body } }; records what was asked for. */
function net(routes) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, init });
    const r = routes[url];
    if (!r) return { status: 404, headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(0) };
    const body = Buffer.from(r.body ?? "");
    return { status: r.status ?? 200, headers: new Headers(r.headers ?? {}), arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) };
  };
  const lookup = async (host) => (routes.__dns?.[host] ?? [{ address: "203.0.113.5" }]);
  return { fetch, lookup, calls, hosts: HOSTS };
}

test("only https addresses on the allowlist are fetched; the message says how to add a host", () => {
  assert.equal(checkHost("https://shop.example/x?y=1", HOSTS).href, "https://shop.example/x?y=1");
  assert.throws(() => checkHost("http://shop.example/x", HOSTS), /only https/);
  assert.throws(() => checkHost("https://tw.shp.ee/abc", HOSTS), /not a known shop.*TOY_HOSTS.*short link/);
  assert.throws(() => checkHost("https://user:pw@shop.example/", HOSTS), /credentials/);
  assert.throws(() => checkHost("not a url", HOSTS), /not a valid address/);
  assert.throws(() => checkHost("https://127.0.0.1/", HOSTS), /not a known shop/);
});

test("private, loopback, link-local and mapped addresses are recognised", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "0.0.0.0", "100.64.0.1", "::1", "::", "fc00::1", "fd12::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1", "garbage"]) assert.ok(isPrivateAddress(ip), ip);
  for (const ip of ["203.0.113.5", "172.32.0.1", "8.8.8.8", "2606:4700::1", "::ffff:8.8.8.8"]) assert.ok(!isPrivateAddress(ip), ip);
});

test("redirects are followed by hand across the allowlist only, with an honest user agent and no automatic redirect", async () => {
  const n = net({
    "https://shop.example/short": { status: 302, headers: { location: "/item/1" } },
    "https://shop.example/item/1": { status: 301, headers: { location: "https://img.example/final" } },
    "https://img.example/final": { body: "ok", headers: { "content-type": "text/plain; charset=utf-8" } },
    "https://shop.example/away": { status: 302, headers: { location: "https://evil.example/x" } },
    "https://shop.example/loop": { status: 302, headers: { location: "https://shop.example/loop" } },
  });
  const r = await fetchChecked("https://shop.example/short", n);
  assert.deepEqual([r.url, r.status, r.type, r.bytes.toString()], ["https://img.example/final", 200, "text/plain", "ok"]);
  assert.deepEqual(n.calls.map((c) => c.url), ["https://shop.example/short", "https://shop.example/item/1", "https://img.example/final"]);
  assert.ok(n.calls.every((c) => c.init.redirect === "manual" && /^chungyichi\.github\.io-toy-add\//.test(c.init.headers["user-agent"]) && !/Mozilla/.test(c.init.headers["user-agent"])));
  await assert.rejects(fetchChecked("https://shop.example/away", n), /evil\.example is not a known shop/);
  await assert.rejects(fetchChecked("https://shop.example/loop", n), /too many redirects/);
});

test("a host that resolves to a private or loopback address is not fetched, even on an allowlisted name", async () => {
  const n = net({ "https://shop.example/x": { body: "x" }, __dns: { "shop.example": [{ address: "203.0.113.5" }, { address: "127.0.0.1" }], "img.example": [] } });
  await assert.rejects(fetchChecked("https://shop.example/x", n), /resolves to 127\.0\.0\.1; refusing/);
  await assert.rejects(fetchChecked("https://img.example/x", n), /resolves to nothing/);
  assert.equal(n.calls.length, 0);
});

test("size limits: a declared or an actual body over the limit is refused", async () => {
  const n = net({ "https://shop.example/big": { body: "x", headers: { "content-length": String(MAX_IMAGE + 1) } }, "https://shop.example/fat": { body: "x".repeat(20) } });
  await assert.rejects(fetchChecked("https://shop.example/big", { ...n, maxBytes: MAX_IMAGE }), /larger than/);
  await assert.rejects(fetchChecked("https://shop.example/fat", { ...n, maxBytes: 10 }), /larger than 10 bytes/);
});

test("the product page gives title (price stripped), an https og:image, and the price", () => {
  const p = parseProductPage(PAGE);
  assert.deepEqual(p, { title: "Robot Kit 1/12", image: "https://img.example/p/1.jpg", price: "1250.00", currency: "TWD", wall: "" });
  assert.equal(parseProductPage(PAGE.replace('<meta property="og:image" content="https://img.example/p/1.jpg">', "")).image, "https://img.example/p/1.jpg");   // http upgraded
  assert.equal(parseProductPage("<title>Design Inspiration</title>").wall, "");
  assert.match(parseProductPage("<title>請先登入 | Shop</title>").wall, /login, captcha or age check/);
  assert.match(parseProductPage("<title>Just a moment...</title>").wall, /login, captcha or age check/);
  assert.equal(parseProductPage("<p>nothing</p>").image, "");
  assert.equal(parseProductPage('<meta property="og:title" content="DVÄRGMÅS - 遊戲隧道 | IKEA 線上購物" />').title, "DVÄRGMÅS - 遊戲隧道");   // " | Shop name" is cut; a full-width ｜ inside a title is not
  assert.equal(parseProductPage('<meta property="og:title" content="MAYDAY MAX｜25TH 紀念" />').title, "MAYDAY MAX｜25TH 紀念");
});

test("price formatting and slugs", () => {
  assert.equal(formatPrice("15525.00", "TWD"), "NT$15,525");
  assert.equal(formatPrice("12.5", "EUR"), "EUR 12.5");
  assert.equal(formatPrice("", "TWD"), "");
  assert.equal(formatPrice("abc", "TWD"), "");
  assert.equal(slugOfTitle("MAYDAY MAX｜25TH ANNIVERSARY 合體"), "mayday-max-25th-anniversary");
  assert.equal(slugOfTitle("機器人"), "");
});

test("fetchToy: page then picture, only JPEG/PNG/WebP; a wall, a missing og:image or a login status stops with the supply-it-yourself message", async () => {
  const routes = { "https://shop.example/item/1": { body: PAGE, headers: { "content-type": "text/html; charset=utf-8" } }, "https://img.example/p/1.jpg": { body: "JPEGDATA", headers: { "content-type": "image/jpeg" } } };
  const n = net(routes);
  const r = await fetchToy("https://shop.example/item/1", n);
  assert.deepEqual([r.title, r.price, r.source, r.image.name, r.image.url, r.image.bytes.toString()], ["Robot Kit 1/12", "NT$1,250", "https://shop.example/item/1", "cover.jpg", "https://img.example/p/1.jpg", "JPEGDATA"]);
  await assert.rejects(fetchToy("https://shop.example/item/1", net({ ...routes, "https://img.example/p/1.jpg": { body: "<svg/>", headers: { "content-type": "image/svg+xml" } } })), /not a JPEG, PNG or WebP/);
  await assert.rejects(fetchToy("https://shop.example/item/1", net({ ...routes, "https://shop.example/item/1": { status: 403, body: "" } })), /HTTP 403.*supply the picture yourself/);
  await assert.rejects(fetchToy("https://shop.example/item/1", net({ ...routes, "https://shop.example/item/1": { body: "<title>Login</title>" } })), /login, captcha or age check.*supply the picture yourself/);
  await assert.rejects(fetchToy("https://shop.example/item/1", net({ ...routes, "https://shop.example/item/1": { body: "<title>Thing</title>" } })), /no og:image.*supply the picture yourself/);
  await assert.rejects(fetchToy("https://tw.shp.ee/abc", n), /not a known shop/);
});

test("the draft is a valid toys post: draft, title, source, price in the front matter (the day seen only as a comment), picture in the body; owner given or left as a comment to fill", () => {
  const given = draftText({ title: "Robot [Kit]", source: "https://shop.example/item/1", owner: "son", tags: ["公仔", "機器人"], slug: "robot", imageName: "cover.jpg", price: "NT$1,250", date: "2026-10-21" });
  const p = parsePost("2026-10-21-robot.zh.md", given, undefined, "toys");
  assert.deepEqual([p.draft, p.title, p.owner, p.source, p.tags, p.price], [true, "Robot [Kit]", "son", "https://shop.example/item/1", ["公仔", "機器人"], "NT$1,250"]);
  assert.ok(p.html.includes('<img src="/media/toys/robot/cover.webp" alt="Robot Kit">') && !p.html.includes("NT$1,250") && !p.html.includes("2026-10-21"));
  assert.match(given, /^price: "NT\$1,250"\n# price as shown on 2026-10-21$/m);
  const blank = draftText({ title: "T", source: "https://shop.example/1", slug: "t", imageName: "cover.png", date: "2026-10-21", owners: ["me", "son"] });
  assert.match(blank, /^# owner: me \| son/m);
  assert.ok(!blank.includes("price"));
  assert.equal(parseFrontMatter(blank).data.owner, undefined);
  assert.deepEqual([parsePost("2026-10-21-t.zh.md", blank, undefined, "toys").owner, parsePost("2026-10-21-t.zh.md", blank, undefined, "toys").price], ["", ""]);
});
