#!/usr/bin/env node
// One-off cover fetcher for games (content/games). Run by hand when games are added; it is not a crawler and never runs in CI.
//   node scripts/game-cover.mjs <slug> [<slug> ...]        fetch the cover of content/games/*-<slug>.zh.md
//   node scripts/game-cover.mjs slug="English name"        search that name instead of the post's `original`
//   node scripts/game-cover.mjs --all-missing              every game that has no media/<slug>/cover.webp yet
// Source order, first exact name match wins (nearly the same name, no guessing; no match is reported, not filled in):
//   1. Nintendo Europe's public game search (square packshot, Nintendo Switch games)
//   2. Steam store search (library_600x900.jpg, else header.jpg)
//   3. English Wikipedia: the picture named in the game's infobox
// The original goes to ~/sites/blog-originals/games/<slug>/cover.<ext> (outside git; never overwritten). Then run
//   scripts/photo.sh ~/sites/blog-originals/games/<slug> content/games/media/<slug>
//   scripts/og-image.sh ~/sites/blog-originals/games/<slug>/cover.<ext> content/games/media/<slug> --square
// One request per second, a plain client name, no personal data in any request.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const UA = "game-cover-tool/1 (personal blog, one-off)";
const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const ORIG = path.join(os.homedir(), "sites/blog-originals/games");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let last = 0;
async function get(url) {
  const wait = last + 1000 - Date.now();
  if (wait > 0) await sleep(wait);
  last = Date.now();
  for (let tries = 0; ; tries++) {
    const r = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow", signal: AbortSignal.timeout(30000) });
    if (r.status !== 429 || tries >= 3) return r;   // "slow down": wait as long as the site says, then try again
    await sleep(Math.min(60, Number(r.headers.get("retry-after")) || 15) * 1000);
    last = Date.now();
  }
}
const json = async (url) => { const r = await get(url); return r.ok ? r.json() : null; };

// Names are compared without case, marks, edition words and punctuation.
const norm = (s) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
  .replace(/nintendo switch 2 edition|[™®©]/g, "").replace(/[^a-z0-9぀-ヿ一-鿿]+/g, "");

async function nintendo(name) {
  const u = new URL("https://searching.nintendo-europe.com/en/select");
  u.search = new URLSearchParams({ q: name, rows: "8", fq: "type:GAME", fl: "title,image_url" });
  const d = await json(u);
  const hit = d?.response?.docs?.find((x) => x.image_url && norm(x.title) === norm(name));
  return hit && { url: hit.image_url, note: `Nintendo EU "${hit.title}"` };
}

async function steam(name) {
  const d = await json(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(name)}&cc=us&l=english`);
  const hit = d?.items?.find((x) => x.type === "app" && norm(x.name) === norm(name));
  if (!hit) return null;
  // newer apps keep their art under store_item_assets, older ones under the plain apps path
  for (const base of [`https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${hit.id}/`, `https://cdn.akamai.steamstatic.com/steam/apps/${hit.id}/`]) {
    for (const f of ["library_600x900.jpg", "header.jpg"]) {
      const r = await get(base + f);
      if (r.ok) return { url: base + f, note: `Steam ${hit.id} "${hit.name}"`, res: r };
    }
  }
  return null;
}

async function wikipedia(name) {
  const api = "https://en.wikipedia.org/w/api.php";
  const s = await json(`${api}?action=query&list=search&srlimit=4&format=json&srsearch=${encodeURIComponent(name + " video game")}`);
  for (const p of s?.query?.search ?? []) {
    if (norm(p.title.replace(/\(.*\)/, "")) !== norm(name)) continue;
    const w = await json(`${api}?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&titles=${encodeURIComponent(p.title)}`);
    const text = w?.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content ?? "";
    const m = text.match(/\|\s*image\s*=\s*([^\n|]+?)\s*(?:\n|\|)/i);
    if (!m) continue;
    const f = m[1].replace(/^(file|image):/i, "").trim();
    if (/logo/i.test(f)) continue;   // a series logo is not a cover
    const i = await json(`${api}?action=query&prop=imageinfo&iiprop=url&iiurlwidth=600&format=json&formatversion=2&titles=${encodeURIComponent("File:" + f)}`);
    const url = i?.query?.pages?.[0]?.imageinfo?.[0]?.thumburl ?? i?.query?.pages?.[0]?.imageinfo?.[0]?.url;
    if (url) return { url, note: `Wikipedia "${p.title}" (${f})` };
  }
  return null;
}

function gameFile(slug) {
  const dir = path.join(ROOT, "content/games");
  const f = fs.readdirSync(dir).find((x) => x.endsWith(`-${slug}.zh.md`));
  return f && path.join(dir, f);
}
const field = (text, k) => text.match(new RegExp(`^${k}:\\s*"?(.*?)"?\\s*$`, "m"))?.[1];

async function one(slug) {
  const f = gameFile(slug);
  if (!f) return console.log(`${slug}\tNO POST`);
  const text = fs.readFileSync(f, "utf8");
  const name = field(text, "original") || field(text, "title");
  const out = path.join(ORIG, slug);
  if (fs.existsSync(out) && fs.readdirSync(out).some((x) => x.startsWith("cover."))) return console.log(`${slug}\texists, kept`);
  let hit = null;
  const names = [...new Set([override[slug] ?? name, (override[slug] ?? name).split(/:| - /)[0].trim()])];   // "Title: Subtitle" also as "Title"
  for (const n of names) {
    for (const src of [nintendo, steam, wikipedia]) { hit = await src(n).catch((e) => { console.error(`  ${src.name}("${n}"): ${e.message}`); return null; }); if (hit) break; }
    if (hit) break;
  }
  if (!hit) return console.log(`${slug}\tNOT FOUND\t${name}`);
  const r = hit.res ?? (await get(hit.url));
  const type = r.headers.get("content-type") ?? "";
  if (!r.ok || !/^image\/(jpeg|png|webp)/.test(type)) return console.log(`${slug}\tBAD IMAGE (${r.status} ${type})\t${hit.url}`);
  const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, `cover.${ext}`), Buffer.from(await r.arrayBuffer()));
  console.log(`${slug}\t${hit.note}\t${hit.url}`);
}

// `slug=English name` on the command line replaces the name searched for (a game whose `original` is not its English title)
const override = {};
const args = process.argv.slice(2).filter((a) => { const m = a.match(/^([a-z0-9-]+)=(.+)$/); if (m) override[m[1]] = m[2]; return !m; }).concat(
  process.argv.slice(2).filter((a) => /^[a-z0-9-]+=/.test(a)).map((a) => a.split("=")[0]));
if (!args.length) { console.error(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1, 8).join("\n")); process.exit(2); }
const slugs = args[0] === "--all-missing"
  ? fs.readdirSync(path.join(ROOT, "content/games")).filter((x) => x.endsWith(".zh.md")).map((x) => x.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.zh\.md$/, ""))
      .filter((s) => !fs.existsSync(path.join(ROOT, "content/games/media", s, "cover.webp")))
  : args;
for (const s of slugs) await one(s);
