# chungyichi.github.io

A personal, bilingual (中文 / English) blog. Write Markdown, commit, push: that publishes.
Static HTML rendered by React at build time, bundled with Vite. Readable without JavaScript. The only third-party script is optional Google Analytics (`analytics.gaId` in `site.config.mjs`, off when empty).

## Write a post

```sh
scripts/docker.sh npm run new -- "Post title"                  # creates content/tech/YYYY-MM-DD-slug.zh.md (a draft)
scripts/docker.sh npm run new -- "Post title" --lang en        # an English one
scripts/docker.sh npm run new -- "Trip" --section life       # sections: tech (default), life, toys (see "Toys")
scripts/docker.sh npm run new -- "Trip" --section life --private   # content/_private/: never committed, never built
scripts/docker.sh npm run new -- "中文標題" --slug zh-title     # a non-ASCII title needs --slug
scripts/docker.sh npm run dev                                  # preview at http://localhost:5173 (drafts included)
```

Fill in `summary`, write the body, then set `draft: false` (or delete the line).
For the other language create the same slug with `.en.md` / `.zh.md`; the two files link to each other automatically.
With no translation, the language switcher goes to that language's section page and the post shows a notice. Nothing is machine-translated.

A post is published when it is not a draft and its date (the date in the file name, in Asia/Taipei) is today or earlier.
There is no scheduled build: a future-dated post goes live on the first push after its date (or via Actions → deploy → Run workflow).

**Tags**: `tags: 日本, 旅行, 自駕` (or `tags: ["日本", "旅行"]`) in the front matter, 1 to 3 per post (every published post needs at least one, none needs all three), up to 30 characters each, none of `/ \ ? # % < > " ' &`.
There is ONE tag page per language, `/zh/tags/`: it lists the tags, and `/zh/tags/?tag=日本` lists the posts of a tag (all sections, newest first, 10 per page, `&page=2`), filtered in the browser from the data file (see "Routes and filters"); tags are per language. They show on the post and in lists, and live on the search page: popular tags are listed there,
a plain word matches tags like titles, and typing `#bpf` plus a space turns it into a tag chip (matches tags only; chips and words combine).
**Thumbnail in lists**: `thumb.webp` (400x210) in the post's media folder, made with `og.jpg` by `scripts/og-image.sh <original> <dir>` (publish.sh does it for the first picture). A post without one shows no thumbnail.
**Share**: every post has a copy-link button (and a share button where the browser offers one); both appear only when JavaScript runs. `image: file.jpg` in the front matter picks the share picture.

**Share previews**: the pages people send around have their own description (and the toys list its own picture), set in `meta` of `site.config.mjs`: `home`, `toys`, `books`, `games`, `search`, `tags`, `mygames`, each `description: { zh, en }` and optionally `image: "<section>/<slug>"` (a published post with an `og.jpg`). `{n}` in a description is the number of published posts of that section in that language, filled at build time. A page with no entry keeps its old description; a missing `image` post or file falls back to `og-default.jpg` and prints one warning in the build output. `og:title` is unchanged; the twitter tags follow. Posts are not affected. Tests: `test/share.test.mjs`.

Front matter keys: `title`, `summary` (required unless draft, at most 300 characters), `draft`, `updated` (`YYYY-MM-DD`), `tags`, `image`, `trusted`.
Raw HTML in Markdown is **escaped, not rendered**.

## Games

`content/games/` is the game shelf (遊戲庫), `/zh/games/`, built like the books: one small file per game, a card grid (24 per page, `grid` of the games section in `site.config.mjs`), an `owner` (me or brother) and no progress (it is a list of what is bought and what is recommended); covers come from `scripts/game-cover.mjs` (a card without one is a tile with the title and the platforms).
Front matter: `title`, `summary`, `tags` (1 to 3), `platform: steam, ps` (one or more ids from `grid.platforms` in `site.config.mjs`, each once; required to publish, `npm run check` fails without),
`developer`, `original` (original / English title, shown under the title and searchable) and `source` (a small muted link). Not for games: `owner`, `status`, `own`, `type`, `author`, `volumes`, `price`, `quantity`.
The index has underlined platform tabs 「全部／Steam／NS／PS／其他」 (a game on two platforms is in both tabs) only; the routes are `/zh/games/` (`/zh/games/?platform=ps`, filtered in the browser) and `/zh/games/<game>/`. The search page has the 「遊戲」 scope with the same tabs.

