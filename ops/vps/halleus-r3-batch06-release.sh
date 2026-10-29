#!/usr/bin/env bash
set -Eeuo pipefail
# Halleus R3: exactly 56 unique Wiki URLs from 60 approved revisions.
# Production DB mutation occurs only after locked content and read-only preflight pass.
fail() { printf 'HALLEUS_R3_BATCH06 | SAFETY_FATAL | %s\n' "$*" >&2; exit 1; }
stage_fail() { printf 'HALLEUS_R3_BATCH06 | %s | %s\n' "$1" "$2" >&2; exit 1; }
[[ $# -eq 1 && "$1" =~ ^[a-f0-9]{40}$ ]] || fail 'Usage: sudo bash <pinned sync script> <full commit SHA>'
[[ "$EUID" -eq 0 ]] || fail 'Run as root via sudo'
COMMIT="$1"
SOURCE=/srv/halleus/source
CURRENT=/srv/halleus/current
ENV_FILE=/etc/halleus/halleus.env
NODE=/usr/local/bin/node
TAG=v2026.10.29-r3-batch06-wiki56
RELEASE_SCRIPT=ops/vps/halleus-release.sh
TMP=''
cleanup() { if [ -n "$TMP" ] && [ -d "$TMP" ]; then rm -rf -- "$TMP"; fi; }
trap cleanup EXIT
as_deploy() { runuser -u deploy -- "$@"; }
test -d "$SOURCE/.git" || fail 'Source git directory missing'
test -f "$ENV_FILE" && test -r "$ENV_FILE" || fail 'Self-hosted production env file unavailable'
test -x "$NODE" || fail 'Production Node binary missing'
getent passwd deploy >/dev/null || fail 'deploy user missing'
test -L "$CURRENT" || fail 'Current release symlink missing'
ACTIVE="$(readlink -f "$CURRENT")"
test -f "$ACTIVE/.next/BUILD_ID" && test -d "$ACTIVE/node_modules" || fail 'Current runtime unavailable'
systemctl is-active --quiet halleus.service || fail 'Service is not healthy before change'
ORIGIN="$(as_deploy git -C "$SOURCE" remote get-url origin)"
case "$ORIGIN" in
  https://github.com/bleucluod/astro-clean|https://github.com/bleucluod/astro-clean.git|git@github.com:bleucluod/astro-clean.git) ;;
  *) fail 'Wrong origin repository' ;;
esac
BRANCH="$(as_deploy git -C "$SOURCE" branch --show-current)"
[ "$BRANCH" = main ] || fail 'Wrong branch: expected main'
[ -z "$(as_deploy git -C "$SOURCE" status --porcelain=v1 --untracked-files=all)" ] || fail 'Unrelated dirty files in source repository'
BEFORE="$(as_deploy git -C "$SOURCE" rev-parse HEAD)"
printf 'HALLEUS_R3_BATCH06 | SOURCE_SAFE | head=%s\n' "$BEFORE"
if ! GIT_TERMINAL_PROMPT=0 as_deploy git -C "$SOURCE" fetch --tags --prune origin main; then
  stage_fail EXTERNAL_BLOCK 'Non-interactive Git fetch failed; no production content touched'
fi
REMOTE="$(as_deploy git -C "$SOURCE" rev-parse refs/remotes/origin/main)"
[ "$REMOTE" = "$COMMIT" ] || fail 'Remote main moved or wrong target commit'
as_deploy git -C "$SOURCE" merge-base --is-ancestor "$BEFORE" "$COMMIT" || fail 'Target not descendant of source HEAD'
as_deploy git -C "$SOURCE" cat-file -e "$COMMIT^{commit}" || fail 'Requested commit not available'
TMP="$(mktemp -d -t halleus-r3-batch06.XXXXXXXX)" || fail 'Preflight temp unavailable'
as_deploy git -C "$SOURCE" archive "$COMMIT" scripts/apply-r3-batch06.mjs scripts/verify-r3-batch06-live.mjs content/r3-batch06 "$RELEASE_SCRIPT" ops/vps/halleus-release-storage.env | tar -x -C "$TMP"
test -f "$TMP/content/r3-batch06/release-data-manifest.json" || fail 'Pinned data not available'
test -f "$TMP/ops/vps/halleus-release.sh" || fail 'Official pinned release script missing'
ln -s "$ACTIVE/node_modules" "$TMP/node_modules"
if ! "$NODE" "$TMP/scripts/apply-r3-batch06.mjs" --self-check; then
  stage_fail CANDIDATE_FAILURE 'Offline native content checks failed; no deploy or DB changes'
fi
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
if [ -z "$(printenv DATABASE_URL 2>/dev/null || true)" ]; then
  stage_fail EXTERNAL_BLOCK 'DATABASE_URL is not present in the real self-hosted environment'
fi
if ! "$NODE" "$TMP/scripts/apply-r3-batch06.mjs" --check; then
  stage_fail CANDIDATE_FAILURE 'Read-only DB preflight failed; no production data changed'
fi
printf 'HALLEUS_R3_BATCH06 | PREFLIGHT_PASS | 56 unique native pages / 282 links\n'
if [ -f "$ACTIVE/.halleus-release" ] && grep -Fxq "commit=$COMMIT" "$ACTIVE/.halleus-release"; then
  NEW_CURRENT="$ACTIVE"
  printf 'HALLEUS_R3_BATCH06 | RESUMED_PASS | release already active at pinned commit\n'
else
  if as_deploy git -C "$SOURCE" rev-parse -q --verify "refs/tags/$TAG^{commit}" >/dev/null 2>&1; then
    EXISTING="$(as_deploy git -C "$SOURCE" rev-list -n 1 "$TAG")"
    [ "$EXISTING" = "$COMMIT" ] || fail 'Tag conflict with another release'
  else
    as_deploy git -C "$SOURCE" tag "$TAG" "$COMMIT" || stage_fail EXTERNAL_BLOCK 'Unable to create exact-commit local release tag'
  fi
  if ! bash "$TMP/$RELEASE_SCRIPT" deploy --commit "$COMMIT" --tag "$TAG"; then
    stage_fail EXTERNAL_BLOCK 'Official release failed; inspect current/previous symlinks before retry'
  fi
  NEW_CURRENT="$(readlink -f "$CURRENT")"
fi
test -f "$NEW_CURRENT/.halleus-release" || fail 'Active release metadata missing'
grep -Fxq "commit=$COMMIT" "$NEW_CURRENT/.halleus-release" || fail 'Active release does not match target'
printf 'HALLEUS_R3_BATCH06 | RELEASE_ACTIVE | %s\n' "$NEW_CURRENT"
export HALLEUS_R3_BATCH06_RELEASE_APPROVED=YES
export HALLEUS_R3_RELEASE_APPROVAL_REFERENCE=user-2026-10-29-56-unique-from-60-approvals
if ! "$NODE" "$NEW_CURRENT/scripts/apply-r3-batch06.mjs" --apply; then
  stage_fail CANDIDATE_FAILURE 'DB apply failed; no success claim; inspect DB transaction evidence'
fi
if ! "$NODE" "$NEW_CURRENT/scripts/apply-r3-batch06.mjs" --verify; then
  stage_fail CANDIDATE_FAILURE 'DB after-image mismatch; live verification not claimed'
fi
printf 'HALLEUS_R3_BATCH06 | DB_EXACT_PARITY_PASS | 56 unique pages\n'
if ! "$NODE" "$NEW_CURRENT/scripts/verify-r3-batch06-live.mjs"; then
  stage_fail EXTERNAL_BLOCK 'DB passed but live pages failed parity; do not claim complete'
fi
systemctl is-active --quiet halleus.service || fail 'Service inactive after publication'
printf 'HALLEUS_R3_BATCH06_PUBLISHED_AND_VERIFIED | pages=56 | approvals=60 | commit=%s | active=%s | previous=%s\n' "$COMMIT" "$NEW_CURRENT" "$(readlink -f /srv/halleus/previous)"
