// A toy from a shop page: its og:title, og:image and price, and the picture downloaded. Pure except the injected fetch and DNS lookup,
// so it can be tested without a network. The command line around it is toy-add.mjs (+ toy-add.sh on the host).
import { parse } from "parse5";
import { ContentError } from "./errors.mjs";

// Shops the script may talk to. Anything else is refused with a message, never fetched: add a host here on purpose.
export const TOY_HOSTS = ["www.shopping.bin-music.com.tw", "img.91app.com", "www.beast-kingdom.com.tw", "www.ikea.com.tw", "www.momoshop.com.tw", "i1.momoshop.com.tw"];
export const USER_AGENT = "chungyichi.github.io-toy-add/1.0 (+https://chungyichi.github.io)";   // says what it is; not a browser
export const IMAGE_TYPES = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
export const MAX_PAGE = 2 * 1024 * 1024, MAX_IMAGE = 10 * 1024 * 1024, MAX_REDIRECTS = 5, TIMEOUT = 20_000;
// A page that asks for a login, a captcha or an age check has no product picture for us; say so instead of trying anything.
const WALL = /captcha|challenge|\bverif(y|ication)\b|access denied|just a moment|登入|\b(log ?in|sign ?in)\b|年齡|\bage (check|gate|verification)\b/i;
export const SUPPLY_PICTURE = "please supply the picture yourself: run again with --image <file> --title \"...\"";

/** The address is https and its host is on the list; returns the URL object. */
export function checkHost(raw, hosts = TOY_HOSTS) {
  let u;
  try { u = new URL(String(raw)); } catch { throw new ContentError(`${raw}: not a valid address`); }
  if (u.protocol !== "https:") throw new ContentError(`${u.href}: only https addresses are fetched`);
  if (u.username || u.password) throw new ContentError(`${u.href}: an address with credentials is refused`);
  if (!hosts.includes(u.hostname)) throw new ContentError(`${u.hostname} is not a known shop; if you trust it, add it to TOY_HOSTS in scripts/toy.mjs (a short link such as tw.shp.ee is not followed: open it in a browser and pass the real page, or ${SUPPLY_PICTURE})`);
  return u;
}

/** Loopback, private, link-local and unspecified addresses (IPv4, IPv6, and IPv4 mapped in IPv6): never fetched, even via a redirect or a rebound name. */
export function isPrivateAddress(ip) {
  let a = String(ip).toLowerCase();
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(a);
  if (mapped) a = mapped[1];
  const v4 = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(a);
  if (v4) {
    const [x, y] = [Number(v4[1]), Number(v4[2])];
    return x === 0 || x === 10 || x === 127 || (x === 169 && y === 254) || (x === 172 && y >= 16 && y <= 31) || (x === 192 && y === 168) || (x === 100 && y >= 64 && y <= 127);
  }
  return a === "::" || a === "::1" || /^f[cd]/.test(a) || /^fe[89ab]/.test(a) || !a.includes(":");   // anything that is not an address counts as unsafe
}

/**
 * GET with the rules: https + allowlisted host at every hop, no private addresses, redirects followed by hand (at most 5), timeout, size cap.
 * @param deps.fetch   like the global fetch
 * @param deps.lookup  async (hostname) => [{ address }]
 * @returns { url (final), status, type, bytes }
 */
