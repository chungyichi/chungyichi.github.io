import { renderToString } from "react-dom/server";
import { App } from "./App";
import { t, title, tagline, sectionTitle } from "./i18n";
import type { Route } from "./types";

export function render(route: Route) {
  const site = title(route.lang);
  let pageTitle = site, description = ["home", "search", "tags", "notfound"].includes(route.kind) ? tagline(route.lang) : site;
  if (route.kind === "post") { pageTitle = `${route.props.title} · ${site}`; description = route.props.summary; }
  else if (route.kind === "page") { pageTitle = `${route.props.title} · ${site}`; description = route.props.summary; }
  else if (route.kind === "index") { pageTitle = `${sectionTitle(route.lang, route.props.section)}${route.props.page > 1 ? ` (${route.props.page})` : ""} · ${site}`; description = t[route.lang].all; }
  else if (route.kind === "tags") { pageTitle = `${t[route.lang].tags} · ${site}`; }
  else if (route.kind === "tag") { pageTitle = `${t[route.lang].tagged(route.props.tag)}${route.props.page > 1 ? ` (${route.props.page})` : ""} · ${site}`; description = t[route.lang].tagged(route.props.tag); }
  else if (route.kind === "search") { pageTitle = `${t[route.lang].search} · ${site}`; }
  else if (route.kind === "notfound") { pageTitle = `${t[route.lang].notFound} · ${site}`; }
  else if (route.kind === "entry") { pageTitle = site; description = tagline(route.lang); }
  return { html: renderToString(<App route={route} />), title: pageTitle, description };
}
