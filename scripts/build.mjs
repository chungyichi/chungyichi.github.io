// Build the static site into dist/: Vite bundles the island + CSS, React renders every page to HTML.
import { mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";
import { site } from "../site.config.mjs";
import { buildModel, selectPublished, todayIn, atomFeed, sitemap, feedPath, ContentError } from "./content.mjs";
import { loadPosts, loadPages } from "./load.mjs";
import { buildRoutes } from "./routes.mjs";
import { document_ } from "./template.mjs";

const out = (p) => join("dist", p.endsWith("/") ? p + "index.html" : p);
const write = (file, text) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text); };

export async function main() {
  const today = todayIn(site.timezone);
  const posts = selectPublished(loadPosts(), today);
  const model = buildModel(posts, site.langs, site.sections);
  const pages = loadPages();
  const routes = buildRoutes(model, pages);

  await build({ logLevel: "warn" });                                     // client: dist/assets + manifest
  rmSync(".ssr", { recursive: true, force: true });
  await build({ logLevel: "warn", build: { ssr: "src/entry-server.tsx", outDir: ".ssr", emptyOutDir: true, manifest: false, rollupOptions: { input: "src/entry-server.tsx" } } });
  const ssrFile = readdirSync(".ssr").find((f) => /^entry-server\.(m?js)$/.test(f));
  if (!ssrFile) throw new Error("server bundle not found in .ssr/");
  const { render } = await import(pathToFileURL(join(".ssr", ssrFile)).href);

  const manifest = JSON.parse(readFileSync("dist/.vite/manifest.json", "utf8"));
  const entry = manifest["src/entry-client.tsx"];
  const assets = { js: "/" + entry.file, css: (entry.css || []).map((c) => "/" + c) };

  for (const route of routes) write(out(route.path), document_({ route, rendered: render(route), assets }));
  for (const lang of site.langs) {
    write(join("dist", feedPath(lang)), atomFeed({ lang, title: site.title[lang], baseUrl: site.baseUrl, author: site.author, posts: model.byLang[lang] }));
    for (const sec of site.sections) {
      write(join("dist", feedPath(lang, sec.id)), atomFeed({ lang, section: sec.id, title: `${site.title[lang]} · ${sec.title[lang]}`, baseUrl: site.baseUrl, author: site.author, posts: model.bySection[sec.id][lang] }));
    }
  }
  write("dist/sitemap.xml", sitemap(site.baseUrl, routes.filter((r) => r.kind !== "notfound" && r.kind !== "entry").map((r) => ({ path: r.path, alternates: (r.alternates || []).filter((a) => a.translated !== false) }))));
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
