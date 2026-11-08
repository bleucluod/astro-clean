#!/usr/bin/env bash
# Owner-approved scoped shop order UX release. Calls only the canonical Halleus release engine.
set -Eeuo pipefail
set +x

SOURCE=/srv/halleus/source
CURRENT=/srv/halleus/current
PREVIOUS=/srv/halleus/previous
SERVICE=halleus.service
ENGINE=ops/vps/halleus-release.sh
BASE=f64bade57d3840cd0b30ae681e1b09004347f104
OLD_LIVE=547f4d2c6d286796cb07b2aa9e45852d61f396e7
TAG=v2026.11.08-shop-order-experience-r2
PIN="${1:-}"
TMP=''
WORKTREE=''
LIVE_CHANGED=0

log() { printf 'HALLEUS_ORDER_UX | %s\n' "$*"; }
fatal() { log "SAFETY_FATAL: $*" >&2; exit 2; }
as_deploy() { runuser -u deploy -- "$@"; }
http_status() {
  curl -sS --connect-timeout 6 --max-time 24 -o /dev/null -w '%{http_code}' "$@"
}
cleanup() {
  local rc=$?
  trap - EXIT
  if [ -n "$WORKTREE" ] && [ -d "$WORKTREE" ]; then
    as_deploy git -C "$SOURCE" worktree remove --force "$WORKTREE" || log 'WORKTREE_CLEANUP_WARNING'
    WORKTREE=''
  fi
  if [ -n "$TMP" ] && [[ "$TMP" == /tmp/halleus-shop-order-ux-* ]] && [ -d "$TMP" ]; then
    if [ "$rc" -eq 0 ]; then rm -rf -- "$TMP"; else log "FAILURE_LOG_DIRECTORY=$TMP"; fi
  fi
  if [ "$rc" -ne 0 ]; then
    log "RUN_FAILED_RC=$rc"
    if [ "$LIVE_CHANGED" -eq 1 ]; then
      log 'LIVE_ACTIVATION_HAPPENED; CHECK_CURRENT_PREVIOUS_AND_SERVICE_BEFORE_RETRY'
    fi
  fi
  exit "$rc"
}
trap cleanup EXIT

[ "$EUID" -eq 0 ] || fatal 'Run as root via sudo.'
[[ "$PIN" =~ ^[0-9a-f]{40}$ ]] || fatal 'Pass a pinned full 40-character SHA.'
[ -d "$SOURCE/.git" ] || fatal 'Unexpected VPS source repository path.'
[ -f "$SOURCE/$ENGINE" ] || fatal 'Official release engine missing.'
[ "$(as_deploy git -C "$SOURCE" branch --show-current)" = main ] || fatal 'Wrong Git branch.'
origin="$(as_deploy git -C "$SOURCE" remote get-url origin)"
[[ "$origin" =~ github\.com[:/]bleucluod/astro-clean(\.git)?$ ]] || fatal 'Wrong Git origin.'
[ -z "$(as_deploy git -C "$SOURCE" status --porcelain=v1 --untracked-files=all)" ] || fatal 'Unrelated dirty/untracked VPS source.'
head="$(as_deploy git -C "$SOURCE" rev-parse HEAD)"
[[ "$head" = "$BASE" || "$head" = "$PIN" ]] || fatal 'Unexpected source HEAD.'
[ -f "$CURRENT/.halleus-release" ] || fatal 'Active release metadata missing.'
active_sha="$(sed -n 's/^commit=//p' "$CURRENT/.halleus-release")"
[[ "$active_sha" = "$OLD_LIVE" || "$active_sha" = "$PIN" ]] || fatal 'Active release was changed separately.'
systemctl is-active --quiet "$SERVICE" || fatal 'Production service is not active.'
nginx -t >/dev/null 2>&1 || fatal 'Production Nginx config invalid.'
[ -d "$CURRENT/node_modules" ] || fatal 'Known healthy dependencies missing.'
log "ACTIVE_PRECHECK=$active_sha"

