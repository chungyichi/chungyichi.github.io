// Assemble one HTML document. Shared by the build and the dev server.
import { site } from "../site.config.mjs";
import { metaTags } from "./meta.mjs";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Runs before first paint so the page never flashes the wrong theme.
const THEME_INIT = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

// Halloween season, decided in the browser (the site is built once, so a build-time check would go stale).
// On from Oct 15 through Nov 2 by the date in Asia/Taipei (UTC+8, no DST), every year. Order: ?season=halloween|off,
// then a saved "off" choice, then the date. data-season-window="1" tells the toggle button it may show itself.
const SEASON_INIT = `try{var d=document.documentElement,m=/[?&]season=(halloween|off)\\b/.exec(location.search),o=m&&m[1],x=new Date(Date.now()+288e5),mo=x.getUTCMonth(),dy=x.getUTCDate(),w=(mo===9&&dy>=15)||(mo===10&&dy<=2),s="";try{s=localStorage.getItem("season")}catch(e){}if(o==="halloween"||(!o&&w&&s!=="off")){d.dataset.season="halloween"}if(o==="halloween"||w)d.dataset.seasonWindow="1"}catch(e){}`;

// Google Analytics 4, only when site.analytics.gaId is set. Skipped for readers who send Do Not Track, and never in the dev server.
// Google signals and ad personalisation are off; the page view is the only thing counted.
const GA_ID = /^G-[A-Z0-9]{6,12}$/;
export function analyticsTags(id) {
  if (!id) return "";
  if (!GA_ID.test(id)) throw new Error(`site.analytics.gaId must look like G-XXXXXXXXXX, got ${JSON.stringify(id)}`);
  const init = `if(navigator.doNotTrack!=="1"){var s=document.createElement("script");s.async=true;s.src="https://www.googletagmanager.com/gtag/js?id=${id}";document.head.appendChild(s);window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag("js",new Date());gtag("config","${id}",{allow_google_signals:false,allow_ad_personalization_signals:false})}`;
  return `<script>${init}</script>`;
}

export function document_({ route, rendered, assets, analytics = true }) {
  const lang = route.lang;
  const canonical = site.baseUrl + route.path;
  const alts = (route.alternates || []).filter((a) => a.translated !== false)
    .map((a) => `<link rel="alternate" hreflang="${a.lang}" href="${esc(site.baseUrl + a.path)}">`).join("\n    ");
  // "/" has no content of its own: send the reader to the right language straight away (browser language, else the default).
  // With the language switcher off every reader gets the default language; otherwise the browser language decides.
  const langPick = site.languageSwitcher === false ? ""
    : `\n    <script>(function(){var l=(navigator.languages&&navigator.languages[0])||navigator.language||"";location.replace("/"+(/^zh/i.test(l)?"zh":"en")+"/")})()</script>`;
  const redirect = route.kind === "entry"
    ? `<meta http-equiv="refresh" content="0; url=/${site.defaultLang}/">${langPick}`
    : route.kind === "tags" ? `<meta http-equiv="refresh" content="0; url=/${lang}/search/">` : "";
  const css = (assets.css || []).map((h) => `<link rel="stylesheet" href="${esc(h)}">`).join("\n    ");
  const postCss = route.postCss ? `<link rel="stylesheet" href="${esc(route.postCss.href)}">` : "";
  return `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${esc(rendered.title)}</title>
    <meta name="description" content="${esc(rendered.description)}">
    <meta name="color-scheme" content="light dark">
    ${route.kind === "notfound" ? "" : metaTags(route, { siteName: site.title[lang], baseUrl: site.baseUrl, title: route.kind === "post" ? route.props.title : rendered.title, description: rendered.description, image: route.ogImage, author: site.author })}
    ${route.kind === "notfound" ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${esc(canonical)}">`}
    ${alts}
    ${redirect}
    ${css}
    ${postCss}
    <script>${THEME_INIT}</script>
    <script>${SEASON_INIT}</script>
    ${analytics ? analyticsTags(site.analytics?.gaId) : ""}
  </head>
  <body>
    <div id="root">${rendered.html}</div>
    <script type="module" src="${esc(assets.js)}"></script>
    ${route.postJs ? `<script type="module" src="${esc(route.postJs.href)}"></script>` : ""}
  </body>
</html>
`;
}
