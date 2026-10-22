# chungyichi.github.io

A personal, bilingual (中文 / English) blog. Write Markdown, commit, push: that publishes.
Static HTML rendered by React at build time, bundled with Vite. No tracking, readable without JavaScript.

## Write a post

```sh
scripts/docker.sh npm run new -- "Post title"                  # creates content/tech/YYYY-MM-DD-slug.zh.md (a draft)
scripts/docker.sh npm run new -- "Post title" --lang en        # an English one
scripts/docker.sh npm run new -- "Trip" --section life       # sections: tech (default), life
scripts/docker.sh npm run new -- "Trip" --section life --private   # content/_private/: never committed, never built
scripts/docker.sh npm run new -- "中文標題" --slug zh-title     # a non-ASCII title needs --slug
scripts/docker.sh npm run dev                                  # preview at http://localhost:5173 (drafts included)
```

Fill in `summary`, write the body, then set `draft: false` (or delete the line).
For the other language create the same slug with `.en.md` / `.zh.md`; the two files link to each other automatically.
With no translation, the language switcher goes to that language's section page and the post shows a notice. Nothing is machine-translated.

A post is published when it is not a draft and its date (the date in the file name, in Asia/Taipei) is today or earlier.
There is no scheduled build: a future-dated post goes live on the first push after its date (or via Actions → deploy → Run workflow).

Front matter (strict; unknown keys are an error): `title`, `summary` (required unless draft, at most 300 characters), `draft`, `updated` (`YYYY-MM-DD`).
Raw HTML in Markdown is **escaped, not rendered**.

## Search

`/zh/search/` and `/en/search/` search titles, summaries and headings, in the browser, with no server and no third-party service.
The build writes one small index per language (`/search/<lang>.<hash>.json`, about 0.25 KB per post) from the **published** posts only; the page downloads it when the box is focused.
Matching is by substring (so Chinese works without word breaks), every word must match, title beats heading beats summary. Body text is not indexed; if that is wanted later, add a chunked indexer such as Pagefind rather than growing this file.
`npm run check` fails if a private post's title appears in an index. Without JavaScript the page says so; browsing by section still works.

## Posts with their own layout (`.html`)

A post whose layout does not fit Markdown (travel photo grids, timelines, ...) is a `.html` file with the same name rules and front matter:
`content/life/2026-10-20-kyoto.zh.html`. The body is HTML that passes an **allowlist sanitizer** (`scripts/sanitize.mjs`):
no scripts, frames, forms, event handlers or `style` attributes; links are http(s), mailto, local or `#`; **images must be local** (`/media/...`, a build error otherwise).
Any tag in the allowlist may carry `class` names and an `id`.

- Pictures: `content/<section>/media/**` is published as `/media/<section>/**`. Use `<img src="/media/life/kyoto/a.jpg" alt="...">`.
- Looks, shared: `.pair`, `.gallery`, `.wide`, `.full` exist in `src/styles/main.css`; add more there for anything reusable.
- Looks, per post: `content/<section>/<slug>.css` is loaded on that post only (both languages); scope rules with `.post-<slug>`.
  It may not `@import` or load anything from another host (`url(/media/...)` is fine).
- Private posts keep their pictures in `content/_private/<section>/media/`; the dev server serves them, the build never copies them.

## Anything, per post (`trusted: true`)

Every post can be customised without limit, case by case. Add `trusted: true` to the front matter and that post may have:

- **`.html` body used as written**: `<style>`, `style=""`, inline SVG, `<details>`, `<video>`, frames, anything. No sanitizer.
- **`content/<section>/<slug>.css`**: its own stylesheet (this one is also available to untrusted posts).
- **`content/<section>/<slug>.js`**: its own script, loaded as a module on that post only. No script without `trusted: true`.
- **Markdown plus interactive parts**: a `.md` post may be trusted too. A line `{{widget: tlsf-map}}` becomes `<div class="widget" data-widget="tlsf-map"></div>`;
  the post's script finds it (`document.querySelector('[data-widget="tlsf-map"]')`) and draws into it. The text stays Markdown, raw HTML in it is still escaped.

Write the readable text and fallback in the page itself; the script only enhances it, so the post still reads without JavaScript.
Trust is yours to give: the importer never writes `trusted`, and `npm run check` lists every trusted post, whether it has a script, and which **outside hosts** its HTML/CSS/JS mention
(so a third-party script or a tracker cannot slip in unnoticed). Untrusted `.html` posts (such as Medium imports) still go through the sanitizer.

## Where pictures live

- **Originals** (camera, phone, Medium downloads) stay on your own disk or cloud, **never in any GitHub repo**, not even the private vault.
  They are kept in `sites/blog-originals/<section>/<post>/` next to this repo (outside git).
- **Web versions** are made with `scripts/photo.sh <originals-dir> <output-dir>` (long edge 1600 px, WebP, metadata and GPS removed, sandboxed, no network)
  and placed in `content/<section>/media/<post>/`. **That folder is git-ignored**: published pictures are not in git history at all.
