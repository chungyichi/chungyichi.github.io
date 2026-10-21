import { renderToString } from "react-dom/server";
import { App } from "./App";
import { t, title } from "./i18n";
import type { Route } from "./types";

export function render(route: Route) {
  const site = title(route.lang);
  let pageTitle = site, description = site;
  if (route.kind === "post") { pageTitle = `${route.props.title} · ${site}`; description = route.props.summary; }
  else if (route.kind === "page") { pageTitle = `${route.props.title} · ${site}`; description = route.props.summary; }
  else if (route.kind === "index") { pageTitle = `${t[route.lang].blog}${route.props.page > 1 ? ` (${route.props.page})` : ""} · ${site}`; description = t[route.lang].all; }
  else if (route.kind === "notfound") { pageTitle = `${t[route.lang].notFound} · ${site}`; }
  else if (route.kind === "picker") { pageTitle = site; description = t.zh.chooseLang; }
  return { html: renderToString(<App route={route} />), title: pageTitle, description };
}
