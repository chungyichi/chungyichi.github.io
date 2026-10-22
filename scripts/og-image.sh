#!/usr/bin/env bash
# Make a 1200x630 JPEG share picture from one original, in the same sandbox as photo.sh (no network, read-only input, nothing else writable).
#   scripts/og-image.sh <original-file> <output.jpg>
# Cropped around the most interesting part (libvips "attention" smartcrop); metadata removed.
set -euo pipefail
cd "$(dirname "$0")/.."
IMAGE=blog-photo-tool:1
dk() { if docker info >/dev/null 2>&1; then docker "$@"; else sg docker -c "docker $(printf '%q ' "$@")"; fi; }
[ $# -eq 2 ] || { sed -n '2,5p' "$0"; exit 2; }
in=$(realpath "$1"); out=$(realpath -m "$2")
[ -f "$in" ] || { echo "not a file: $in" >&2; exit 2; }
[[ $out == *.jpg ]] || { echo "output must end in .jpg" >&2; exit 2; }
[ ! -e "$out" ] || { echo "$out exists; refusing to overwrite" >&2; exit 2; }
mkdir -p "$(dirname "$out")"
case "$in" in *.gif|*.GIF|*.webp|*.WEBP) suffix="[n=1]";; *) suffix="";; esac   # first frame of an animation
dk image inspect "$IMAGE" >/dev/null 2>&1 || { echo "tool image missing; run: scripts/photo.sh --build" >&2; exit 2; }
dk run --rm --network none --user "$(id -u):$(id -g)" --read-only --cap-drop ALL --security-opt no-new-privileges \
  --pids-limit 256 --memory 2g --tmpfs /tmp:rw,nosuid,size=256m \
  -v "$(dirname "$in"):/in:ro" -v "$(dirname "$out"):/out" "$IMAGE" \
  vipsthumbnail "/in/$(basename "$in")$suffix" --size 1200x630 --smartcrop attention -o "/out/$(basename "$out")[Q=82,strip]"
echo "wrote $out ($(du -h "$out" | cut -f1))"
