#!/usr/bin/env bash
# Make the share picture (og.jpg, 1200x630 JPEG) and the list thumbnail (thumb.webp, 400x210 WebP) from one original,
# in the same sandbox as photo.sh (no network, read-only input, nothing else writable).
#   scripts/og-image.sh <original-file> <output-dir> [--square]
# --square also writes card.webp (480x480 WebP), the square card of the toy grid.
# Cropped around the most interesting part (libvips "attention" smartcrop); metadata removed. Existing files are never overwritten.
set -euo pipefail
cd "$(dirname "$0")/.."
IMAGE=blog-photo-tool:1
dk() { if docker info >/dev/null 2>&1; then docker "$@"; else sg docker -c "docker $(printf '%q ' "$@")"; fi; }
square=""; [ "${3:-}" != "--square" ] || { square=1; set -- "$1" "$2"; }
[ $# -eq 2 ] || { sed -n '2,6p' "$0"; exit 2; }
in=$(realpath "$1"); out=$(realpath -m "$2")
[ -f "$in" ] || { echo "not a file: $in" >&2; exit 2; }
mkdir -p "$out"
for f in og.jpg thumb.webp ${square:+card.webp}; do [ ! -e "$out/$f" ] || { echo "$out/$f exists; refusing to overwrite" >&2; exit 2; }; done
case "$in" in *.gif|*.GIF|*.webp|*.WEBP) suffix="[n=1]";; *) suffix="";; esac   # first frame of an animation
dk image inspect "$IMAGE" >/dev/null 2>&1 || { echo "tool image missing; run: scripts/photo.sh --build" >&2; exit 2; }
# two plain runs (no shell script inside the container, so there is nothing to quote)
run() { dk run --rm --network none --user "$(id -u):$(id -g)" --read-only --cap-drop ALL --security-opt no-new-privileges \
  --pids-limit 256 --memory 2g --tmpfs /tmp:rw,nosuid,size=256m -v "$(dirname "$in"):/in:ro" -v "$out:/out" "$IMAGE" "$@"; }
src="/in/$(basename "$in")$suffix"
run vipsthumbnail "$src" --size 1200x630 --smartcrop attention -o "/out/og.jpg[Q=82,strip]"
run vipsthumbnail "$src" --size 400x210 --smartcrop attention -o "/out/thumb.webp[Q=75,strip]"
[ -z "$square" ] || run vipsthumbnail "$src" --size 480x480 --smartcrop attention -o "/out/card.webp[Q=78,strip]"
echo "wrote $out/og.jpg ($(du -h "$out/og.jpg" | cut -f1)) and $out/thumb.webp ($(du -h "$out/thumb.webp" | cut -f1))${square:+ and $out/card.webp ($(du -h "$out/card.webp" | cut -f1))}"
