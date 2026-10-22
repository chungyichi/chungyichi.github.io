// Where a post's picture comes from while previewing. Pure file lookup, shared by the dev server and the tests.
// Published pictures are always the web versions in content/<section>/media/ (the build copies only those).
// In "original" mode the dev server serves your full-size file instead, matched by name without the extension
// (001.webp -> 001.jpg), from a folder outside git: <originals>/<section>/<same path>.
import { existsSync, statSync } from "node:fs";
import { join, normalize, parse, sep } from "node:path";

export const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".heic"];
const isFile = (p) => existsSync(p) && statSync(p).isFile();

/** @returns {{ file: string, source: "web" | "original" } | null} */
export function resolveMedia({ section, rest, mode = "web", contentRoot = "content", originals = "" }) {
  if (!/^[a-z0-9-]+$/.test(section)) return null;
  const rel = normalize(rest);
  if (!rel || rel.startsWith("..") || rel.startsWith(sep) || rel.split(sep).includes("..")) return null;
  if (mode === "original" && originals) {
    const { dir, name } = parse(rel);
    for (const ext of IMAGE_EXT) {
      const file = join(originals, section, dir, name + ext);
      if (isFile(file)) return { file, source: "original" };
    }
  }
  for (const base of [contentRoot, join(contentRoot, "_private")]) {
    const file = join(base, section, "media", rel);
    if (isFile(file)) return { file, source: "web" };
  }
  return null;
}