export async function fetchChecked(raw, { fetch, lookup, hosts = TOY_HOSTS, maxBytes = MAX_PAGE, accept = "*/*" }) {
  let u = checkHost(raw, hosts);
  for (let hop = 0; ; hop++) {
    const addrs = await lookup(u.hostname);
    const bad = addrs.map((a) => a.address).find(isPrivateAddress);
    if (!addrs.length || bad) throw new ContentError(`${u.hostname} resolves to ${bad || "nothing"}; refusing`);
    const res = await fetch(u.href, { redirect: "manual", signal: AbortSignal.timeout(TIMEOUT), headers: { "user-agent": USER_AGENT, accept } });
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      if (hop >= MAX_REDIRECTS) throw new ContentError(`${raw}: too many redirects`);
      const to = res.headers.get("location");
      if (!to) throw new ContentError(`${u.href}: redirect without a location`);
      u = checkHost(new URL(to, u.href).href, hosts);                   // every hop must pass the same rules
      continue;
    }
    const length = Number(res.headers.get("content-length") || 0);
    if (length > maxBytes) throw new ContentError(`${u.href}: ${length} bytes is larger than ${maxBytes}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > maxBytes) throw new ContentError(`${u.href}: larger than ${maxBytes} bytes`);
    return { url: u.href, status: res.status, type: (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase(), bytes };
  }
}

const attr = (n, name) => n.attrs?.find((a) => a.name === name)?.value;
const kids = (n) => n.content?.childNodes || n.childNodes || [];
function* walk(n) { if (n.tagName) yield n; for (const c of kids(n)) yield* walk(c); }
const text = (n) => (n.nodeName === "#text" ? n.value : kids(n).map(text).join(""));

/** og:title, og:image (https preferred), price and currency from the page's meta tags; `wall` names a login/captcha/age page. */
export function parseProductPage(html) {
  const doc = parse(String(html));
  const meta = {};
  for (const n of walk(doc)) {
    if (n.tagName !== "meta") continue;
    const key = attr(n, "property") || attr(n, "itemprop") || attr(n, "name"), val = attr(n, "content");
    if (key && val) (meta[key] ??= []).push(val.trim());
  }
  const titleEl = [...walk(doc)].find((n) => n.tagName === "title");
  const pageTitle = titleEl ? text(titleEl).replace(/\s+/g, " ").trim() : "";
  const images = (meta["og:image"] || []).filter((v) => /^https?:\/\//i.test(v));
  const image = images.find((v) => v.startsWith("https://")) || images[0]?.replace(/^http:/i, "https:") || "";
  const title = (meta["og:title"]?.[0] || pageTitle).replace(/\s*NT\$\s?[\d,]+(\.\d+)?\s*$/, "").replace(/\s+-\s+momo購物網.*$/, "").replace(/\s+\|\s+[^|]+$/, "").trim();   // some shops append the price, many a " | Shop name" (momo: " - momo購物網 - ...")
  const price = (meta["product:price:amount"]?.[0] || meta.price?.[0] || "").replace(/,/g, "");   // momo writes "1,856"
  const currency = meta["product:price:currency"]?.[0] || meta.priceCurrency?.[0] || "";
  const wall = WALL.test(pageTitle) ? `the page looks like a login, captcha or age check ("${pageTitle.slice(0, 60)}")` : "";
  return { title, image, price, currency, wall };
}

/** Advertising and tracking parameters that say where a visitor came from, not which product it is. Product ids and ?lang= stay. */
const TRACKING = /^(utm_.*|gad_.*|gclid|gclsrc|gbraid|wbraid|dclid|fbclid|msclkid|yclid|igshid|srsltid|mc_cid|mc_eid|_ga|_gl|osm|d_id|uls_trackid)$/i;

/** The address without tracking parameters and without a #fragment: the clean link to keep. A string that is not a URL is returned as it is. */
export function cleanUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { return raw; }
  for (const k of [...u.searchParams.keys()]) if (TRACKING.test(k)) u.searchParams.delete(k);
  u.hash = "";
  return u.href;
}

/** "15525.00" + "TWD" -> "NT$15,525"; other currencies are shown as "EUR 12.50"; nothing when the page had no price. */
export function formatPrice(price, currency) {
  const n = Number(price);
  if (!price || !Number.isFinite(n)) return "";
  const amount = n.toLocaleString("en-US", { maximumFractionDigits: Number.isInteger(n) ? 0 : 2 });
  return currency === "TWD" || currency === "" ? `NT$${amount}` : `${currency} ${amount}`;
}

/** ASCII slug of a product title (CJK falls out: pass --slug then). */
export const slugOfTitle = (title) => String(title).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

/**
 * Fetch the shop page and its product picture.
 * @returns { title, price (formatted), source (final page address), image: { name, bytes, type, url } }
 */
export async function fetchToy(raw, deps) {
  const page = await fetchChecked(cleanUrl(raw), { ...deps, maxBytes: MAX_PAGE, accept: "text/html" });
  if ([401, 403, 407, 429, 503].includes(page.status)) throw new ContentError(`${page.url}: HTTP ${page.status} (the shop wants a login or a challenge); ${SUPPLY_PICTURE}`);
  if (page.status !== 200) throw new ContentError(`${page.url}: HTTP ${page.status}`);
  const info = parseProductPage(page.bytes.toString("utf8"));
  if (info.wall) throw new ContentError(`${page.url}: ${info.wall}; ${SUPPLY_PICTURE}`);
  if (!info.image) throw new ContentError(`${page.url}: no og:image on the page; ${SUPPLY_PICTURE}`);
  if (!info.title) throw new ContentError(`${page.url}: no title on the page; pass --title`);
  const img = await fetchChecked(info.image, { ...deps, maxBytes: MAX_IMAGE, accept: Object.keys(IMAGE_TYPES).join(", ") });
  if (img.status !== 200) throw new ContentError(`${img.url}: HTTP ${img.status}`);
  const ext = IMAGE_TYPES[img.type];
  if (!ext) throw new ContentError(`${img.url}: not a JPEG, PNG or WebP picture (${img.type || "no content-type"})`);
  return { title: info.title, price: formatPrice(info.price, info.currency), source: cleanUrl(page.url), image: { name: `cover${ext}`, bytes: img.bytes, type: img.type, url: img.url } };
}

/**
 * The draft post: title, source and price filled in, owner from the option or a comment to fill, summary left empty, the picture in the body
 * (the toy page shows it beside the facts). The day the price was seen goes in a comment: the page does not show it.
 */
export function draftText({ title, source, owner = "", tags = [], slug, imageName, price = "", date, owners = [] }) {
  const web = imageName.replace(/\.[^.]+$/, ".webp");                    // what photo.sh makes of the original
  const ownerLine = owner ? `owner: ${owner}` : `# owner: ${owners.join(" | ") || "me"}   (required before publishing)`;
  const fm = [`title: ${JSON.stringify(title)}`, 'summary: ""', "draft: true", ownerLine, ...(tags.length ? [`tags: ${tags.join(", ")}`] : []), `source: ${source}`,
    ...(price ? [`price: ${JSON.stringify(price)}`, `# price as shown on ${date}`] : [])];
  return `---\n${fm.join("\n")}\n---\n![${title.replace(/[[\]]/g, "")}](/media/toys/${slug}/${web})\n`;
}
