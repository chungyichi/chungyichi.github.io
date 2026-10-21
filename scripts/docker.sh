#!/usr/bin/env bash
# Run a command in the Node container (nothing is installed on the host).
#   scripts/docker.sh npm install | npm run dev | npm run check | ...
# The repo is mounted read-write at /app (node_modules and dist land in it, on this disk);
# the container root is read-only, /tmp is tmpfs, the npm cache is kept next to the repo.
set -euo pipefail
cd "$(dirname "$0")/.."
IMAGE=${NODE_IMAGE:-node:24-bookworm}
mkdir -p .npm-cache
dk() { if docker info >/dev/null 2>&1; then docker "$@"; else sg docker -c "docker $(printf '%q ' "$@")"; fi; }
tty=(); [ -t 0 ] && tty=(-it)
dk run --rm "${tty[@]}" --user "$(id -u):$(id -g)" --read-only --cap-drop ALL \
  --security-opt no-new-privileges --pids-limit 2048 --memory 8g \
  --tmpfs /tmp:rw,exec,nosuid,size=2g \
  -v "$PWD:/app" -w /app \
  -e HOME=/tmp/home -e npm_config_cache=/app/.npm-cache -e CI="${CI:-}" \
  -p 127.0.0.1:5173:5173 \
  "$IMAGE" "$@"
