#!/usr/bin/env bash
# Copy the island game's public build into public/island/ (the site serves it at /island/).
# Source: the game's own repo (the private vault, island/). Only dist/ goes out: index.html, world.json, version.json.
# world.private.json is never copied. Build the game first (bash island/build.sh there; it also runs the privacy guard).
set -euo pipefail
SRC="${1:-$HOME/sites/site-vault/island/dist}"
DST="$(cd "$(dirname "$0")/.." && pwd)/public/island"
for f in index.html world.json version.json exam.json; do [ -f "$SRC/$f" ] || { echo "missing $SRC/$f; build the game first" >&2; exit 1; }; done
mkdir -p "$DST"
for f in index.html world.json version.json exam.json; do cp "$SRC/$f" "$DST/$f"; done
if grep -rqi "world.private.json" "$SRC/world.json"; then echo "refusing: public world.json mentions the private file" >&2; exit 1; fi
echo "synced $(gzip -c "$DST/index.html" | wc -c) B (gzip) to $DST"