- They are stored in a GitHub Release named `media` (one archive per post, `media-<section>-<post>.tar`): `scripts/media.sh push <section> <post>` uploads
  (replaces) one, `scripts/media.sh delete <section> <post>` removes one for real, `scripts/media.sh pull` downloads all into `content/` (the deploy does this before every build;
  a fresh clone runs it too). So replacing or deleting a post's pictures leaves no blob in git. The archives are public, like the pictures on the site.
- The archive is untrusted input in the deploy: `scripts/media-extract.sh` accepts only plain files named `<section>/media/<slug>/<file>.<image extension>` and refuses everything else.
- `npm run check` fails if a picture is tracked by git.
- Order for a new post: `scripts/publish.sh` (or put the pictures in place), look at it with `npm run dev`, `scripts/media.sh push ...`, then commit and push the post file. Uploading changes nothing on the site until a deploy runs.
- `scripts/backup.sh` copies texts to the vault and deliberately skips every `media/` folder and all picture files.
- **Preview switch**: with originals in `sites/blog-originals/<section>/<post>/<name>.<any image extension>` (same path and name as the web version, extension may differ),
  `scripts/docker.sh npm run dev` shows a corner link on every page: **圖片：網頁版 ⇄ 切到原圖**. It sets a cookie, so it applies to all pages until you switch back
  (`?img=original` / `?img=web` in the URL does the same). A picture without an original falls back to its web version. Dev only: the build and the published site always use the web versions.
  Another originals folder: `BLOG_ORIGINALS=/path scripts/docker.sh npm run dev`.

## Import from Medium

```sh
scripts/docker.sh npm run import:medium -- ~/medium-export --section life     # writes content/_private/life/ (git-ignored)
```

Reads `posts/*.html` of the unzipped Medium export. Per post: an `.html` file marked `draft: true`, its pictures downloaded from Medium's image hosts (only), embeds turned into links, Medium's classes removed.
Every import also writes `import-map.json` next to the posts (git-ignored with them, copied to the vault as text): per post its slug, the Medium export file, Medium id and canonical URL, title, and for each picture the Medium address it came from.
So a generated name such as `post-d9935911` or `495c7ed1c555.jpg` can always be traced back. `--map-only` rebuilds the map for an earlier import without downloading anything.
Review each result with `npm run dev`, add layout, then move it out of `_private/` and drop `draft: true` to publish. Nothing is overwritten. Medium's export format is assumed from its documented shape and **has not been tried on a real export yet**.

## Publish

```sh
scripts/docker.sh npm run check     # types, tests, build, internal links, dependency advisories
git add -A && git commit -m "Add a post" && git push
```

A push to `master` runs `.github/workflows/deploy.yml`, which runs the same `npm run check` and deploys `dist/` to GitHub Pages.

## Everything runs in Docker

`scripts/docker.sh <command>` runs the command in `node:24-bookworm` as your user with a read-only root, no capabilities,
and a tmpfs `/tmp`. Nothing is installed on the host. `node_modules/`, `dist/` and `.npm-cache/` stay in this directory (git-ignored).

## Restyle

All colours, fonts, widths and spacing are CSS variables in `src/styles/tokens.css` (light and dark). Edit that file only.

## Layout

| Path | What |
|---|---|
| `content/tech/`, `content/life/`, `content/pages/` | Posts per section (`.md`, or `.html` with its own layout) and pages such as About; `media/` and `<slug>.css` beside them |
| `content/_private/<section>/`, `backup/` | **git-ignored**: unpublished drafts, imports, the original Medium export. Only `npm run dev` shows them; `check` fails if any gets tracked |
| `site.config.mjs` | title, tagline, base URL, languages, sections, posts per page |
| `scripts/content.mjs` | front matter, Markdown, publishing rules, translations, pagination, sitemap (pure, tested) |
| `scripts/build.mjs`, `dev.mjs`, `new.mjs`, `check.mjs` | build, dev server, new post, post-build checks |
| `src/` | React components, i18n strings, styles; the only hydrated piece is the theme button |
| `test/` | `node --test` unit tests |

## Hosting

The site lives on `master`. Settings → Pages → Source is **GitHub Actions**; the old static site is in the git history.

## Known limits

- Not yet looked at in a browser by a human; layout and typography are a neutral starting point.
- `markdown-it` 15.0.2 has a known DoS advisory that needs hostile Markdown; accepted until 2026-10-24 in `scripts/check.mjs`
  (the fix, 15.0.3, was under the 7-day release-age rule). Bump it on or after 2026-10-23.
- GitHub Pages cannot set HTTP headers, so there is no Content-Security-Policy; the site has one tiny inline script (theme).

## Private vault

`scripts/backup.sh` (run on the host, not in the container) copies everything (`content/` including `_private/`, and `backup/`)
into a clone of the **private** repo `chungyichi/blog-vault` at `../blog-vault`, and commits there. It refuses to run if it cannot
confirm that repo is private, and it never pushes: review, then `git -C ../blog-vault push`. The copy is one-way and a mirror,
so the vault's history keeps what a later snapshot no longer has.

`/` is only a redirect: browser language `zh*` goes to `/zh/`, anything else to `/en/` (no JavaScript: `/zh/`).
