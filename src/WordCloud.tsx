// The word cloud on a sphere (the home page's gear overview). The words are real links to the search; their places come from the pure maths in
// src/wordcloud.mjs. The server renders the static pose (same function, same numbers, so the page is readable without JavaScript and hydrates
// without a mismatch); after mount ONE requestAnimationFrame loop writes the new pose into CSS custom properties of every word. Nothing is measured
// in the loop: the size comes from CSS (--wc-R in main.css), the positions are unitless numbers times that.
//   Loop: runs only while the cloud is on screen (IntersectionObserver), the tab is visible, and something moves (auto-spin, a flick, a drag);
//   with prefers-reduced-motion it runs only while you drag.
//   Touch: the box has touch-action: pan-y, so a vertical swipe still scrolls the page and a horizontal swipe turns the cloud (touch turns only,
//   mouse and pen also tilt). A drag is a move of more than 5 px; it swallows the click so that it does not open a link.
//   Keyboard: Tab goes through the words (the cloud turns the focused word to the front); the visually hidden list is the text alternative.
//   Centre: `center` is a text (the ASCII figure of the gear overview) drawn in the middle, not part of the turn; the near words pass in front of it, the far ones behind it,
//   and the layout keeps the near words out of its box at rest. A word may carry its own link, colour (a rarity) and a `ref` (the gear block opens its dialog for it), or be plain.
import { useEffect, useMemo, useRef } from "react";
import { layoutWords, project, wordStyle, dragRotate, flickSpeed, faceYaw, step, settled, DEFAULTS, CENTER_BOX, CENTER_Z, REST, type State, type Opts } from "./wordcloud.mjs";
import { rarityName } from "./gear.mjs";
import { figureFramesOf, figureMsOf, frameIndexAt } from "./gearfigure.mjs";
import { watchLive } from "./live";
import { t, type Lang } from "./i18n";

/** One word: the label and its weight; for a tag cloud the share too. Optional: `title` (the full text), `href` (else the search for the label), `ref` (a gear slot id), `tone` (a rarity id: the colour), `plain` (no link). */
export type CloudWord = { label: string; count: number; percent: number; title?: string; href?: string; ref?: string; tone?: string; plain?: boolean };
export type CloudProps = { lang: string; owner: string; words: CloudWord[]; summary: string; center?: string; centerFx?: "frames" | "shark"; tune?: Partial<Opts> };

const DRAG_PX = 5;

/** The cloud inside the host that src/entry-client.tsx hydrates (it reads the props from data-wordcloud, so they must be plain data). */
export function CloudHost(props: CloudProps) {
  return <div className="wc-host" data-wordcloud={JSON.stringify(props)}><WordCloud {...props} /></div>;
}

