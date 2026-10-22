#!/usr/bin/env bash
# Safely unpack one picture archive from the "media" release into a content folder.
#   scripts/media-extract.sh <archive.tar> <content-dir>
# The archive is downloaded from the network during the deploy, so it is treated as untrusted: every entry must be a plain file named
# <section>/media/<slug>/<file>.<image extension>. Directories, links, devices, absolute or ".." paths and anything else are refused
# before a single byte is extracted. Nothing is extracted with the archive's owner or permissions.
set -euo pipefail
[ $# -eq 2 ] || { sed -n '2,7p' "$0"; exit 2; }
tarf=$1; dest=$2
[ -f "$tarf" ] && [ -d "$dest" ] || { echo "usage error: need an archive and an existing directory" >&2; exit 2; }
max=${MEDIA_MAX_BYTES:-524288000}
[ "$(stat -c %s "$tarf")" -le "$max" ] || { echo "$tarf is larger than $max bytes; refusing" >&2; exit 1; }
bad=$(tar -tvf "$tarf" | awk '{ t = substr($1, 1, 1); name = $NF;
  if (t != "-" || name !~ /^[a-z0-9-]+\/media\/[a-z0-9-]+\/[A-Za-z0-9._-]+\.(webp|jpg|jpeg|png|gif|avif)$/) print $0 }')
if [ -n "$bad" ]; then echo "refusing $tarf: unexpected entries:" >&2; echo "$bad" | head -5 >&2; exit 1; fi
tar -xf "$tarf" -C "$dest" --no-same-owner --no-same-permissions --no-overwrite-dir