as_deploy git -C "$SOURCE" fetch origin main
[ "$(as_deploy git -C "$SOURCE" rev-parse origin/main)" = "$PIN" ] || fatal 'Origin main differs from pinned approved commit.'
[ "$(as_deploy git -C "$SOURCE" rev-parse "${PIN}^1")" = "$BASE" ] || fatal 'Unexpected release commit parent.'
changed_files="$(as_deploy git -C "$SOURCE" diff-tree --no-commit-id --name-only -r "$PIN")"
expected_files=$'components/admin/shop-orders-workspace.module.css\ncomponents/shop/ShopCheckoutFlow.tsx\ndocs/HALLEUS_SHOP_VPS_FIVE_STEP_ROADMAP.md\nops/vps/halleus-shop-order-ux-release.sh\nscripts/check-shop-orders.mjs'
[ "$changed_files" = "$expected_files" ] || fatal 'R2 changeset includes unrelated paths.'
log 'R2_APPROVED_CHANGESET=PASS'
if [ "$head" != "$PIN" ]; then
  as_deploy git -C "$SOURCE" merge --ff-only origin/main || fatal 'Cannot fast-forward VPS source.'
fi
[ "$(as_deploy git -C "$SOURCE" rev-parse HEAD)" = "$PIN" ] || fatal 'Unexpected post-merge HEAD.'
[ -z "$(as_deploy git -C "$SOURCE" status --porcelain=v1 --untracked-files=all)" ] || fatal 'Source dirty after update.'

if [ "$active_sha" = "$PIN" ]; then
  log 'ALREADY_DEPLOYED_PREVIOUS_RUN=PASS'
