#!/bin/sh
# Runs INSIDE the sandbox container: /in (read-only) -> /out. Shrinks to a maximum long edge, converts to WebP, strips metadata
# (EXIF including GPS). Never enlarges. Writes /out/manifest.tsv: file, width, height, bytes_in, bytes_out.
set -eu
MAX=${PHOTO_MAX:-1600}; Q=${PHOTO_QUALITY:-80}
printf 'file\twidth\theight\tbytes_in\tbytes_out\n' > /out/manifest.tsv
find /in -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' -o -iname '*.gif' -o -iname '*.avif' \) | sort | while IFS= read -r f; do
  rel=${f#/in/}; out="/out/${rel%.*}.webp"
  mkdir -p "$(dirname "$out")"
  # ">" = only shrink. GIF/WebP may be animated: [n=1] keeps the first frame only (a still is what the blog wants).
  case "$f" in *.gif|*.GIF|*.webp|*.WEBP) src="$f[n=1]";; *) src="$f";; esac
  if vipsthumbnail "$src" --size "${MAX}x${MAX}>" -o "$out[Q=$Q,strip]" 2>/tmp/err; then
    w=$(vipsheader -f width "$out"); h=$(vipsheader -f height "$out")
    printf '%s\t%s\t%s\t%s\t%s\n' "${rel%.*}.webp" "$w" "$h" "$(stat -c %s "$f")" "$(stat -c %s "$out")" >> /out/manifest.tsv
  else
    echo "SKIPPED $rel: $(head -c 200 /tmp/err | tr '\n' ' ')" >&2
    rm -f "$out"
  fi
done
