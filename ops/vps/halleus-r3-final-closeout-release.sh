#!/usr/bin/env bash
set -Eeuo pipefail
# GitHub-first R3 final closeout. Run ONLY after the owner separately approves VPS release.
fatal() { printf 'HALLEUS_R3_CLOSEOUT | SAFETY_FATAL | %s\n' "$*" >&2; exit 1; }
fail_stage() { printf 'HALLEUS_R3_CLOSEOUT | %s | %s\n' "$1" "$2" >&2; exit 1; }
[[ $# -eq 2 && "$1" =~ ^[a-f0-9]{40}$ && "$2" = '--approved-closeout' ]] || fatal 'Usage: sudo bash release.sh <pinned 40-character main SHA> --approved-closeout'
[[ "$EUID" -eq 0 ]] || fatal 'Must run via sudo'

COMMIT="$1"
SOURCE=/srv/halleus/source
CURRENT=/srv/halleus/current
ENV_FILE=/etc/halleus/halleus.env
NODE=/usr/local/bin/node
TAG="v2026.11.01-r3-final-closeout-${COMMIT:0:12}"
RELEASE_SCRIPT=ops/vps/halleus-release.sh
BASE_LIVE_SHA=7dab72d4837378d48d380716f1ffa1957974b151
TMP=''
cleanup() { if [[ -n "$TMP" && -d "$TMP" ]]; then rm -rf -- "$TMP"; fi; }
trap cleanup EXIT
as_deploy() { runuser -u deploy -- "$@"; }

test -d "$SOURCE/.git" || fatal 'Source checkout unavailable'
test -r "$ENV_FILE" || fatal 'Production environment unavailable'
test -x "$NODE" || fatal 'Production Node unavailable'
getent passwd deploy >/dev/null || fatal 'Deploy account unavailable'
test -L "$CURRENT" || fatal 'Current release symlink missing'
ACTIVE="$(readlink -f "$CURRENT")"
test -f "$ACTIVE/.next/BUILD_ID" && test -d "$ACTIVE/node_modules" || fatal 'Active release incomplete'
test -f "$ACTIVE/.halleus-release" || fatal 'Active release metadata missing'
if ! grep -Fxq "commit=$BASE_LIVE_SHA" "$ACTIVE/.halleus-release" &&
   ! grep -Fxq "commit=$COMMIT" "$ACTIVE/.halleus-release"; then
  fatal 'Unexpected active release; do not override an unrelated deployment'
fi
systemctl is-active --quiet halleus.service || fatal 'Service unhealthy before change'

ORIGIN="$(as_deploy git -C "$SOURCE" remote get-url origin)"
case "$ORIGIN" in
  https://github.com/bleucluod/astro-clean|https://github.com/bleucluod/astro-clean.git|git@github.com:bleucluod/astro-clean.git) ;;
  *) fatal 'Wrong GitHub origin' ;;
esac
[[ "$(as_deploy git -C "$SOURCE" branch --show-current)" = main ]] || fatal 'Source branch is not main'
[[ -z "$(as_deploy git -C "$SOURCE" status --porcelain=v1 --untracked-files=all)" ]] || fatal 'Source worktree has user changes'
BEFORE="$(as_deploy git -C "$SOURCE" rev-parse HEAD)"
printf 'HALLEUS_R3_CLOSEOUT | SOURCE_SAFE | head=%s\n' "$BEFORE"
GIT_TERMINAL_PROMPT=0 as_deploy git -C "$SOURCE" fetch --tags --prune origin main || fail_stage EXTERNAL_BLOCK 'Git fetch failed; no changes'
REMOTE="$(as_deploy git -C "$SOURCE" rev-parse refs/remotes/origin/main)"
[[ "$REMOTE" = "$COMMIT" ]] || fatal 'GitHub main is not exactly the approved pinned SHA'
as_deploy git -C "$SOURCE" merge-base --is-ancestor "$BEFORE" "$COMMIT" || fatal 'Source cannot fast-forward to target'
as_deploy git -C "$SOURCE" cat-file -e "$COMMIT^{commit}" || fatal 'Pinned commit object missing'

TMP="$(mktemp -d -t halleus-r3-closeout.XXXXXXXX)" || fatal 'Temporary directory unavailable'
as_deploy git -C "$SOURCE" archive "$COMMIT" \
  scripts/apply-r3-final-closeout.mjs scripts/verify-r3-final-closeout-live.mjs \
  scripts/apply-r3-batch07.mjs content/r3-batch07 \
  "$RELEASE_SCRIPT" ops/vps/halleus-release-storage.env | tar -x -C "$TMP"
test -f "$TMP/content/r3-batch07/manifest.json" || fatal 'Approved batch07 manifest unavailable'
ln -s "$ACTIVE/node_modules" "$TMP/node_modules"
"$NODE" "$TMP/scripts/apply-r3-batch07.mjs" --self-check || fail_stage CANDIDATE_FAILURE 'Immutable 74-article lock failed'
"$NODE" "$TMP/scripts/apply-r3-final-closeout.mjs" --self-check || fail_stage CANDIDATE_FAILURE 'Three-source closeout fixtures failed'

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
[[ -n "${DATABASE_URL:-}" ]] || fail_stage EXTERNAL_BLOCK 'DATABASE_URL unavailable in production environment'
"$NODE" "$TMP/scripts/apply-r3-final-closeout.mjs" --check || fail_stage CANDIDATE_FAILURE 'Read-only three-article DB preflight failed; no changes'
printf 'HALLEUS_R3_CLOSEOUT | PREFLIGHT_PASS | three guarded removals\n'

if grep -Fxq "commit=$COMMIT" "$ACTIVE/.halleus-release"; then
  NEW_CURRENT="$ACTIVE"
  printf 'HALLEUS_R3_CLOSEOUT | RESUMED_PASS | renderer already active\n'
else
  if as_deploy git -C "$SOURCE" rev-parse -q --verify "refs/tags/$TAG^{commit}" >/dev/null 2>&1; then
    EXISTING="$(as_deploy git -C "$SOURCE" rev-list -n 1 "$TAG")"
    [[ "$EXISTING" = "$COMMIT" ]] || fatal 'Local tag collision'
  else
    as_deploy git -C "$SOURCE" tag "$TAG" "$COMMIT" || fail_stage EXTERNAL_BLOCK 'Local tag creation failed'
  fi
  bash "$TMP/$RELEASE_SCRIPT" deploy --commit "$COMMIT" --tag "$TAG" || fail_stage EXTERNAL_BLOCK 'Official atomic site release failed; DB unchanged'
  NEW_CURRENT="$(readlink -f "$CURRENT")"
fi
test -f "$NEW_CURRENT/.halleus-release" || fatal 'New release metadata missing'
grep -Fxq "commit=$COMMIT" "$NEW_CURRENT/.halleus-release" || fatal 'New release SHA differs from pinned commit'
printf 'HALLEUS_R3_CLOSEOUT | RELEASE_ACTIVE | %s\n' "$NEW_CURRENT"

export HALLEUS_R3_CLOSEOUT_APPROVED=YES
export HALLEUS_R3_CLOSEOUT_APPROVAL_REFERENCE=user-explicit-vps-r3-closeout
"$NODE" "$NEW_CURRENT/scripts/apply-r3-final-closeout.mjs" --apply || fail_stage CANDIDATE_FAILURE 'Transactional article cleanup failed; do not claim completion'
"$NODE" "$NEW_CURRENT/scripts/apply-r3-final-closeout.mjs" --verify || fail_stage CANDIDATE_FAILURE 'Database post-image parity failed'
"$NODE" "$NEW_CURRENT/scripts/verify-r3-final-closeout-live.mjs" || fail_stage EXTERNAL_BLOCK '74 URLs, sitemap, or redirects failed live parity'
systemctl is-active --quiet halleus.service || fatal 'Service stopped after closeout'
printf 'HALLEUS_R3_FINAL_CLOSEOUT_VERIFIED | commit=%s | current=%s | previous=%s\n' "$COMMIT" "$NEW_CURRENT" "$(readlink -f /srv/halleus/previous)"