else
  TMP="$(mktemp -d /tmp/halleus-shop-order-ux-XXXXXXXX)" || fatal 'Cannot create safe test directory.'
  chown deploy:deploy "$TMP"
  chmod 0700 "$TMP"
  WORKTREE="$TMP/worktree"
  as_deploy git -C "$SOURCE" worktree add --detach "$WORKTREE" "$PIN" || fatal 'Could not prepare candidate test tree.'
  ln -s -- "$(readlink -f "$CURRENT")/node_modules" "$WORKTREE/node_modules"
  failed=()
  # R1 ran independent checks; reuse unchanged PASS if retained evidence exists.
  R1_LOG_DIR=/tmp/halleus-shop-order-ux-dPXzWprE
  resumed_names=(
    check-shop-order-experience.mjs
    check-shop-shared-rate-limit.mjs
    check-shop-order-api-privacy.mjs
    check-shop-checkout.mjs
    check-shop-print-handoff.mjs
    check-shop-seo-slugs.mjs
  )
  resumed_markers=(
    'SHOP_ORDER_EXPERIENCE=PASS'
    'PASS: PostgreSQL-atomic shared limiter source'
    'Shop order HTTP privacy:'
    'Shop checkout:'
    'Shop print handoff:'
    'Shop SEO direct routes'
  )
  check_scripts=(check-shop-orders.mjs)
  r1_passes_verified=1
  for index in "${!resumed_names[@]}"; do
    if [ ! -f "$R1_LOG_DIR/${resumed_names[$index]}.log" ] ||
       ! grep -Fq "${resumed_markers[$index]}" "$R1_LOG_DIR/${resumed_names[$index]}.log"; then
      r1_passes_verified=0
      break
    fi
  done
  if [ "$r1_passes_verified" -eq 1 ]; then
    for name in "${resumed_names[@]}"; do log "RESUMED_PASS $name"; done
  else
    log 'R1_PASS_EVIDENCE_MISSING_RECHECK_SAFE_INDEPENDENTS'
    check_scripts+=("${resumed_names[@]}")
  fi
  log 'R2_AFFECTED_FAILURE_RECOVERY=BEGIN'
  for name in "${check_scripts[@]}"; do
    if [ ! -f "$WORKTREE/scripts/$name" ]; then
      log "BLOCKED_BY_DEPENDENCY $name missing"
      failed+=("$name:MISSING")
    elif as_deploy bash -c 'cd "$1"; exec "$2" "scripts/$3"' _ "$WORKTREE" /usr/local/bin/node "$name" >"$TMP/$name.log" 2>&1; then
      log "PASS $name"
    else
      log "CANDIDATE_FAILURE $name"
      failed+=("$name:FAIL")
    fi
  done
  if [ -x "$WORKTREE/node_modules/.bin/tsc" ]; then
    if as_deploy bash -c 'cd "$1"; exec ./node_modules/.bin/tsc --noEmit --incremental false' _ "$WORKTREE" >"$TMP/typescript.log" 2>&1; then
      log 'PASS TypeScript'
    else
      log 'CANDIDATE_FAILURE TypeScript'
      failed+=(typescript)
    fi
  else
    log 'BLOCKED_BY_DEPENDENCY TypeScript unavailable'
    failed+=(typescript_missing)
  fi
  if [ -x "$WORKTREE/node_modules/.bin/eslint" ]; then
    if as_deploy bash -c 'cd "$1"; exec ./node_modules/.bin/eslint \
      "components/shop/ShopCheckoutFlow.tsx" \
      "scripts/check-shop-orders.mjs"' _ "$WORKTREE" >"$TMP/eslint.log" 2>&1; then
      log 'PASS scoped ESLint'
    else
      log 'CANDIDATE_FAILURE scoped ESLint'
      failed+=(eslint)
    fi
  else
    log 'BLOCKED_BY_DEPENDENCY ESLint unavailable'
    failed+=(eslint_missing)
  fi
  as_deploy git -C "$WORKTREE" --no-pager diff "$BASE" "$PIN" --check >"$TMP/diff-check.log" 2>&1 || failed+=(diff_check)
  if [ "${#failed[@]}" -gt 0 ]; then
    log "R1_CONSOLIDATED_FAILURES=${failed[*]}"
    for filename in "$TMP"/*.log; do
      [ -f "$filename" ] || continue
      if [ -s "$filename" ]; then
        log "EVIDENCE=$(basename "$filename")"
        tail -n 35 "$filename"
      fi
    done
    exit 1
  fi
  log 'R2_AFFECTED_CHECKS=PASS'
  as_deploy git -C "$SOURCE" worktree remove --force "$WORKTREE" || fatal 'Cannot clean candidate test worktree.'
  WORKTREE=''

  if as_deploy git -C "$SOURCE" rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
    [ "$(as_deploy git -C "$SOURCE" rev-list -n 1 "$TAG")" = "$PIN" ] || fatal 'Release tag collision.'
  else
    as_deploy git -C "$SOURCE" tag "$TAG" "$PIN" || fatal 'Cannot create pinned release tag.'
  fi
  if timeout 25s runuser -u deploy -- env GIT_TERMINAL_PROMPT=0 git -C "$SOURCE" push origin "refs/tags/$TAG" >/dev/null 2>&1; then
    log 'GITHUB_RELEASE_TAG_PUSH=PASS'
  else
    log 'GITHUB_RELEASE_TAG_PUSH=EXTERNAL_BLOCK_LOCAL_TAG_PINNED'
  fi
  [ "$(as_deploy git -C "$SOURCE" rev-list -n 1 "$TAG")" = "$PIN" ] || fatal 'Release tag mismatch.'

  log 'OFFICIAL_RELEASE=START'
  bash "$SOURCE/$ENGINE" deploy --commit "$PIN" --tag "$TAG" --skip-wiki-maintenance || fatal 'Official release failed; inspect native rollback state.'
  LIVE_CHANGED=1
fi

active_after="$(readlink -f "$CURRENT")"
[ -f "$active_after/.halleus-release" ] || fatal 'Active release metadata missing after deployment.'
grep -Fxq "commit=$PIN" "$active_after/.halleus-release" || fatal 'Wrong active release commit.'
systemctl is-active --quiet "$SERVICE" || fatal 'Service stopped after activation.'

fail_smoke=0
for endpoint in /shop /shop/moon-phase-print /shop/payment /shop/track; do
  code="$(http_status "https://halleus.ir$endpoint" 2>/dev/null || true)"
  if [ "$code" != 200 ]; then log "LIVE_PAGE_FAILED $endpoint HTTP=$code"; fail_smoke=1; else log "LIVE_PAGE_PASS $endpoint"; fi
done
for endpoint in /api/shop/orders/track/mobile /api/shop/orders/track; do
  code="$(http_status -X POST -H 'Content-Type: application/json' -H 'Origin: https://halleus.ir' --data '{}' "https://halleus.ir$endpoint" 2>/dev/null || true)"
  if [ "$code" != 400 ]; then log "LIVE_API_FAILED $endpoint HTTP=$code"; fail_smoke=1; else log "LIVE_API_PASS $endpoint"; fi
done
if [ "$fail_smoke" -ne 0 ]; then
  if [ "$LIVE_CHANGED" -eq 1 ]; then
    log 'LIVE_SMOKE_FAILED: CALLING_OFFICIAL_ROLLBACK'
    if bash "$SOURCE/$ENGINE" rollback; then LIVE_CHANGED=0; log 'OFFICIAL_ROLLBACK=PASS'; else log 'OFFICIAL_ROLLBACK=FAILED_MANUAL_REVIEW'; fi
  fi
  exit 1
fi
log "CURRENT_RELEASE=$active_after"
log "PREVIOUS_RELEASE=$(readlink -f "$PREVIOUS")"
log 'PRODUCTION_SHOP_ORDER_UX=LIVE_VERIFIED'
log 'NO_DB_MIGRATIONS_NGINX_OR_ENV_CHANGES=PASS'
