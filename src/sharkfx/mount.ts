/**
 * The swimming shark in the middle of the brother's gear overview. Simulation and drawing are the vendored ascii-sharks code (vendor/ascii-sharks, MIT, see its README):
 * its AsciiRenderer rasterises the shark cell by cell into glyphs. That renderer paints a black board, so it draws on an OFFSCREEN canvas, and each frame we turn the
 * brightness into the alpha of ONE colour (the owner's, --owner-<x>): the shark is ink on the page, the dark glyphs are holes. There is no ocean, no fish, no pointer: a
 * World with one shark and zero fish, whose spine we place ourselves (./sharkpose.mjs) so that it swims in place inside the box instead of patrolling the whole screen.
 *
 * One requestAnimationFrame loop (drawn at most 30 times a second), only while the canvas is on screen and the tab visible. prefers-reduced-motion: one still frame, no loop.
 * The canvas is added after mount (the server renders the static art; the caller hides it while this runs) and removed again by the returned stop().
 */
import { AsciiRenderer } from "../../vendor/ascii-sharks/renderer";
import { World, type SharkKind } from "../../vendor/ascii-sharks/world";
import { sharkPose } from "./sharkpose.mjs";
import { watchLive } from "../live";

export const SHARK_KIND: SharkKind = "mako";   // tried classic, hammerhead, greathammer, mako at this size: the mako (pointed snout, crescent tail) reads best as a shark
const CELL_PX = 4.5;       // one glyph cell is about 4.5 x 6.8 CSS px (the renderer's smallest cell is 8 x 12 virtual px, so the virtual board is 8/4.5 bigger than the canvas)
const MAX_DPR = 1.5;
const MAX_FPS = 30;

export type SharkHandle = { stop(): void; canvas: HTMLCanvasElement };

/** "rgb(r, g, b)" or "#rrggbb" to [r, g, b]; falls back to a mid grey. */
const parseColor = (c: string): [number, number, number] => {
  const m = c.match(/rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/);
  return m ? [+m[1]!, +m[2]!, +m[3]!] : [128, 128, 128];
};

export function mountShark(host: HTMLElement, opts: { owner: string; className: string; zIndex: string }): SharkHandle | null {
  const canvas = document.createElement("canvas");
  canvas.className = opts.className; canvas.setAttribute("aria-hidden", "true"); canvas.style.zIndex = opts.zIndex;
  host.appendChild(canvas);
  const off = document.createElement("canvas");
  let renderer: AsciiRenderer;
  try { renderer = new AsciiRenderer(off); } catch { canvas.remove(); return null; }
  const out = canvas.getContext("2d");
  if (!out) { canvas.remove(); return null; }
  renderer.setFontFamily(getComputedStyle(canvas).fontFamily);

  const world = new World([{ kind: SHARK_KIND, size: 1 }], 0);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  let ink: [number, number, number] = [128, 128, 128];
  let W = 0, H = 0, vw = 0, vh = 0, img: ImageData | null = null;
  let raf = 0, live = false, stopped = false, t0 = 0, lastDraw = -1e9, tNow = 0;

  const readInk = () => {
    const probe = document.createElement("span");
    probe.style.color = `var(--owner-${opts.owner}, var(--fg, currentColor))`; probe.style.display = "none";
    host.appendChild(probe); ink = parseColor(getComputedStyle(probe).color); probe.remove();
  };
  const draw = (t: number) => {
    if (!img || !W) return;
    const p = sharkPose(t, vw, vh), sh = world.sharks[0]!;
    sh.length = p.length; sh.heading = p.heading; sh.turn = p.turn; sh.speed = p.speed; sh.phase = p.phase;
    for (let i = 0; i < p.nodes.length; i++) sh.nodes[i] = p.nodes[i]!;
    world.time = t;
    renderer.render(world, 1 / MAX_FPS);
    const src = off.getContext("2d")!.getImageData(0, 0, off.width, off.height).data, dst = img.data;
    for (let i = 0; i < dst.length; i += 4) {
      const lum = (src[i]! * 0.3 + src[i + 1]! * 0.59 + src[i + 2]! * 0.11) / 255;
      const a = lum < 0.1 ? 0 : Math.min(1, (lum - 0.1) / 0.2);
      dst[i] = ink[0]; dst[i + 1] = ink[1]; dst[i + 2] = ink[2]; dst[i + 3] = a * 255;
    }
    out.putImageData(img, 0, 0);
  };
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR), k = 8 / CELL_PX;
    W = r.width; H = r.height; vw = W * k; vh = H * k;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    renderer.resize(vw, vh, dpr / k);   // the offscreen canvas is then exactly as many pixels as the visible one
    world.resize(vw, vh, renderer.cellWidth, renderer.cellHeight);
    img = out.createImageData(canvas.width, canvas.height);
    draw(tNow);
  };
  const frame = (now: number) => {
    raf = 0; if (!live || stopped || reduce.matches) return;
    raf = requestAnimationFrame(frame);
    if (now - lastDraw < 1000 / MAX_FPS - 2) return;
    lastDraw = now; tNow = (now - t0) / 1000; draw(tNow);
  };
  const sync = () => {
    cancelAnimationFrame(raf); raf = 0;
    if (stopped) return;
    if (reduce.matches) { tNow = 2.4; draw(tNow); return; }   // one still frame
    if (live) { t0 = performance.now() - tNow * 1000; raf = requestAnimationFrame(frame); }
  };

  readInk();
  const ro = new ResizeObserver(resize); ro.observe(canvas);
  const mo = new MutationObserver(() => { readInk(); if (!raf) draw(tNow); });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-season", "class"] });
  const dark = matchMedia("(prefers-color-scheme: dark)"), recolor = () => { readInk(); if (!raf) draw(tNow); };
  dark.addEventListener("change", recolor); reduce.addEventListener("change", sync);
  const unwatch = watchLive(canvas, (on) => { live = on; sync(); });
  document.fonts?.ready.then(() => { if (!stopped && W) { resize(); } });
  resize();

  return {
    canvas,
    stop() {
      stopped = true; cancelAnimationFrame(raf); raf = 0; unwatch(); ro.disconnect(); mo.disconnect();
      dark.removeEventListener("change", recolor); reduce.removeEventListener("change", sync); canvas.remove();
    },
  };
}
