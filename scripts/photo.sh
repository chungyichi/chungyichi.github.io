#!/usr/bin/env bash
# Shrink and convert pictures for the web, in a sandbox. Runs on the host (like backup.sh), not inside the node container.
#   scripts/photo.sh --build                     build the tool image (needs the network once)
#   scripts/photo.sh <input-dir> <output-dir>    long edge <= 1600 px, WebP quality 80, metadata (EXIF/GPS) removed
# Env: PHOTO_MAX (default 1600), PHOTO_QUALITY (default 80).
# The container has NO network, a read-only root, the input mounted read-only, only <output-dir> writable, no capabilities.
# The originals are never modified; <output-dir> must be empty or new.
set -euo pipefail
cd "$(dirname "$0")/.."
IMAGE=blog-photo-tool:1
dk() { if docker info >/dev/null 2>&1; then docker "$@"; else sg docker -c "docker $(printf '%q ' "$@")"; fi; }
if [ "${1:-}" = "--build" ]; then dk build -t "$IMAGE" scripts/photo; exit; fi
[ $# -eq 2 ] || { sed -n '2,7p' "$0"; exit 2; }
in=$(realpath "$1"); out=$(realpath -m "$2")
[ -d "$in" ] || { echo "not a directory: $in" >&2; exit 2; }
case "$out/" in "$in/"*) echo "output must not be inside the input" >&2; exit 2;; esac
if [ -e "$out" ] && [ -n "$(ls -A "$out")" ]; then echo "output directory is not empty: $out" >&2; exit 2; fi
mkdir -p "$out"
dk image inspect "$IMAGE" >/dev/null 2>&1 || { echo "tool image missing; run: scripts/photo.sh --build" >&2; exit 2; }
dk run --rm --network none --user "$(id -u):$(id -g)" --read-only --cap-drop ALL --security-opt no-new-privileges \
  --pids-limit 256 --memory 4g --tmpfs /tmp:rw,nosuid,size=512m \
  -e PHOTO_MAX="${PHOTO_MAX:-1600}" -e PHOTO_QUALITY="${PHOTO_QUALITY:-80}" \
  -v "$in:/in:ro" -v "$out:/out" -v "$PWD/scripts/photo/run.sh:/run.sh:ro" \
  "$IMAGE" sh /run.sh
awk -F'\t' 'NR>1 {n++; a+=$4; b+=$5} END {printf "%d pictures: %.1f MB -> %.1f MB (%.0f%%)\n", n, a/1048576, b/1048576, (a? 100*b/a : 0)}' "$out/manifest.tsv"
