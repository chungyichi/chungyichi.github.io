# chungyichi.github.io

A personal, bilingual (中文 / English) blog. Write Markdown, commit, push: that publishes.
Static HTML rendered by React at build time, bundled with Vite. No tracking, readable without JavaScript.

## Write a post

```sh
scripts/docker.sh npm run new -- "Post title"                  # creates content/posts/YYYY-MM-DD-slug.zh.md (a draft)
scripts/docker.sh npm run new -- "Post title" --lang en        # an English one
scripts/docker.sh npm run new -- "中文標題" --slug zh-title     # a non-ASCII title needs --slug
scripts/docker.sh npm run dev                                  # preview at http://localhost:5173 (drafts included)
```

Fill in `summary`, write the body, then set `draft: false` (or delete the line).
For the other language create the same slug with `.en.md` / `.zh.md`; the two files link to each other automatically.
With no translation, the language switcher goes to that language's blog page and the post shows a notice. Nothing is machine-translated.

A post is published when it is not a draft and its date (the date in the file name, in Asia/Taipei) is today or earlier.
There is no scheduled build: a future-dated post goes live on the first push after its date (or via Actions → deploy → Run workflow).

Front matter (strict; unknown keys are an error): `title`, `summary` (required unless draft, at most 300 characters), `draft`, `updated` (`YYYY-MM-DD`).
Images go in `public/posts/<slug>/` and are linked as `/posts/<slug>/pic.png`.
Raw HTML in Markdown is **escaped, not rendered**.

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
| `content/posts/`, `content/pages/` | Markdown (posts and pages such as About) |
| `site.config.mjs` | title, tagline, base URL, languages, posts per page |
| `scripts/content.mjs` | front matter, Markdown, publishing rules, translations, pagination, Atom, sitemap (pure, tested) |
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
