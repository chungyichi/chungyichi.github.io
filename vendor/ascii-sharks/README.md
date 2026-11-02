# ascii-sharks (vendored subset)

- Source: https://github.com/stackedlol/ascii-sharks
- Commit: a0074c1
- Licence: MIT, copyright (c) 2026 drewdi. The notice is in `LICENSE` here (copied unchanged); it must stay with these files.

## Files here (all unchanged, byte for byte; `cmp` against the commit above)

- `LICENSE`
- `math.ts`: `TAU`, `clamp`, `hash3`, `smoothstep`, `angleDiff`, ...
- `species.ts`: fish species, only needed because `world.ts` imports it (we have no fish).
- `world.ts`: the `World` and `Shark` data (spine nodes, heading, phase, speed, turn).
- `renderer.ts`: `AsciiRenderer`, which rasterises a shark cell by cell into glyphs (skin ramp, fins, ridge, eye, gills, tint per species).

## How the site uses them (`src/sharkfx/mount.ts`, `src/sharkfx/sharkpose.mjs`)

The brother's overview (home page, gear block) shows ONE swimming shark of kind `mako` instead of static art.
Not used: `engine.ts` (the full loop with pointer input, splash, pausing), `react.tsx`, `index.ts`.
We do not call `World.step()`: with zero fish the sharks would patrol the whole canvas, but ours must swim in place inside a small box,
so `sharkpose.mjs` places the 20 spine nodes each frame (a drift, a sway of the heading) and the vendored renderer draws the undulation, fins and glyphs.

Differences in use (no file is modified):

- The renderer paints a black board with a grid, so it draws on an offscreen canvas and each frame the brightness is turned into the alpha of one colour (the owner's `--owner-brother`): the shark is ink on the page and the dark glyphs are holes.
- The renderer's smallest cell is 8 x 12 px, so the offscreen board is 8/4.5 times bigger than the visible canvas, which gives cells of about 4.5 x 6.8 CSS px.
- One loop, at most 30 draws a second, paused off screen and in a hidden tab; `prefers-reduced-motion` draws one frame.

## Type checking

The files come from a project that does not use `noUncheckedIndexedAccess`. To type check them unchanged, that option was removed from the site's `tsconfig.json` (the only change outside this folder that they need).

## Changes made by us

The first line of `renderer.ts`, `world.ts`, `species.ts` and `math.ts` is `// @ts-nocheck` (our comment). The site type-checks with `noUncheckedIndexedAccess`, which the upstream code was not written for (228 errors). Nothing else in these files is changed.
