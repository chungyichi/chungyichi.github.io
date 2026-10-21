// Assemble one HTML document. Shared by the build and the dev server.
import { site } from "../site.config.mjs";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Runs before first paint so the page never flashes the wrong theme.
const THEME_INIT = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export function document_({ route, rendered, assets }) {
  const lang = route.lang;
  const canonical = site.baseUrl + route.path;
  const alts = (route.alternates || []).filter((a) => a.translated !== false)
    .map((a) => `<link rel="alternate" hreflang="${a.lang}" href="${esc(site.baseUrl + a.path)}">`).join("\n    ");
  // "/" has no content of its own: send the reader to the right language straight away (browser language, else the default).
  const redirect = route.kind === "entry"
    ? `<meta http-equiv="refresh" content="0; url=/${site.defaultLang}/">\n    <script>(function(){var l=(navigator.languages&&navigator.languages[0])||navigator.language||"";location.replace("/"+(/^zh/i.test(l)?"zh":"en")+"/")})()</script>`
    : "";
  const css = (assets.css || []).map((h) => `<link rel="stylesheet" href="${esc(h)}">`).join("\n    ");
  const feed = `<link rel="alternate" type="application/atom+xml" title="${esc(site.title[lang])}" href="/${lang}/atom.xml">`;
  return `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${esc(rendered.title)}</title>
    <meta name="description" content="${esc(rendered.description)}">
    <meta name="color-scheme" content="light dark">
    <link rel="canonical" href="${esc(canonical)}">
    ${alts}
    ${redirect}
    ${feed}
    ${css}
    <script>${THEME_INIT}</script>
  </head>
  <body>
    <div id="root">${rendered.html}</div>
    <script type="module" src="${esc(assets.js)}"></script>
  </body>
</html>
`;
}
