// Dev server: renders pages on request from the current files, drafts and future posts included.
import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, normalize, extname } from "node:path";
import { createServer } from "vite";
import { site } from "../site.config.mjs";
import { buildModel, selectPublished, todayIn } from "./content.mjs";
import { loadPosts, loadPages } from "./load.mjs";
import { buildRoutes } from "./routes.mjs";
import { document_ } from "./template.mjs";

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
const port = Number(process.env.PORT || 5173);

const TYPES = { ".css": "text/css", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif", ".svg": "image/svg+xml" };
/** /media/<section>/x and /post-css/<section>/x.css from content/<section>/... (and content/_private/<section>/... in dev only). */
function serveContentFile(urlPath, res) {
  const m = /^\/(media|post-css)\/([a-z0-9-]+)\/(.+)$/.exec(urlPath);
  if (!m) return false;
  const [, kind, section, rest] = m;
  const rel = normalize(decodeURIComponent(rest));
  if (rel.startsWith("..") || rel.startsWith("/")) return false;
  for (const base of ["content", join("content", "_private")]) {
    const file = kind === "media" ? join(base, section, "media", rel) : join(base, section, rel);
    if (existsSync(file) && statSync(file).isFile()) {
      res.writeHead(200, { "content-type": TYPES[extname(file).toLowerCase()] || "application/octet-stream" });
      createReadStream(file).pipe(res);
      return true;
    }
  }
  return false;
}

const server = http.createServer((req, res) => {
  if (serveContentFile(new URL(req.url, "http://x").pathname, res)) return;
  vite.middlewares(req, res, async () => {
    try {
      const url = new URL(req.url, "http://x").pathname;
      const path = url.endsWith("/") || url.endsWith(".html") ? url : url + "/";
      const posts = selectPublished(loadPosts({ includePrivate: true }), todayIn(site.timezone), { includeDrafts: true });
      const routes = buildRoutes(buildModel(posts, site.langs, site.sections), loadPages());
      const route = routes.find((r) => r.path === path) ?? { ...routes.find((r) => r.kind === "notfound"), path };
      const { render } = await vite.ssrLoadModule("/src/entry-server.tsx");
      const html = await vite.transformIndexHtml(url, document_({ route, rendered: render(route), assets: { js: "/src/entry-client.tsx", css: [] } }));
      res.writeHead(route.kind === "notfound" ? 404 : 200, { "content-type": "text/html; charset=utf-8" }).end(html);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" }).end(String(e.stack || e));
    }
  });
});
server.listen(port, "0.0.0.0", () => console.log(`dev server: http://localhost:${port}/ (drafts included)`));