## My games (作品; the menu label was 我的遊戲 until 2026-11-14, the address is still /my-games/)

The games I make myself, one page: `/zh/my-games/` (not the 遊戲庫 shelf above). Config: `myGames` in `site.config.mjs` (`slug`, `title` = the page name and the menu label, `intro`, `games`).
The page, its menu item (where the island link used to be) and the home island card's target exist only in a language whose `title` is set (zh now; no English page, nothing is machine-translated).
A card per game: cover, name, one paragraph, platform, status, last update, and 開始玩 (`href`) or a disabled 即將推出 (`href: ""`, not public). `use: "island"` takes the island's texts and picture from `island`. The game itself stays at `/island/`.
- Two looks, one markup (`src/MyGames.tsx`, `src/styles/mygames.css`): modern (the default, plain cards) and retro, a tribute to the personal download sites of the late 90s (framed table, left category column, 最新更新, bevel buttons, a counter that is only a decoration, small pixel touches; all original). Every retro rule is under `.mygames-retro` on the page's container, so the header, menu, footer, theme and season are not affected; light and dark have their own `--mg-*` tokens; the ticker and the blinking NEW stop under `prefers-reduced-motion`.
- The switch 「懷舊 / 現代」 sits beside the page title and needs JavaScript (`src/mygames-client.ts`); without it the switch is hidden and the page is modern. The choice is kept in `localStorage` key `mygames-look` (inside try/catch); a tiny inline script on this page only (`LOOK_INIT` in `src/mygames.mjs`) puts a saved retro look back before the first paint.
- Share preview: `meta.mygames`. Tests: `test/mygames.test.mjs`.

## Equipment slots (裝備欄)

