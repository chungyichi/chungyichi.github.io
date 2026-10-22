// Does a root-relative URL such as /media/life/trip/og.jpg or /og-default.jpg point at a file we will publish? (Used for share images.)
import { existsSync } from "node:fs";
import { join } from "node:path";

export function publishedFileExists(url, { includePrivate = false } = {}) {
  const m = /^\/media\/([a-z0-9-]+)\/([A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*)$/.exec(url);
  if (m) return ["content", ...(includePrivate ? [join("content", "_private")] : [])].some((base) => existsSync(join(base, m[1], "media", m[2])));
  return /^\/[A-Za-z0-9._-]+$/.test(url) && existsSync(join("public", url.slice(1)));
}
