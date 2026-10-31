#!/usr/bin/env bash
# Add a toy from a shop page in one go. Runs on the host (like publish.sh): the page and picture are fetched by scripts/toy-add.mjs in the
# node container (it has the network), the picture is moved to your originals folder (outside git), then shrunk in the no-network sandbox
# (photo.sh: web version; og-image.sh: share picture and grid thumbnail). The post is written as a draft; nothing is committed or uploaded.
#   scripts/toy-add.sh <product-url> [--owner me|son] [--tags a,b] [--slug my-toy] [--title "..."] [--image <file>] [--date YYYY-MM-DD]
# --image <file> --title "...": use your own picture and fetch nothing (shops behind a login or captcha, such as shopee.tw).
# Originals: ../blog-originals/toys/<slug>/ (or BLOG_ORIGINALS=/path).
set -euo pipefail
cd "$(dirname "$0")/.."
ORIG=${BLOG_ORIGINALS:-$PWD/../blog-originals}
tmp=backup/toy-tmp
[ $# -ge 1 ] || { sed -n '2,7p' "$0"; exit 2; }
[ ! -e "$tmp" ] || [ -z "$(ls -A "$tmp")" ] || { echo "$tmp is not empty (a previous run?); move or remove it first" >&2; exit 1; }
mkdir -p "$tmp"
# --image points at a file on the host; the container sees only this directory, so copy it in first
args=(); while [ $# -gt 0 ]; do
  if [ "$1" = "--image" ]; then [ -f "${2:-}" ] || { echo "no such file: ${2:-}" >&2; exit 1; }
    ext=$(echo "${2##*.}" | tr '[:upper:]' '[:lower:]'); cp "$2" "$tmp/own.$ext"; args+=(--image "$tmp/own.$ext"); shift 2
  else args+=("$1"); shift; fi
done
scripts/docker.sh node scripts/toy-add.mjs "${args[@]}" --out "$tmp"
rm -f "$tmp"/own.*
slug=$(ls "$tmp"); [ -n "$slug" ] && [ -d "$tmp/$slug" ] || { echo "no picture folder in $tmp" >&2; exit 1; }
mkdir -p "$ORIG/toys"
[ ! -e "$ORIG/toys/$slug" ] || { echo "$ORIG/toys/$slug already exists; refusing to overwrite your originals" >&2; exit 1; }
mv "$tmp/$slug" "$ORIG/toys/$slug"; rmdir "$tmp"
scripts/photo.sh "$ORIG/toys/$slug" "content/toys/media/$slug"
rm -f "content/toys/media/$slug/manifest.tsv"      # pictures only in the media folder (the release archive refuses anything else)
scripts/og-image.sh "$ORIG/toys/$slug/$(ls "$ORIG/toys/$slug" | head -1)" "content/toys/media/$slug"
echo "done. Originals: $ORIG/toys/$slug  Web versions: content/toys/media/$slug (git-ignored)"
echo "next: 1) scripts/docker.sh npm run dev (look at /zh/toys/)  2) edit the draft (owner, tags, summary; remove draft: true)  3) scripts/media.sh push toys $slug  4) commit the post file"
