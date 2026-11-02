// The ASCII figures in the middle of the gear overview (src/Gear.tsx -> the `center` of the word cloud). Plain printable ASCII, at most 19 columns, drawn in the owner's colour.
//   me: a hero who walks all the time and swings his sword (a walk cycle: legs alternate, body bobs one line, the sword goes up, forward, down with a spark, and back),
//       pacing a few columns right and left and turned (mirrored) the way he walks. Hand-made frames.
//   son: a bunny: ears wiggle, it blinks, now and then it hops (up one line, a shadow below). Hand-made frames.
//   brother: a shark. The page replaces this static art by the swimming shark of vendor/ascii-sharks (src/SharkFx.ts); the art is the no-JavaScript and reduced-motion fallback.
// figureOf(owner) is frame 0 as one string (the server renders it); figureFramesOf(owner) are all frames. Every frame of a person has the same number of lines; lines have no trailing
// spaces (the component keeps the pre 19 columns wide, FIGURE_COLS). String.raw keeps the backslashes (the first newline is dropped by lines()).

const lines = (s) => s.split("\n").slice(1);
const raw = (s) => lines(s.replace(/\n$/, ""));   // a template may end with a newline (a backslash before the closing backtick would escape it)

export const FIGURE_COLS = 19;

/** Mirror one frame left-right inside `cols` columns (the glyphs that point a way are swapped). */
const FLIP = { "/": "\\", "\\": "/", "(": ")", ")": "(", "<": ">", ">": "<", "[": "]", "]": "[", "{": "}", "}": "{", "`": "'", "'": "`" };
export const mirror = (frame, cols = FIGURE_COLS) =>
  frame.map((l) => [...l.padEnd(cols)].reverse().map((c) => FLIP[c] ?? c).join("").trimEnd());
/** Shift a frame right by n columns (leading spaces; blank lines stay empty). */
export const shift = (frame, n) => frame.map((l) => (l ? " ".repeat(n) + l : l));

// ---- me: the walk cycle, facing right, 9 lines, 13 columns. Four poses: contact (sword up), passing (sword up and forward), contact (sword down: slash and spark), passing (sword coming back).
const HERO = [
  raw(String.raw`
      |
      |
 .-.  |
(o o)-+-
 |=|\o
/|_|
 / \
/   \_`),
  raw(String.raw`


         /
 .-.    /
(o o)  /
 |=|\o
/|_|
 | |_`),
  raw(String.raw`


 .-.
(o o)  .-'
 |=|\o-----*
/|_|
 / \
_/   \
`),
  raw(String.raw`



 .-.     /
(o o)   /
 |=|\o
/|_|
_| |`),
];

// The walk: x = left column of the hero (0..6 in the 19 columns), facing right or left. 12 steps = 3 turns of the 4-pose cycle; the first is the centre, facing right.
const WALK = [[3, 1], [4, 1], [5, 1], [6, 1], [5, 0], [4, 0], [3, 0], [2, 0], [1, 0], [0, 0], [1, 1], [2, 1]];
const heroFrames = WALK.map(([x, right], i) => {
  const pose = HERO[i % 4];
  return right ? shift(pose, x) : mirror(shift(pose, 6 - x));
});

// ---- son: a bunny, 7 lines (the first is empty on the ground: room to hop). Poses, then the sequence (ears wiggle, a blink, a hop with a shadow under it).
const EARS = ["(\\ /)", "(/ /)", "(\\ \\)"];
const bunny = (ear, eyes, hop, squash) => {
  const body = [`  ${EARS[ear]}`, `  ( ${eyes})`, `  c(")(")`, `   /   \\`, `  (__ __)`];
  const a = squash ? [body[0], body[1], body[2], body[4]] : body;
  const rows = hop ? [...a, "   ~~~~~"] : ["", ...a];
  while (rows.length < 7) rows.push("");
  return shift(rows.slice(0, 7), 4);   // 4 columns in: the bunny stands in the middle of the 19
};
const BUNNY_SEQ = [bunny(0, "o.o"), bunny(1, "o.o"), bunny(0, "o.o"), bunny(2, "o.o"), bunny(0, "o.o"), bunny(1, "o.o"), bunny(2, "o.o"), bunny(0, "-.-"), bunny(0, "o.o"), bunny(0, "o.o"),
  bunny(0, "o.o", false, true), bunny(0, "o.o", true), bunny(0, "^.^", true), bunny(0, "o.o", false, true)];

const BROTHER = raw(String.raw`
         ,
        /|
       / |__
 |\   /     '-.
 | '-'   o     '-.
 |   '--.____     >
 | ,'   '-.__.-''-'
 |/`);

const FRAMES = { me: heroFrames, son: BUNNY_SEQ, brother: [BROTHER] };
/** Milliseconds per frame (me walks briskly, the bunny a little slower so that they do not look cloned); 0 = no frame animation (the shark is drawn by src/SharkFx.ts). */
const MS = { me: 170, son: 230, brother: 0 };

const pick = (owner) => (Object.hasOwn(FRAMES, owner) ? owner : "me");
/** The figure of a person as one string (frame 0, lines joined by "\n"); an unknown person gets the figure of "me". */
export const figureOf = (owner) => FRAMES[pick(owner)][0].join("\n");
/** All frames of a person (each an array of lines is joined by "\n"), as strings. */
export const figureFramesOf = (owner) => FRAMES[pick(owner)].map((f) => f.join("\n"));
export const figureMsOf = (owner) => MS[pick(owner)];
/** Which frame is on show `ms` milliseconds after the start; reduced motion (or a person with one frame) stays on frame 0. */
export const frameIndexAt = (owner, ms, reduced = false) => {
  const n = FRAMES[pick(owner)].length, per = MS[pick(owner)];
  if (reduced || n < 2 || !(per > 0) || !(ms >= 0)) return 0;
  return Math.floor(ms / per) % n;
};
export const FIGURE_OWNERS = Object.keys(FRAMES);
