#!/usr/bin/env bash
set -Eeuo pipefail
# R3 batch07: 74 editorial approvals. Explicit, pinned server-side release only.
fatal() { printf 'HALLEUS_R3_BATCH07 | SAFETY_FATAL | %s\n' "$*" >&2; exit 1; }
fail_stage() { printf 'HALLEUS_R3_BATCH07 | %s | %s\n' "$1" "$2" >&2; exit 1; }
[[ $# -eq 2 && "$1" =~ ^[a-f0-9]{40}$ && "$2" = '--approved-74' ]] || fatal 'Usage: sudo bash release.sh <40-char commit> --approved-74'
[[ "$EUID" -eq 0 ]] || fatal 'Must run via sudo'

COMMIT="$1"
SOURCE=/srv/halleus/source
CURRENT=/srv/halleus/current
ENV_FILE=/etc/halleus/halleus.env
NODE=/usr/local/bin/node
TAG=v2026.11.01-r3-batch07-wiki74-r2
RELEASE_SCRIPT=ops/vps/halleus-release.sh
TMP=''
cleanup() { if [[ -n "$TMP" && -d "$TMP" ]]; then rm -rf -- "$TMP"; fi; }
trap cleanup EXIT
as_deploy() { runuser -u deploy -- "$@"; }
test -d "$SOURCE/.git" || fatal 'Source Git checkout absent'
test -r "$ENV_FILE" || fatal 'Production environment unavailable'
test -x "$NODE" || fatal 'Production Node unavailable'
getent passwd deploy >/dev/null || fatal 'Deploy account absent'
test -L "$CURRENT" || fatal 'Current release link absent'
ACTIVE="$(readlink -f "$CURRENT")"
test -f "$ACTIVE/.next/BUILD_ID" && test -d "$ACTIVE/node_modules" || fatal 'Active release incomplete'
systemctl is-active --quiet halleus.service || fatal 'Site unhealthy before change'

ORIGIN="$(as_deploy git -C "$SOURCE" remote get-url origin)"
case "$ORIGIN" in
  https://github.com/bleucluod/astro-clean|https://github.com/bleucluod/astro-clean.git|git@github.com:bleucluod/astro-clean.git) ;;
  *) fatal 'Wrong GitHub origin' ;;
esac
[[ "$(as_deploy git -C "$SOURCE" branch --show-current)" = main ]] || fatal 'Source not on main'
[[ -z "$(as_deploy git -C "$SOURCE" status --porcelain=v1 --untracked-files=all)" ]] || fatal 'Dirty source worktree; preserve user edits'
BEFORE="$(as_deploy git -C "$SOURCE" rev-parse HEAD)"
printf 'HALLEUS_R3_BATCH07 | SOURCE_SAFE | head=%s\n' "$BEFORE"
if ! GIT_TERMINAL_PROMPT=0 as_deploy git -C "$SOURCE" fetch --tags --prune origin main; then
  fail_stage EXTERNAL_BLOCK 'Git fetch failed; no release/DB changes'
fi
REMOTE="$(as_deploy git -C "$SOURCE" rev-parse refs/remotes/origin/main)"
[[ "$REMOTE" = "$COMMIT" ]] || fatal 'Remote main not equal to pinned commit'
as_deploy git -C "$SOURCE" merge-base --is-ancestor "$BEFORE" "$COMMIT" || fatal 'Target commit is not a fast-forward from source'
as_deploy git -C "$SOURCE" cat-file -e "$COMMIT^{commit}" || fatal 'Commit object unavailable'

TMP="$(mktemp -d -t halleus-r3-batch07.XXXXXXXX)" || fatal 'Temp dir unavailable'
as_deploy git -C "$SOURCE" archive "$COMMIT" \
  scripts/apply-r3-batch07.mjs scripts/verify-r3-batch07-live.mjs content/r3-batch07 \
  "$RELEASE_SCRIPT" ops/vps/halleus-release-storage.env | tar -x -C "$TMP"
test -f "$TMP/content/r3-batch07/manifest.json" || fatal 'Pinned release manifest unavailable'
test -f "$TMP/ops/vps/halleus-release.sh" || fatal 'Official release script missing'
ln -s "$ACTIVE/node_modules" "$TMP/node_modules"
if ! "$NODE" "$TMP/scripts/apply-r3-batch07.mjs" --self-check; then
  fail_stage CANDIDATE_FAILURE 'Offline 74-file/hash/fixture checks failed; no DB changes'
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
[[ -n "${DATABASE_URL:-}" ]] || fail_stage EXTERNAL_BLOCK 'DATABASE_URL missing from actual VPS environment'
if ! "$NODE" "$TMP/scripts/apply-r3-batch07.mjs" --check; then
  fail_stage CANDIDATE_FAILURE 'Read-only DB preflight failed; site/DB unchanged'
fi
printf 'HALLEUS_R3_BATCH07 | PREFLIGHT_PASS | 74 approved published URLs\n'

if [[ -f "$ACTIVE/.halleus-release" ]] && grep -Fxq "commit=$COMMIT" "$ACTIVE/.halleus-release"; then
  NEW_CURRENT="$ACTIVE"
  printf 'HALLEUS_R3_BATCH07 | RESUMED_PASS | pinned renderer already active\n'
else
  if as_deploy git -C "$SOURCE" rev-parse -q --verify "refs/tags/$TAG^{commit}" >/dev/null 2>&1; then
    EXISTING="$(as_deploy git -C "$SOURCE" rev-list -n 1 "$TAG")"
    [[ "$EXISTING" = "$COMMIT" ]] || fatal 'Local release tag collision'
  else
    as_deploy git -C "$SOURCE" tag "$TAG" "$COMMIT" || fail_stage EXTERNAL_BLOCK 'Cannot create local release tag'
  fi
  if ! bash "$TMP/$RELEASE_SCRIPT" deploy --commit "$COMMIT" --tag "$TAG"; then
    fail_stage EXTERNAL_BLOCK 'Official atomic release failed; inspect current/previous symlinks'
  fi
  NEW_CURRENT="$(readlink -f "$CURRENT")"
fi
test -f "$NEW_CURRENT/.halleus-release" || fatal 'Release metadata missing'
grep -Fxq "commit=$COMMIT" "$NEW_CURRENT/.halleus-release" || fatal 'Active release not pinned to commit'
printf 'HALLEUS_R3_BATCH07 | RELEASE_ACTIVE | %s\n' "$NEW_CURRENT"

export HALLEUS_R3_BATCH07_RELEASE_APPROVED=YES
export HALLEUS_R3_RELEASE_APPROVAL_REFERENCE=user-2026-11-01-github-and-vps-sync-74
if ! "$NODE" "$NEW_CURRENT/scripts/apply-r3-batch07.mjs" --apply; then
  fail_stage CANDIDATE_FAILURE 'Transactional DB apply failed; do not claim publication'
fi
if ! "$NODE" "$NEW_CURRENT/scripts/apply-r3-batch07.mjs" --verify; then
  fail_stage CANDIDATE_FAILURE 'DB post-image parity failed; keep renderer active for safe recovery'
fi
printf 'HALLEUS_R3_BATCH07 | DB_EXACT_PARITY_PASS | pages=74\n'
if ! "$NODE" "$NEW_CURRENT/scripts/verify-r3-batch07-live.mjs"; then
  fail_stage EXTERNAL_BLOCK 'Live URL parity failed; database committed but publication not verified'
fi
systemctl is-active --quiet halleus.service || fatal 'Service not active after publication'
printf 'HALLEUS_R3_BATCH07_PUBLISHED_AND_VERIFIED | pages=74 | commit=%s | current=%s | previous=%s\n' "$COMMIT" "$NEW_CURRENT" "$(readlink -f /srv/halleus/previous)"
