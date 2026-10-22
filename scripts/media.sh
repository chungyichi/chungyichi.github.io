#!/usr/bin/env bash
# Published pictures live in a GitHub Release named "media" (one archive per post), never in git history. Runs on the host and in the deploy.
#   scripts/media.sh push <section> <slug>    pack content/<section>/media/<slug>/ and upload it (replaces the old one); then run the deploy
#   scripts/media.sh delete <section> <slug>  remove that post's archive from the release (really deletes it)
#   scripts/media.sh pull                     download every archive and unpack into content/ (the deploy does this before the build)
#   scripts/media.sh list
# Needs the gh CLI (logged in on the host; GH_TOKEN and GH_REPO in the deploy).
set -euo pipefail
cd "$(dirname "$0")/.."
TAG=media
cmd=${1:-}; section=${2:-}; slug=${3:-}
ok() { [[ $1 =~ ^[a-z0-9-]+$ ]] || { echo "bad name: $1" >&2; exit 2; }; }
case $cmd in
  push)
    ok "$section"; ok "$slug"
    dir=content/$section/media/$slug
    [ -d "$dir" ] && [ -n "$(ls -A "$dir")" ] || { echo "no pictures in $dir" >&2; exit 1; }
    tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
    name=media-$section-$slug.tar
    find "content/$section/media/$slug" -type f | sed 's#^content/##' | sort | tar -cf "$tmp/$name" -C content --files-from=-
    gh release view "$TAG" >/dev/null 2>&1 || gh release create "$TAG" --title "media" --prerelease --latest=false \
      --notes "Pictures of the published posts, one archive per post. The site build downloads them (scripts/media.sh). Not a software release."
    gh release upload "$TAG" "$tmp/$name" --clobber
    echo "uploaded $name ($(du -h "$tmp/$name" | cut -f1)). Deploy with: gh workflow run deploy.yml   (or push a commit)" ;;
  delete)
    ok "$section"; ok "$slug"
    gh release delete-asset "$TAG" "media-$section-$slug.tar" --yes
    echo "deleted media-$section-$slug.tar from the release. Remove content/$section/media/$slug locally if you like, then deploy." ;;
  pull)
    tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
    if ! gh release download "$TAG" --pattern 'media-*.tar' --dir "$tmp" 2>"$tmp/err"; then
      echo "note: no picture archives downloaded ($(head -c 200 "$tmp/err" | tr '\n' ' '))"; exit 0
    fi
    for f in "$tmp"/media-*.tar; do [ -e "$f" ] && bash scripts/media-extract.sh "$f" content; done
    echo "unpacked $(find content -path '*/media/*' -type f -not -path 'content/_private/*' | wc -l) pictures" ;;
  list)
    gh release view "$TAG" --json assets -q '.assets[] | "\(.name)\t\(.size) bytes"' ;;
  *) sed -n '2,9p' "$0"; exit 2 ;;
esac
