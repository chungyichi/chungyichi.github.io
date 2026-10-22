import { renderToString } from "react-dom/server";
import { App } from "./App";
import { t, title, sectionTitle } from "./i18n";
import type { Route } from "./types";

export function render(route: Route) {
  const site = title(route.lang);
  let pageTitle = site, description = site;
  if (route.kind === "post") { pageTitle = `${route.props.title} · ${site}`; description = route.props.summary; }
  else if (route.kind === "page") { pageTitle = `${route.props.title} · ${site}`; description = route.props.summary; }
  else if (route.kind === "index") { pageTitle = `${sectionTitle(route.lang, route.props.section)}${route.props.page > 1 ? ` (${route.props.page})` : ""} · ${site}`; description = t[route.lang].all; }
  else if (route.kind === "search") { pageTitle = `${t[route.lang].search} · ${site}`; }
  else if (route.kind === "notfound") { pageTitle = `${t[route.lang].notFound} · ${site}`; }
  else if (route.kind === "entry") { pageTitle = site; description = t[route.lang].redirecting; }
  return { html: renderToString(<App route={route} />), title: pageTitle, description };
}
