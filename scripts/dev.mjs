// Dev server: renders pages on request from the current files, drafts and future posts included.
import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, normalize, extname } from "node:path";
import { resolveMedia } from "./media.mjs";
import { createServer } from "vite";
import { site } from "../site.config.mjs";
import { buildModel, selectPublished, todayIn } from "./content.mjs";
import { loadPosts, loadPages } from "./load.mjs";
import { buildRoutes } from "./routes.mjs";
import { document_ } from "./template.mjs";

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
const port = Number(process.env.PORT || 5173);

// Folder with your full-size originals (outside git). docker.sh mounts it read-only at /originals when it exists.
const ORIGINALS = process.env.BLOG_ORIGINALS && existsSync(process.env.BLOG_ORIGINALS) ? process.env.BLOG_ORIGINALS : "";
const cookieMode = (req) => /(?:^|;\s*)img=(original|web)(?:;|$)/.exec(req.headers.cookie || "")?.[1];

const TYPES = { ".css": "text/css", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif", ".svg": "image/svg+xml" };
/** /media/<section>/x (web version, or your original in original mode) and /post-css/<section>/x.css, from content/ and content/_private/ (dev only). */
function serveContentFile(req, urlPath, res) {
  const m = /^\/(media|post-css)\/([a-z0-9-]+)\/(.+)$/.exec(urlPath);
  if (!m) return false;
  const [, kind, section, rest] = m;
  let file = null, source = "web";
  if (kind === "media") {
    const r = resolveMedia({ section, rest: decodeURIComponent(rest), mode: cookieMode(req) ?? "web", originals: ORIGINALS });
    if (r) ({ file, source } = r);
  } else {
    const rel = normalize(decodeURIComponent(rest));
    if (rel.startsWith("..") || rel.startsWith("/")) return false;
    for (const base of ["content", join("content", "_private")]) {
      const f = join(base, section, rel);
      if (existsSync(f) && statSync(f).isFile()) { file = f; break; }
    }
  }
  if (!file) return false;
  res.writeHead(200, { "content-type": TYPES[extname(file).toLowerCase()] || "application/octet-stream", "x-media-source": source, "cache-control": "no-store" });
  createReadStream(file).pipe(res);
  return true;
}

/** Dev-only corner link that switches between the web versions and your originals. */
function modeBadge(mode) {
  const next = mode === "original" ? "web" : "original";
  const label = !ORIGINALS ? "原圖資料夾未掛載" : mode === "original" ? "圖片：原圖 ⇄ 切到網頁版" : "圖片：網頁版 ⇄ 切到原圖";
  return `<a href="${ORIGINALS ? `?img=${next}` : "#"}" style="position:fixed;right:.6rem;bottom:.6rem;z-index:99;padding:.35rem .6rem;border-radius:6px;background:#222;color:#fff;font:13px/1.2 system-ui;text-decoration:none;opacity:.85">${label}</a>`;
}

const server = http.createServer((req, res) => {
  if (serveContentFile(req, new URL(req.url, "http://x").pathname, res)) return;
  vite.middlewares(req, res, async () => {
    try {
      const parsed = new URL(req.url, "http://x");
      const url = parsed.pathname;
      const asked = parsed.searchParams.get("img");
      const mode = asked === "original" || asked === "web" ? asked : cookieMode(req) ?? "web";
      const path = url.endsWith("/") || url.endsWith(".html") ? url : url + "/";
      const posts = selectPublished(loadPosts({ includePrivate: true }), todayIn(site.timezone), { includeDrafts: true });
      const routes = buildRoutes(buildModel(posts, site.langs, site.sections), loadPages());
      const idx = routes.find((r) => r.searchIndex?.href === url);
      if (idx) { res.writeHead(200, { "content-type": "application/json; charset=utf-8" }).end(idx.searchIndex.text); return; }
      const route = routes.find((r) => r.path === path) ?? { ...routes.find((r) => r.kind === "notfound"), path };
      const { render } = await vite.ssrLoadModule("/src/entry-server.tsx");
      const html = (await vite.transformIndexHtml(url, document_({ route, rendered: render(route), assets: { js: "/src/entry-client.tsx", css: [] } })))
        .replace("</body>", `${modeBadge(mode)}</body>`);
      const headers = { "content-type": "text/html; charset=utf-8" };
      if (asked === "original" || asked === "web") headers["set-cookie"] = `img=${asked}; Path=/; SameSite=Lax`;
      res.writeHead(route.kind === "notfound" ? 404 : 200, headers).end(html);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" }).end(String(e.stack || e));
    }
  });
});
server.listen(port, "0.0.0.0", () => console.log(`dev server: http://localhost:${port}/ (drafts included)`));
