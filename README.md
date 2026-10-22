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

## Where pictures live

- **Originals** (camera, phone, Medium downloads) stay on your own disk or cloud, **never in any GitHub repo**, not even the private vault.
  Suggested local place: `sites/blog-originals/<section>/<post>/` next to this repo (outside git).
- **Web versions** are made with `scripts/photo.sh <originals-dir> <output-dir>` (long edge 1600 px, WebP, metadata and GPS removed, sandboxed, no network)
  and placed in `content/<section>/media/<post>/` (published) or `content/_private/<section>/media/<post>/` (private, git-ignored).
- `scripts/backup.sh` copies texts to the vault and deliberately skips every `media/` folder and all picture files.
- Only the web versions of **published** posts are committed to this public repo; every picture there is public for good.

## Import from Medium

```sh
scripts/docker.sh npm run import:medium -- ~/medium-export --section life     # writes content/_private/life/ (git-ignored)
```

Reads `posts/*.html` of the unzipped Medium export. Per post: an `.html` file marked `draft: true`, its pictures downloaded from Medium's image hosts (only), embeds turned into links, Medium's classes removed.
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
