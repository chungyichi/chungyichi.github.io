// Build the static site into dist/: Vite bundles the island + CSS, React renders every page to HTML.
import { mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, existsSync, cpSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";
import { site } from "../site.config.mjs";
import { buildModel, selectPublished, todayIn, sitemap, ContentError } from "./content.mjs";
import { loadPosts, loadPages } from "./load.mjs";
import { buildRoutes } from "./routes.mjs";
import { publishedFileExists } from "./files.mjs";
import { document_ } from "./template.mjs";

// URLs are percent-encoded (a Chinese tag is /zh/tags/%E6%97%A5%E6%9C%AC/); the server decodes the request before it looks at the disk, so the folder is named with the real characters.
const out = (p) => join("dist", decodeURI(p.endsWith("/") ? p + "index.html" : p));
const write = (file, text) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text); };

export async function main() {
  const today = todayIn(site.timezone);
  const posts = selectPublished(loadPosts(), today);
  const model = buildModel(posts, site.langs, site.sections);
  const pages = loadPages();
  const routes = buildRoutes(model, pages, { fileExists: (u) => publishedFileExists(u) });

  await build({ logLevel: "warn" });                                     // client: dist/assets + manifest
  rmSync(".ssr", { recursive: true, force: true });
  await build({ logLevel: "warn", build: { ssr: "src/entry-server.tsx", outDir: ".ssr", emptyOutDir: true, manifest: false, rollupOptions: { input: "src/entry-server.tsx" } } });
  const ssrFile = readdirSync(".ssr").find((f) => /^entry-server\.(m?js)$/.test(f));
  if (!ssrFile) throw new Error("server bundle not found in .ssr/");
  const { render } = await import(pathToFileURL(join(".ssr", ssrFile)).href);

  const manifest = JSON.parse(readFileSync("dist/.vite/manifest.json", "utf8"));
  const entry = manifest["src/entry-client.tsx"];
  const assets = { js: "/" + entry.file, css: (entry.css || []).map((c) => "/" + c) };

  for (const route of routes) {
    write(out(route.path), document_({ route, rendered: render(route), assets }));
    if (route.postCss) write(join("dist", route.postCss.href), route.postCss.text);   // same file for each language of the post
    if (route.postJs) write(join("dist", route.postJs.href), route.postJs.text);
    if (route.searchIndex) write(join("dist", route.searchIndex.href), route.searchIndex.text);
  }
  // Pictures and other files of published posts: content/<section>/media/** -> /media/<section>/** (private ones are never copied)
  for (const sec of site.sections) {
    const dir = join("content", sec.id, "media");
    if (existsSync(dir)) cpSync(dir, join("dist", "media", sec.id), { recursive: true });
  }
  write("dist/sitemap.xml", sitemap(site.baseUrl, routes.filter((r) => r.kind !== "notfound" && r.kind !== "entry" && r.kind !== "search").map((r) => ({ path: r.path, alternates: (r.alternates || []).filter((a) => a.translated !== false) }))));
  write("dist/robots.txt", `User-agent: *\nAllow: /\nSitemap: ${site.baseUrl}/sitemap.xml\n`);
  write("dist/.nojekyll", "");
  rmSync(".ssr", { recursive: true, force: true });
  rmSync("dist/.vite", { recursive: true, force: true });   // the manifest is a build detail, not part of the site

  const counts = Object.fromEntries(site.langs.map((l) => [l, model.byLang[l].length]));
  console.log(`built ${routes.length} pages, posts: ${JSON.stringify(counts)}, today (${site.timezone}): ${today}`);
  if (model.missing.length) console.log(`note: ${model.missing.length} post(s) have no translation: ${model.missing.map((p) => p.lang + "/" + p.slug).join(", ")}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e instanceof ContentError ? `content error: ${e.message}` : e); process.exit(1); });
}
