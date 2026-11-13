#!/usr/bin/env bash
# Published pictures live in ONE archive in a GitHub Release named "media" (all sections together), never in git history. Runs on the host and in the deploy.
#   scripts/media.sh push <section> <slug>    put content/<section>/media/<slug>/ into the bundle (replaces that post's old pictures); then run the deploy
#   scripts/media.sh push-many <section>/<slug> ...  the same for several posts with ONE upload of the bundle (use this for a batch)
#   scripts/media.sh delete <section> <slug>  take that post's pictures out of the bundle; every older bundle is deleted too, so they are really gone
#   scripts/media.sh pull                     download the newest bundle and unpack it into content/ (the deploy does this before the build)
#   scripts/media.sh migrate                  old layout (one archive per post) -> one bundle; the old archives stay until `prune-old`
#   scripts/media.sh prune-old                delete the old per-post archives (after a deploy with the bundle worked)
#   scripts/media.sh list
# A bundle is named media-all-<UTC time>.tar; the newest one is used. A push uploads the new bundle first, then deletes the older ones except the
# previous one (a way back if something is wrong). Two people pushing at the same moment: the later upload wins, so push one after another.
# Needs the gh CLI (logged in on the host; GH_TOKEN and GH_REPO in the deploy).
set -euo pipefail
cd "$(dirname "$0")/.."
TAG=media
cmd=${1:-}; section=${2:-}; slug=${3:-}
ok() { [[ $1 =~ ^[a-z0-9-]+$ ]] || { echo "bad name: $1" >&2; exit 2; }; }
names() { gh release view "$TAG" --json assets -q '.assets[].name' 2>/dev/null || true; }
bundles() { names | grep -E '^media-all-[0-9]{8}T[0-9]{6}Z\.tar$' | sort || true; }       # oldest first
legacy() { names | grep -E '^media-[a-z0-9-]+\.tar$' | grep -vE '^media-all-' || true; }
ensure_release() {
  gh release view "$TAG" >/dev/null 2>&1 || gh release create "$TAG" --title "media" --prerelease --latest=false \
    --notes "Pictures of the published posts in one bundle (media-all-<time>.tar, the newest is used). The site build downloads it (scripts/media.sh). Not a software release."
}
# Unpack what the release holds into <dest>: the newest bundle, or (old layout) every per-post archive. Archives are untrusted: media-extract.sh checks them.
fetch_all() {
  local dest=$1 dl newest f
  dl=$(mktemp -d)
  newest=$(bundles | tail -n 1)
  if [ -n "$newest" ]; then
    gh release download "$TAG" --pattern "$newest" --dir "$dl"
  elif [ -n "$(legacy)" ]; then
    gh release download "$TAG" --pattern 'media-*.tar' --dir "$dl"
  else rm -rf "$dl"; return 0; fi
  for f in "$dl"/media-*.tar; do [ -e "$f" ] && bash scripts/media-extract.sh "$f" "$dest"; done
  rm -rf "$dl"
}
# Pack <tree>/<section>/media/** into a new bundle, upload it, check its size in the release, then delete older bundles keeping <keep> of the old ones.
upload_bundle() {
  local tree=$1 keep=$2 name size remote old tmp
  name=media-all-$(date -u +%Y%m%dT%H%M%SZ).tar
  tmp=$(mktemp -d)
  ( cd "$tree" && find . -mindepth 3 -path '*/media/*' -type f | sed 's#^\./##' | sort ) | tar -cf "$tmp/$name" -C "$tree" --files-from=-
  size=$(stat -c %s "$tmp/$name")
  ensure_release
  gh release upload "$TAG" "$tmp/$name"
  remote=$(gh release view "$TAG" --json assets -q ".assets[] | select(.name==\"$name\") | .size")
  [ "$remote" = "$size" ] || { echo "upload check failed: $name is $size bytes here, $remote in the release; older bundles kept" >&2; exit 1; }
  old=$(bundles | grep -vx "$name" || true)
  if [ -n "$old" ]; then
    # keep the newest <keep> old ones, delete the rest
    echo "$old" | head -n "-$keep" 2>/dev/null | while read -r o; do [ -n "$o" ] && gh release delete-asset "$TAG" "$o" --yes; done || true
  fi
  echo "uploaded $name ($(du -h "$tmp/$name" | cut -f1), $(tar -tf "$tmp/$name" | wc -l) pictures)"
  rm -rf "$tmp"
}
# Refuse a folder that holds anything but pictures: the deploy's unpack (media-extract.sh) rejects the WHOLE bundle for one stray file
# (photo.sh used to leave manifest.tsv), and then every picture on the site is broken.
only_pictures() {
  local bad
  bad=$(find "$1" -mindepth 1 \( -type d -o ! -type f -o ! -regex '.*/[A-Za-z0-9._-]+\.\(webp\|jpg\|jpeg\|png\|gif\|avif\)' \) | head -5)
  [ -z "$bad" ] || { echo "$1 has files that are not pictures; the deploy would refuse the whole bundle. Delete them first:" >&2; echo "$bad" >&2; exit 1; }
}
case $cmd in
  push)
    ok "$section"; ok "$slug"
    dir=content/$section/media/$slug
    [ -d "$dir" ] && [ -n "$(ls -A "$dir")" ] || { echo "no pictures in $dir" >&2; exit 1; }
    only_pictures "$dir"
    work=$(mktemp -d); trap 'rm -rf "$work"' EXIT
    fetch_all "$work"
    rm -rf "${work:?}/$section/media/$slug"; mkdir -p "$work/$section/media"; cp -r "$dir" "$work/$section/media/$slug"
    upload_bundle "$work" 1
    echo "Deploy with: gh workflow run deploy.yml   (or push a commit)" ;;
  push-many)
    shift; [ $# -ge 1 ] || { echo "usage: media.sh push-many <section>/<slug> ..." >&2; exit 2; }
    for a in "$@"; do only_pictures "content/${a%%/*}/media/${a#*/}"; done
    work=$(mktemp -d); trap 'rm -rf "$work"' EXIT
    fetch_all "$work"
    for a in "$@"; do
      sec=${a%%/*}; sl=${a#*/}; ok "$sec"; ok "$sl"
      dir=content/$sec/media/$sl
      [ -d "$dir" ] && [ -n "$(ls -A "$dir")" ] || { echo "no pictures in $dir" >&2; exit 1; }
      rm -rf "${work:?}/$sec/media/$sl"; mkdir -p "$work/$sec/media"; cp -r "$dir" "$work/$sec/media/$sl"
    done
    upload_bundle "$work" 1
    echo "$# posts put into the bundle. Deploy with: gh workflow run deploy.yml   (or push a commit)" ;;
  delete)
    ok "$section"; ok "$slug"
    work=$(mktemp -d); trap 'rm -rf "$work"' EXIT
    fetch_all "$work"
    [ -d "$work/$section/media/$slug" ] || { echo "$section/$slug has no pictures in the release" >&2; exit 1; }
    rm -rf "${work:?}/$section/media/$slug"
    upload_bundle "$work" 0
    for o in $(legacy | grep -x "media-$section-$slug.tar" || true); do gh release delete-asset "$TAG" "$o" --yes; done
    echo "removed $section/$slug from the bundle and deleted the older bundles. Remove content/$section/media/$slug locally if you like, then deploy." ;;
  pull)
    err=$(mktemp); trap 'rm -f "$err"' EXIT
    if ! fetch_all content 2>"$err"; then echo "note: no pictures downloaded ($(head -c 200 "$err" | tr '\n' ' '))"; exit 0; fi
    echo "unpacked $(find content -path '*/media/*' -type f -not -path 'content/_private/*' | wc -l) pictures" ;;
  migrate)
    [ -n "$(legacy)" ] || { echo "no per-post archives in the release; nothing to do"; exit 0; }
    work=$(mktemp -d); trap 'rm -rf "$work"' EXIT
    fetch_all "$work"
    upload_bundle "$work" 1
    echo "old per-post archives are still there ($(legacy | wc -l)); delete them with prune-old after a deploy with the bundle worked." ;;
  prune-old)
    [ -n "$(bundles)" ] || { echo "no bundle in the release; refusing to delete the old archives" >&2; exit 1; }
    for o in $(legacy); do gh release delete-asset "$TAG" "$o" --yes; done
    echo "old per-post archives deleted" ;;
  list)
    gh release view "$TAG" --json assets -q '.assets[] | "\(.name)\t\(.size) bytes"' ;;
  *) sed -n '2,10p' "$0"; exit 2 ;;
esac
