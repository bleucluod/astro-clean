#!/usr/bin/env bash
set -Eeuo pipefail

BASELINE="b7d016ef817f9434ee8289dbd7cdd17a3beb9c9e"
EVIDENCE="$GITHUB_WORKSPACE/evidence"
AFTER="$EVIDENCE/after-state"

test -f "$EVIDENCE/manifest.txt"
test -f "$AFTER/scripts/check-report-publication-mutation.mjs"

while IFS= read -r -d '' file; do
  relative="${file#"$AFTER/"}"
  mkdir -p "$(dirname "$GITHUB_WORKSPACE/$relative")"
  cp "$file" "$GITHUB_WORKSPACE/$relative"
done < <(find "$AFTER" -type f -print0)

git --no-pager diff --check

export HALLEUS_PUBLICATION_MUTATION_DATABASE_URL="postgres://postgres:postgres@127.0.0.1:5432/halleus_a2b"
pnpm run check:report-publication-mutation

echo "POSTGRES_PUBLICATION_MUTATION_PREFLIGHT=PASS"
