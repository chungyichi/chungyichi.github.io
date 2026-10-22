#!/usr/bin/env bash
# Publish one imported private post: pictures -> sandboxed WebP (photo.sh), post moved from content/_private/ to content/<section>/.
#   scripts/publish.sh <section> <slug> [--allow-unpublished]
# Steps: (1) move the post's downloaded pictures out of the repo to ../blog-originals/<section>/<slug>/ (your originals, never in git),
# (2) shrink + convert them in the no-network container, (3) rewrite and move the post. It does not commit or push: review with
# `scripts/docker.sh npm run dev` and `npm run check`, then upload the pictures (scripts/media.sh push) and commit the post yourself. Posts never published on Medium are refused unless --allow-unpublished.
set -euo pipefail
cd "$(dirname "$0")/.."
[ $# -ge 2 ] || { sed -n '2,7p' "$0"; exit 2; }
section=$1; slug=$2; shift 2
[[ $section =~ ^[a-z0-9-]+$ && $slug =~ ^[a-z0-9-]+$ ]] || { echo "bad section or slug" >&2; exit 2; }
priv=content/_private/$section/media/$slug
orig=../blog-originals/$section/$slug
tmp=backup/photo-tmp/$section/$slug
[ -d "$priv" ] || [ -d "$orig" ] || { echo "no pictures for $slug (looked in $priv and $orig)" >&2; exit 1; }
[ ! -e content/$section/media/$slug ] || { echo "content/$section/media/$slug already exists" >&2; exit 1; }
docker_node() { scripts/docker.sh "$@"; }
# refuse before moving anything when the post was never published on Medium
python3 - "$section" "$slug" "$*" <<'PY'
import json, os, sys
section, slug, flags = sys.argv[1:4]
p = f"content/_private/{section}/import-map.json"
m = json.load(open(p)) if os.path.exists(p) else {}
if any(e["slug"] == slug and e.get("unpublishedInMedium") for e in m.values()) and "--allow-unpublished" not in flags:
    sys.exit(f"'{slug}' was never published on Medium (a draft); pass --allow-unpublished only if you really mean to publish it")
PY
if [ -d "$priv" ]; then
  mkdir -p "$(dirname "$orig")"
  [ ! -e "$orig" ] || { echo "$orig already exists; refusing to overwrite your originals" >&2; exit 1; }
  mv "$priv" "$orig"
fi
rm -rf "$tmp"; mkdir -p "$(dirname "$tmp")"
scripts/photo.sh "$orig" "$tmp"
# share picture (og.jpg) and list thumbnail (thumb.webp): the post's first picture, cropped (override the share picture later with `image:` in the front matter)
first=$(grep -o "/media/$section/$slug/[A-Za-z0-9._-]*" content/_private/$section/*-$slug.*.html 2>/dev/null | head -1 | sed 's#.*/##') || true
if [ -n "${first:-}" ]; then
  src=$(ls "$orig/${first%.*}".* 2>/dev/null | head -1 || true)
  [ -n "$src" ] && scripts/og-image.sh "$src" "$tmp" || echo "note: could not make the share picture and thumbnail"
fi
docker_node node scripts/publish.mjs "$section" "$slug" "$@"
rm -rf "$tmp"
echo "done. Originals: $(realpath "$orig")  Web versions: content/$section/media/$slug (git-ignored)"
echo "next: 1) scripts/docker.sh npm run dev (look)  2) scripts/media.sh push $section $slug  3) commit the post file and push"
