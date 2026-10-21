#!/usr/bin/env bash
# One-way snapshot of ALL documents into the private vault repo: published posts and pages,
# content/_private/ (drafts, imports) and backup/ (the original Medium export). Runs on the host
# (needs git and cp only). It commits in the vault; it never pushes, and it never touches this repo.
#   scripts/backup.sh            # VAULT defaults to ../blog-vault (a clone of chungyichi/blog-vault)
#   VAULT=/path scripts/backup.sh
set -euo pipefail
cd "$(dirname "$0")/.."
VAULT=${VAULT:-$PWD/../blog-vault}
[ -d "$VAULT/.git" ] || { echo "error: $VAULT is not a git clone; run: gh repo clone chungyichi/blog-vault $VAULT" >&2; exit 1; }
# Refuse to write into anything that is not private (a public repo would publish the drafts).
vis=$(git -C "$VAULT" remote get-url origin | sed -E 's#(\.git)?$##; s#.*github.com[:/]##' | xargs -I{} gh api repos/{} --jq .visibility 2>/dev/null || true)
[ "$vis" = "private" ] || { echo "error: cannot confirm that the vault's remote is private (got '${vis:-unknown}'); not copying" >&2; exit 1; }

for d in content backup; do
  [ -e "$d" ] || continue
  rm -rf "${VAULT:?}/$d"
  cp -a "$d" "$VAULT/$d"
done
git -C "$VAULT" add -A
if git -C "$VAULT" diff --cached --quiet; then echo "vault is up to date"; exit 0; fi
git -C "$VAULT" commit -q -m "Snapshot $(date -u +%Y-%m-%dT%H:%MZ)"
echo "committed in $VAULT; review and push with: git -C $VAULT push"