export function WordCloud({ lang, owner, words, summary, center, centerFx, tune }: CloudProps) {
  const opts = useMemo<Opts>(() => ({ ...DEFAULTS, ...tune, ...(center ? { avoid: CENTER_BOX } : {}) }), [center, tune]);
  const items = useMemo(() => layoutWords(words, opts), [words, opts]);
  const lg = (lang === "en" ? "en" : "zh") as Lang, text = t[lg];
  const box = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLElement | null)[]>([]);
  const pre = useRef<HTMLPreElement>(null);

  // The centre figure moves after mount (the server renders frame 0 / the static art): "frames" = ONE shared timer that swaps the text of the <pre>, only while the cloud is on screen
  // and the tab visible, frame 0 only with prefers-reduced-motion; "shark" = the canvas of src/sharkfx/mount.ts replaces the <pre> (loaded on demand, it has its own loop).
  useEffect(() => {
    const el = box.current, p = pre.current;
    if (!el || !p || !centerFx) return;
    if (centerFx === "shark") {
      let stop: (() => void) | null = null, gone = false;
      void import("./sharkfx/mount").then(({ mountShark }) => {
        if (gone) return;
        const h = mountShark(el, { owner, className: "wc-center wc-fx", zIndex: String(CENTER_Z) });
        if (!h) return;
        p.hidden = true; stop = () => { h.stop(); p.hidden = false; };
      });
      return () => { gone = true; stop?.(); };
    }
    const frames = figureFramesOf(owner), ms = figureMsOf(owner);
    if (frames.length < 2 || !(ms > 0)) return;
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    let n = 0, timer = 0, live = false;
    const show = () => { p.textContent = frames[frameIndexAt(owner, n * ms, mq.matches)] ?? frames[0]!; };
    const sync = () => {
      clearInterval(timer); timer = 0;
      if (mq.matches) { n = 0; show(); return; }
      if (live) timer = window.setInterval(() => { n++; show(); }, ms);
    };
    const unwatch = watchLive(el, (on) => { live = on; sync(); });
    mq.addEventListener("change", sync);
    return () => { clearInterval(timer); unwatch(); mq.removeEventListener("change", sync); p.textContent = frames[0]!; };
  }, [centerFx, owner]);

  useEffect(() => {
    const el = box.current;
    if (!el || items.length === 0) return;
    let s: State = { ...REST }, raf = 0, last = 0, onScreen = true, shown = !document.hidden;
    let reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let drag: { id: number; x: number; y: number; t: number; live: boolean } | null = null;
    let moved = false;

    const paint = () => items.forEach((it, i) => {
      const a = els.current[i]; if (!a) return;
      const st = wordStyle(project(it, s.yaw, s.pitch, opts));
      a.style.setProperty("--x", String(st["--x"])); a.style.setProperty("--y", String(st["--y"])); a.style.setProperty("--s", String(st["--s"]));
      a.style.opacity = String(st.opacity); a.style.zIndex = String(st.zIndex); a.style.pointerEvents = String(st.pointerEvents);
    });
    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
      if (!drag?.live) s = step(s, dt, { reduced });
      paint();
      if (onScreen && shown && !(settled(s, { reduced }) && !drag)) raf = requestAnimationFrame(frame);
    };
    const wake = () => { if (!raf && onScreen && shown) { last = performance.now(); raf = requestAnimationFrame(frame); } };

    const down = (e: PointerEvent) => { if (e.pointerType === "mouse" && e.button !== 0) return; moved = false; drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, live: false }; };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      let dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.live) {
        if (Math.hypot(dx, dy) < DRAG_PX) return;
        drag.live = true; moved = true; s = { ...s, target: null, vyaw: 0, vpitch: 0 };
        try { el.setPointerCapture(e.pointerId); } catch { /* the pointer is gone */ }   // captured only now, so that a plain click still reaches its link
        el.classList.add("is-dragging");
      }
      if (e.pointerType === "touch") dy = 0;
      const dt = (e.timeStamp - drag.t) / 1000;
      const r = dragRotate(s, dx, dy);
      s = { ...s, ...r, target: null, vyaw: reduced ? 0 : flickSpeed(s.vyaw, dx, dt), vpitch: reduced ? 0 : flickSpeed(s.vpitch, dy, dt) };
      drag.x = e.clientX; drag.y = e.clientY; drag.t = e.timeStamp;
      paint(); wake();
    };
    const up = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const was = drag.live, still = e.timeStamp - drag.t > 80; drag = null; el.classList.remove("is-dragging");
      if (was && still) s = { ...s, vyaw: 0, vpitch: 0 };   // held still before letting go: no flick
      wake();
    };
    const click = (e: MouseEvent) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } };
    const focus = (e: FocusEvent) => {
      const i = els.current.indexOf(e.target as HTMLElement); if (i < 0) return;
      s = { ...s, target: faceYaw(items[i]!.theta, s.yaw) }; wake();
    };

    el.addEventListener("pointerdown", down); el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    el.addEventListener("click", click, true); el.addEventListener("focusin", focus);
    const io = new IntersectionObserver((en) => { onScreen = (en.at(-1)?.isIntersecting ?? true); if (onScreen) wake(); });
    io.observe(el);
    const vis = () => { shown = !document.hidden; if (shown) wake(); };
    document.addEventListener("visibilitychange", vis);
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const mqc = () => { reduced = mq.matches; wake(); };
    mq.addEventListener("change", mqc);
    el.classList.add("is-live");
    wake();
    return () => {
      cancelAnimationFrame(raf); io.disconnect(); document.removeEventListener("visibilitychange", vis); mq.removeEventListener("change", mqc);
      el.removeEventListener("pointerdown", down); el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up);
      el.removeEventListener("click", click, true); el.removeEventListener("focusin", focus); el.classList.remove("is-live");
    };
  }, [items, opts]);

  return (
    <div className="wc" ref={box} role="group" aria-label={summary} style={{ ["--wc-color" as string]: `var(--owner-${owner}, var(--fg))` }}>
      {center && <pre ref={pre} className={`wc-center${centerFx === "frames" ? " wc-frames" : ""}`} aria-hidden="true" style={{ zIndex: CENTER_Z }}>{center}</pre>}
      {items.map((it, i) => {
        const w = words[i]!, st = wordStyle(project(it, REST.yaw, REST.pitch, opts));
        const props = {
          ref: (a: HTMLElement | null) => { els.current[i] = a; }, className: `wc-word${w.tone ? ` rarity-${w.tone}` : ""}`,
          title: w.title ?? `${it.label} · ${it.count} · ${w.percent}%`,
          style: { fontSize: `${it.rem.toFixed(2)}rem`, fontWeight: it.weight, ...st } as React.CSSProperties,
        };
        if (w.plain) return <span key={i} {...props}>{it.label}</span>;
        return <a key={i} {...props} href={w.href ?? `/${lang}/search/?q=${encodeURIComponent(it.label)}`} data-ref={w.ref} aria-label={w.tone ? text.gearWord(w.title ?? it.label, rarityName(lg, w.tone)) : undefined}>{it.label}</a>;
      })}
    </div>
  );
}