A block on the home page only (「我們的裝備」, a carousel with one sheet per person who has an item; hidden when nobody has). There is no page of its own. The tab 裝備 has two views, a switch 「總覽 | 格子」 above the carousel (default 總覽; the choice is kept only in the page, and without JavaScript only 總覽 exists). Config: `gear` in `site.config.mjs`; no outside art: the sheet is CSS and SVG, the pictures are your own toys and games.
```js
gear: { me: { head: { item: "toys/mayday-max", rarity: "epic" }, mainhand: { item: "games/elden-ring" } }, son: {...}, brother: {...} }
```
- 總覽 (overview): the hollow-sphere word cloud (draggable, auto-spinning, see the word cloud paragraph under Toys) with a small ASCII figure in the middle, in the owner's colour, that moves: me is a hero who walks all the time (a 4-pose walk cycle, legs alternate, body bobs, the sword swings up and down with a spark; he paces a few columns right and left and turns round), son is a bunny (ears wiggle, blinks, an occasional hop with a shadow) and brother is a real swimming shark. Me and son are hand-made text frames in `src/gearfigure.mjs` (8 and 7 lines, at most 19 columns, plain ASCII; `figureOf` is frame 0 and is what the server renders, `figureFramesOf` are all frames, `frameIndexAt` picks the frame; 170 ms and 230 ms per frame, so they do not look cloned); ONE `setInterval` per cloud swaps the text, only while the cloud is on screen and the tab is visible; `prefers-reduced-motion` keeps frame 0. The shark is the renderer of [ascii-sharks](https://github.com/stackedlol/ascii-sharks) (MIT, copyright (c) 2026 drewdi; vendored in `vendor/ascii-sharks/`, the MIT notice is in `vendor/ascii-sharks/LICENSE`, what we use and how is in its README) drawn on a small canvas in the owner's colour (`src/sharkfx/mount.ts`, loaded on demand after mount; the static art stays as the no-JavaScript fallback). It swims in place inside its box (`src/sharkfx/sharkpose.mjs`), one `requestAnimationFrame` loop at most 30 draws a second, paused off screen or in a hidden tab, one still frame with reduced motion; device pixel ratio is capped at 1.5. Cost in headless Chrome, software rendering: about 4-5 ms per draw (not a phone) and the equipment names orbiting it; name, `Lv.N · title`, mood and 「已裝備 n / 18」 under it. A word is the item title cut to about 10 characters (`shortTitle`; the full title is the tooltip and the dialog), coloured by rarity and bigger for rarer items, at most 18 words. It is a link to the item page (the way without JavaScript); with JavaScript a tap opens the same shared dialog (the data is the slot button's `data-item`, not repeated), a drag only turns the cloud. Near words pass in front of the figure, far ones behind; at rest the near words keep out of the figure's box. Nothing equipped: the figure alone with 「還沒有裝備」.
- The cloud also holds small words from the rest of the collection (`collectionMore` in `src/gear.mjs`: the person's toys and books and, for me, the games, newest first, taken in turns; at most `OVERVIEW_TOTAL` = 30 words with the equipped ones, which stay big and keep their slot). They are plain links to the item, with the weight of a poor item, no dialog.
- `gear.overview: "items" | "title"` (default `"items"`; it is not a person): with `"title"` the words are the title, the level, the mood and the names of the unlocked achievements (plain words, weight falls with the order) instead of equipment. Pure builder `overviewWords` in `src/gear.mjs` (tests `test/gear.test.mjs`); knobs `OVERVIEW_TUNE` there, `CENTER_BOX` in `src/wordcloud.mjs`; the cloud's `center` prop is the text drawn in the middle.
- 格子 (slots) is the 18-slot sheet below. Slots (8 + 8 and two hands): `head neck shoulder back chest shirt wrist hands` | `waist legs feet ring1 ring2 trinket1 trinket2 emblem` | `mainhand offhand`. Every sheet shows all 18, empty ones as dashed placeholders; the middle cell is the same moving ASCII figure as the overview (the cloud component with no words), with the name under it. Rarity (`poor common uncommon rare epic legendary`, default `rare`) is a coloured border and glow (`--rarity-*` in `src/styles/gear.css`) and always a word too.
- `item` is `"toys/<slug>"` or `"games/<slug>"` of a published post. **A book cannot be equipped**: `npm run check` fails with a clear message. It also fails for an unknown person, slot or rarity, an unpublished item, or the same item twice for one person. An item missing in a language is an empty slot there.
- Click a slot (or an orbiting word): ONE shared native `<dialog>` opens as a card (picture, title in the rarity colour, rarity and slot, summary, tags, date, 「看物品 →」 to the item). Esc, the backdrop or × closes it and the focus returns to the slot. The item is in the button's `data-item` JSON, so there is no fetch. Needs JavaScript.
- `profile` per person (optional, none set now): `{ level, title: { zh, en } | "text" | "ach:<achievement id>", mood: { zh, en, icon } }`, shown under the name. `"ach:<id>"` shows that achievement's title once unlocked (`npm run check` fails for an unknown or a locked one).
- Tabs 裝備 | 閱歷 (one bar for the whole block; without JavaScript only 裝備). 閱歷: the summary 「完成 15 項任務 · 共 56 卷」 (listed volumes only; books with no volumes are added as 「+ K 部網文」; for me also 「· 遊戲 N 款」, the games on the shelf), and the achievement shelf (unlocked first, locked dim with progress). The finished quests are not listed (the home block stays short).
- Achievements: `achievements` in `site.config.mjs`, `{ id, name, desc, title, rule }` (texts `{ zh, en }`), judged per person at build time. A rule is data: `kind` `count` (posts of a `section` — toys, books or games; a game counts for its `owner`, `GAMES_OWNER` = me when absent — optional `tag`, `own`) | `volumes` | `tag` | `things` | `item`, plus `min` and optional `owner`. `npm run check` rejects an unknown kind or field, a bad `min`, a duplicate id and an unpublished item.
- Code: `src/Gear.tsx` (the block), `src/gear-client.ts` (dialog, tabs, views), `src/gearfigure.mjs` (the figures and their frames), `src/sharkfx/` (the swimming shark), pure rules in `src/gear.mjs` and `src/achievements.mjs` (tests `test/gear.test.mjs`, `test/achievements.test.mjs`).

## Main menu

The header menu is one row that scrolls sideways when the sections do not fit (a phone); soft edges show while there is more to scroll to, the current page is underlined and scrolled to the middle on load (`src/entry-client.tsx`), and the title and the icons on the right stay put.

## Search

`/zh/search/` and `/en/search/` search titles, summaries, headings and tags, in the browser, with no server and no third-party service.
The build writes one small index per language (`/search/<lang>.<hash>.json`, about 0.3 KB per post) from the **published** posts only; the page downloads it when the box is focused.
Matching is by substring (so Chinese works without word breaks), every word must match, title beats heading beats summary. Body text is not indexed; if that is wanted later, add a chunked indexer such as Pagefind rather than growing this file.
Picture-grid posts (toys, books, games) also carry their owner id (`o`) and, when set, `w: 0` (a book you only read), `ty: "comic"`, `pf` (a game's platforms), `a` (author), `st: 1` (a toy on the wish list), `q` (quantity from 2); other entries do not. Every entry that has a `thumb.webp` / `card.webp` has `im` (1 = thumb, 2 = card), so the grids can draw their cards from this one file. The page always shows small owner chips of all grid sections after the label 「誰的」 (an id once; none chosen = no filter, click the chosen one again to clear; the optional `short` of an owner in `site.config.mjs` is the chip text) under the scope tabs; an owner means "only items of that owner" in every scope (in Everything that is toys and books of that owner, posts drop out), and combines with the words and the scope. In the Books scope the type tabs and the 全部 / 實體 / 只看過 toggle also show, in the Games scope the platform tabs (leaving the scope clears them; the owner stays; `?type=comic`, `?own=no`, `?platform=ps` are read from the address).
A filter alone lists everything it matches, newest first (up to 50), so browsing by owner works with an empty box. The address keeps it: `?q=...&scope=books&owner=son&own=no`; an owner id no section knows is ignored.
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
- They are stored in a GitHub Release named `media`, all sections in **one bundle** (`media-all-<UTC time>.tar`, the newest is used): `scripts/media.sh push <section> <post>` puts one post's
  pictures into it (replacing that post's old ones), `scripts/media.sh delete <section> <post>` takes them out for real, `scripts/media.sh pull` downloads the bundle into `content/` (the deploy does this
  before every build; a fresh clone runs it too). A push uploads the new bundle first, checks its size, then deletes older bundles but keeps the previous one as a way back; `delete` deletes every older bundle,
  so the pictures are really gone. Each push uploads the whole bundle (about 150 MB today; GitHub allows 2 GiB per file) and two pushes at the same moment would race: push one after another.
  Replacing or deleting a post's pictures leaves no blob in git. The bundle is public, like the pictures on the site. `scripts/media.sh migrate` / `prune-old` moved the old one-archive-per-post layout into the bundle.
- The bundle is untrusted input in the deploy: `scripts/media-extract.sh` accepts only plain files named `<section>/media/<slug>/<file>.<image extension>` and refuses everything else.
- `npm run check` fails if a picture is tracked by git.
- A media folder holds pictures only (`.webp .jpg .jpeg .png .gif .avif`): the deploy's unpack refuses the WHOLE bundle for one other file and then every picture is broken ("unpacked 0 pictures"). So `media.sh push` / `push-many` refuse such a folder before uploading, `npm run check` fails on it, and `photo.sh` no longer leaves `manifest.tsv`.
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

## Routes and filters

The picture grids and the tag page are **one page each**, not one page per filter combination:

| Page | Address | Filters (only the chosen ones are in the address) |
|---|---|---|
| Toys | `/zh/toys/` | `?owner=me\|son\|brother`, `&page=2` |
| Books | `/zh/books/` | `?owner=me&own=no&type=comic`, `&page=2` |
| Games | `/zh/games/` | `?owner=brother`, `?platform=ps`, `&page=2` (no status) |
| Tags | `/zh/tags/` | `?tag=日本`, `&page=2` |

The build renders the first page of the unfiltered list (24 toys, 48 books, 24 games; `grid.perPage`), the counts on the buttons and every control as a plain link with its query URL, so without JavaScript the page is complete and nothing is broken (a click then loads the same first page).
With JavaScript `src/browse-client.tsx` loads the language's data file (the search index, `data-index` on `#browse`), renders the same components (`src/Browse.tsx`, `src/cards.tsx`) for the address, and keeps the address in step with `history.pushState`.
The rules live in one pure module, `src/grid-core.mjs` (parse and build the query, filter, counts that follow the other filters, paging, tag lists), on top of `inFilter` of `src/search-core.mjs`; the search page uses the same owner and facet names and `writeFilters`. Old static paths such as `/zh/books/owner/me/` are gone (404).

## Toys

`content/toys/` is a toy library: one post per toy, listed at `/zh/toys/` as a grid of square cards (picture, name, up to two tags) with an owner filter
(`/zh/toys/?owner=me`, `/zh/toys/?owner=son`; the ids, labels and icons are `grid.owners` of the toys section in `site.config.mjs`). Toys share tags, search (by name and tag; the result says 玩具庫), thumbnails and the media release with the other sections.
Extra front matter, toys only: `owner: me` (required to publish), `source: https://...` (the shop page: a 前往購買 button with `rel="nofollow"`), `status: want` (a wish; absent = owned),
`price: "NT$15,525"` (text, shown as written), `quantity: 2` (how many of the same toy, a whole number; absent is 1; shown only from 2 up: 「數量」 in the facts panel and a `×2` chip on the card).
The owner and a wish are shown as icon badges in a colour per owner (`--owner-<id>` in `tokens.css`), never as text.
The toy page is two columns on a wide screen: the picture panel beside the facts; the toys pages use a wider column than the reading sections.

## Games page (遊樂區): merged

`/play/` was a second page for my own games and overlapped 我的遊戲. On 2026-11-13 it was merged: the `play` key is gone from `site.config.mjs` (no menu item) and `public/play/index.html` is only a redirect to `/zh/my-games/`. Add games to `myGames` (see "My games").

## Books

`content/books/` is the book shelf (書庫): one small file per book, `content/books/YYYY-MM-DD-slug.zh.md`, listed at `/zh/books/` with the same picture grid as the toys (48 per page, `grid.perPage` in `site.config.mjs`),
the filters `/zh/books/?owner=me` and `/zh/books/?owner=son` ("誰在看"), tags and search (the scope switch has 書). It reuses the toy code; only the front matter differs.
Front matter: `title`, `summary` (required to publish; when it is empty, `author` is used as the summary), `tags` (1 to 3), `owner: me | son` (who reads it: person icon = me, block icon = son; required to publish),
and optional `author`, `volumes` and `source`. No price, no quantity, no `status`.
- **A series is one record.** `volumes: 第一部, 第二部, 第三部` (titles in order, comma separated; if a title has a comma, separate with `;` instead) shows as 「共 N 冊」 and a numbered list on the book page, plain text. The volume titles are searchable, so a volume title finds its series.
- **Authors are spelled one way.** `author: R.A. Salvatore` (several: comma separated) must be a name or an alias in `grid.authors` of the books section in `site.config.mjs`; an alias is rewritten to the name when the site is built,
  and `npm run check` fails for any other author, naming the nearest known authors. A new author is a new entry there: `{ name: "...", aliases: ["..."] }`. On the book page an author links to the search page for that name (`/zh/search/?q=...`); the author is in the search index.
- **Books you only read** (web novels, online comics): `own: no` (`yes` or absent = a physical copy). The card and the page show a small crossed-out book icon (「無實體書」), and `source` is a normal link 「去哪裡看」 instead of the muted one.
  The books grid has more filters (`grid.facets: ["type", "own"]`): the type tabs above, and a small own toggle at the right end of the filter bar, 「全部 / 實體 / 只看過」, They all combine with the owner and each other, in the address: `/zh/books/?own=no`, `/zh/books/?owner=me&type=comic&own=no` (only the chosen filters appear; `&page=2` from page 2); each filter keeps the other's choice, and the counts follow it. Adult rule: a book with `own: no` and the tag `成人` is text only, so `npm run check` fails if it has `source` or any picture (it needs no picture to publish).
- **Foreign titles**: `original: "SSS급 죽어야 사는 헌터 / SSS-Class Revival Hunter"` (books only, up to 160 characters) is shown as a small muted line under the title on the book page and is searchable (the whole line and each part between slashes).
- **Many books at once**: `scripts/docker.sh npm run book:add -- books.tsv` (`--dry-run` to look first, `--date`, `--out`). One book per line, tab-separated: `title, author, owner (me|son), tags (a,b), summary, volumes (a;b), own (yes|no), source, slug, original` (the slug, lowercase ASCII with hyphens, is required; `original` is optional; empty columns take the defaults).
  Each good line becomes a published `content/books/<today>-<slug>.zh.md` (no cover needed); nothing is overwritten. A line that does not parse like a post, has a taken slug, or an author not in `grid.authors` is skipped with the reason; unknown authors are listed once, grouped, so you can add them to the config and run again.
- **Comics**: `type: 漫畫` (`小說` or absent = a novel). The books page has tabs 「全部／小說／漫畫」 above the owner pills; a comic shows a small 「漫畫」 label on its card and page. `book:add` takes it as an optional 11th column `type`.
- **`source` is quiet**: no buy button, only a small muted 「來源」 link under the facts (many books are out of print).
Pictures: one cover or several (a series: one per volume, or a set cover first; they open the post body as image lines and share the gallery panel like a toy with many pictures), in the same media bundle as everything else: `content/books/media/<slug>/` with `card.webp`, `thumb.webp`, `cover.webp` and `og.jpg`
(`scripts/photo.sh` and `scripts/og-image.sh <original> <dir> --square`, as `toy:add` does), then `scripts/media.sh push books <slug>`.
The card is square (480x480) like the toys; a portrait cover is shown whole on the card (not cropped) and `cover.webp` on the book page. `npm run check` wants an owner for every published book; a picture is optional (a book without a cover shows its title, and the author small, on a square tile tinted with the owner's colour, on the card and on the book page).

The panel shows the front matter `image` and then the pictures that open the body (one picture per paragraph, as toy-add.sh writes them; they are not repeated below, the text after them stays);
with none of those, the body's first picture, else `cover.webp`. Several pictures share the panel as a strip that snaps one picture at a time: swipe, scrollbar or arrow keys with no JavaScript,
plus round left/right buttons, the current dot and `#pic-2` deep links from `src/gallery-client.ts` (loaded only on such pages).
The home page shows a carousel of the toys listed in `featuredToys` in `site.config.mjs` (`"toys/<slug>"`, that order; only published toys that exist in the language; none hides it)
between the motto and the featured posts: the same strip, one toy per slide (picture and name, the slide opens the toy), a `1 / N` counter, no autoplay, and a link to the library.
The word cloud of the gear overview (`src/WordCloud.tsx`, maths in `src/wordcloud.mjs`, tests in `test/wordcloud.test.mjs`): the words sit on a hollow sphere (a Fibonacci spread over the shell, heavy words near the equator and the front, the far side is small and faint); each word is a link (to an item page, else `/<lang>/search/?q=<word>`).
At layout time a relaxation pass pushes labels that overlap at the rest pose apart (by an estimate of the label size, `boxR` in `DEFAULTS`) and keeps them inside the box; above 20 words the labels shrink a little. It spins slowly, drag (mouse, pen, touch, any direction) turns it with inertia, then it eases back to the slow spin;
near words are bigger, brighter and on top. The server renders a fixed pose (the same function as the first client render, so it hydrates without a mismatch; readable without JavaScript); one `requestAnimationFrame` loop runs only while the cloud is on screen, the tab is visible and something moves.
`touch-action: pan-y`: on a phone a vertical swipe scrolls the page, a horizontal swipe turns the cloud (touch does not tilt; mouse and pen do). A drag does not open the link under it. Tab goes through the words and turns the focused one to the front;
`prefers-reduced-motion`: no auto-spin, no inertia, drag still turns it. Knobs: `DEFAULTS` in `src/wordcloud.mjs` (spin, inertia, sizes, tilt), `--wc-R` (size) in `main.css`.
The gear block's carousel controls (`‹ ● ○ ○ ›`) are a fixed-height row under the card, never over the content; all slides share the tallest slide's height (server-rendered), so nothing shifts.
The grid card uses `card.webp` (480x480, `scripts/og-image.sh ... --square`, toy-add.sh does it) and falls back to `thumb.webp` letterboxed.
`npm run check` fails a published toy without an owner from the config or without a picture, and warns when `thumb.webp` is missing.

```sh
scripts/toy-add.sh "https://www.shopping.bin-music.com.tw/SalePage/Index/123" --owner son --tags 公仔,機器人   # on the host
scripts/toy-add.sh "https://shopee.tw/..." --image ~/Pictures/robot.jpg --title "遙控機器人" --owner son        # a shop that needs a login: your own picture, nothing fetched
```

The page is fetched in the node container (https only, hosts listed in `TOY_HOSTS` in `scripts/toy.mjs`: add one on purpose; redirects are followed by hand and only across that list, never to a private address;
an honest user agent; pictures JPEG/PNG/WebP up to 10 MB). `og:title`, `og:image` and the price are read; a login, captcha or age page, or a page without `og:image`, stops with "please supply the picture yourself" (`--image`).
The picture goes to `../blog-originals/toys/<slug>/` (outside git), `photo.sh` and `og-image.sh --square` make the web version, the thumbnails and the square card in `content/toys/media/<slug>/` (git-ignored),
and `content/toys/<date>-<slug>.zh.md` is written as a draft (title, source, owner, tags, price, the picture; the day the price was seen is a front matter comment). Then: look with `npm run dev`, fill in `summary`,
drop `draft: true`, `scripts/media.sh push toys <slug>`, commit the post. A Chinese title needs `--slug`. `scripts/docker.sh npm run toy:add -- <url>` runs only the fetch and draft part (picture left in `backup/toy-tmp/`).

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

All colours, fonts, widths and spacing are CSS variables in `src/styles/tokens.css` (light and dark). `src/styles/season.css` and `season-art.css` are the seasonal decorations (see "Seasons"), `src/styles/ink.css` the About page's paper-and-bamboo look (`.page-about`).

## Seasons

A small decoration for a time of year: an animated layer behind the text, one button (the season's icon) next to the theme button, sometimes a touch toy. It is a table in `site.config.mjs`:

```js
seasons: [
  { id: "halloween", icon: "🎃", label: { zh: "萬聖節", en: "Halloween" }, window: { from: "10-15", to: "11-02" }, art: "halloween" },
  { id: "lunar", icon: "🏮", label: { zh: "春節", en: "Lunar New Year" }, window: { around: "cny", daysBefore: 14, daysAfter: 14 }, art: "lanterns", interaction: "lantern-burst" },
  ...
]
```

| id | window (Asia/Taipei, every year) | art | touch |
|---|---|---|---|
| `halloween` | Oct 15 - Nov 2 | bats, pumpkins, cobweb, orange/purple palette | |
| `autumn` | Nov 3 - Nov 30 | maple / ginkgo leaves falling | a pointer moving near a leaf pushes it sideways |
| `winter` | Dec 1 - Dec 31 | snowflakes, blinking lights under the header | tap a light: next colour |
| `lunar` | 14 days before 春節 to 元宵 (2026-2030) | hanging lanterns, red envelopes | tap a lantern: a small burst of dots |
| `spring` | Mar 10 - Apr 15 | pink petals | |

- **One season at a time.** The first row whose window holds today wins, so the order is the priority. A `window` is `{ from, to }` ("MM-DD", both days included; `from` after `to` wraps over New Year) or `{ around, daysBefore, daysAfter }` around a date of `LUNAR_TABLE` in `data/calendar.mjs` (a year that is not in the table has no such window, so the season is simply off that year; extend the table to extend it).
- **Decided in the browser, resolved at build time.** The build writes the windows of this year +-1 as dates (`<script type="application/json" id="season-data">`), so no lunar logic runs in the browser; a tiny inline script (`SEASON_INIT` in `src/season-core.mjs`) compares today (Asia/Taipei) with them and sets `<html data-season="<id>">`. Rebuild once a year, or the table runs out after next year.
- **Preview**: `?season=<id>` shows a season any day (with its button), `?season=off` hides it. The button turns it off/on; an off choice is saved per season in `localStorage` key `season-off` (the id of the season turned off, one at a time: turning another season off replaces it; turning it back on clears it). `?season=<id>` ignores a saved off.
- **The button** is only there inside a window or with `?season=<id>`, and only with JavaScript.
- **Rules for every layer**: own SVG art only, low contrast, behind the content, at most 30 moving elements, CSS animation (`will-change: transform`), paused while the tab is hidden, hidden completely under `prefers-reduced-motion`. A new season: a row in the table, an `art` (a function in `src/SeasonArt.tsx` + CSS in `src/styles/season-art.css`), optionally an `interaction` (a function in `src/season-client.ts`, loaded only for that season). CSS that changes the page itself keys on `:root[data-season="<id>"]`. Tests: `test/season.test.mjs`.

## Layout

| Path | What |
|---|---|
| `content/tech/`, `content/life/`, `content/toys/`, `content/pages/` | Posts per section (`.md`, or `.html` with its own layout) and pages such as About; `media/` and `<slug>.css` beside them |
| `content/_private/<section>/`, `backup/` | **git-ignored**: unpublished drafts, imports, the original Medium export. Only `npm run dev` shows them; `check` fails if any gets tracked |
| `site.config.mjs` | title, tagline, base URL, languages, sections, posts per page |
| `scripts/content.mjs` | front matter, Markdown, publishing rules, translations, pagination, sitemap (pure, tested) |
| `scripts/build.mjs`, `dev.mjs`, `new.mjs`, `check.mjs` | build, dev server, new post, post-build checks |
| `scripts/toy.mjs`, `toy-add.mjs`, `toy-add.sh` | toy from a shop page: fetch rules (pure, tested), the command, the host wrapper |
| `src/` | React components, i18n strings, styles; browser-side pieces are small: theme and season buttons, copy-link, search, the grid and tag filters (`browse-client.tsx`) |
| `test/` | `node --test` unit tests |

## Hosting

The site lives on `master`. Settings → Pages → Source is **GitHub Actions**; the old static site is in the git history.

## Known limits

- Not yet looked at in a browser by a human; layout and typography are a neutral starting point.
- GitHub Pages cannot set HTTP headers, so there is no Content-Security-Policy; the site has one tiny inline script (theme), and the my-games page one more (`LOOK_INIT`).

## Private vault

`scripts/backup.sh` (run on the host, not in the container) copies everything (`content/` including `_private/`, and `backup/`)
into a clone of the **private** repo `chungyichi/site-vault` at `../site-vault`, and commits there. It refuses to run if it cannot
confirm that repo is private, and it never pushes: review, then `git -C ../site-vault push`. The copy is one-way and a mirror,
so the vault's history keeps what a later snapshot no longer has.

`/` is only a redirect: browser language `zh*` goes to `/zh/`, anything else to `/en/` (no JavaScript: `/zh/`).

## Menu (收藏 and 作品)
The menu is 首頁, 技術, 生活, 收藏, 作品, 搜尋, 關於. `collection` in `site.config.mjs` (`{ title, sections }`) turns several grid sections into ONE menu item (收藏 = 玩具庫, 書庫, 遊戲庫): it opens the first section, stays marked on every page of the three, and each of their grid pages has tabs `玩具庫 | 書庫 | 遊戲庫` above the title (`CollectionTabs` in `src/App.tsx`). The addresses of the sections do not change. 作品 is `myGames.title` (my own games; room for other things I make later).
