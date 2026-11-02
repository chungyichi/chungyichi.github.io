---
name: update-showcase
description: After books, games or toys are added, removed or changed on this site, bring the home showcase up to date — equipment slots (gear), achievements, profile, the word-cloud overview and the numbers shown on the home page. Use when the user says they added or removed collection items, or asks to refresh 裝備 / 成就 / 文字雲 / 首頁.
---

# Update the home showcase (chungyichi.github.io)

Content changes leave the showcase stale and it is easy to forget one part. Go through every step, in order. Chat in Traditional Chinese. Work in `~/sites/chungyichi.github.io`; everything runs through `scripts/docker.sh`.

## 0. What changed
- Count the posts per section (`content/toys|books|games/*.md`) and list the new or removed ones (`git status`, `git diff --stat`).
- A new item needs its picture (`content/<section>/media/<slug>/`: card, thumb, cover, og). Without one the page shows a tile; say so, do not invent pictures.

## 1. Equipment (`gear` in `site.config.mjs`)
- Slots: `head neck shoulder back chest shirt wrist hands | waist legs feet ring1 ring2 trinket1 trinket2 emblem | mainhand offhand` (18, same for everybody).
- An item is `"toys/<slug>"` or `"games/<slug>"` of a **published** post, once per person. **Books can never be equipped.** The slug has no date prefix.
- Games have no owner: they are shown on the sheet of `me` (`GAMES_OWNER` in `src/achievements.mjs`). Son and brother only get toys.
- Suggest candidates from the new items (price, theme: sword/staff to hands, boots/vehicles to feet, popcorn buckets to trinkets). Rarity is `poor common uncommon rare epic legendary`. **The user decides the picks and the rarity**; write a draft with a `// DRAFT` comment and say it is a draft.
- Removing a post that is equipped makes `npm run check` fail: replace or delete that slot.

## 2. Achievements (`achievements` in `site.config.mjs`)
- Rules are data (`kind` count | volumes | tag | things | item; sections toys, books or games; see the comment above the list and `src/achievements.mjs`).
- Re-read every `desc` and `min`: texts that name a number ("全部 21 卷", "擁有 50 件", "10 本") must match the post's real volumes or the real count.
- New category or a goal that is now reached: propose a next tier (a locked one with progress is the point). A `title` is shared with the profile (`ach:<id>`); a profile title naming a locked achievement fails the check.
- `things` counts toys and owned books only; games count through `kind: "count", section: "games"`.

## 3. Profile (`gear.<person>.profile`)
Level, title, mood: none are set. Only the user writes them. Do not add sample values.

## 4. Word cloud (home overview)
- It has no list of its own: the words are the equipped items of each person (`overviewWords` in `src/gear.mjs`; `gear.overview: "items" | "title"`). So step 1 *is* the cloud update.
- More than about 12 items for one person crowds the sphere: look at it in the browser (knobs `OVERVIEW_TUNE` in `src/gear.mjs`, `CENTER_BOX` in `src/wordcloud.mjs`).

## 5. Other numbers and lists on the home page
- `featuredToys` (the toy carousel) — still published? Still the ones the user wants?
- Share descriptions (`meta` in `site.config.mjs`) use `{n}`, filled at build: nothing to edit, but read the home and list texts once.
- Keep the home block short: the 閱歷 tab shows the summary line and the achievements only, **no list of finished quests** (the user asked for this).

## 6. Verify
```
node --test
scripts/docker.sh npm run check        # types, tests, build, links, gear and achievement rules
```
Then tell the user to look at the home page `#gear` on the dev server (`bash ~/sites/toys-dev-lan.sh`, LAN address). Only if the user is away from home, take screenshots with headless Chrome and send them.

## 7. Never
- Push, upload the media bundle (`scripts/media.sh`) or post anywhere without an explicit go for that action.
- Put pictures in git.
- Commit many small commits: one squashed commit per round, with the `Co-Authored-By` and `Claude-Session` trailers of this repo.

## Report
List what changed per part (gear, achievements, cloud, home), what is still a draft, and what needs the user's decision.
