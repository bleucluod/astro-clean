#!/usr/bin/env bash
# Halleus overview: read-only preflight and native atomic VPS release.
set -Eeuo pipefail
set +x

SOURCE=/srv/halleus/source
CURRENT=/srv/halleus/current
PREVIOUS=/srv/halleus/previous
ENGINE=ops/vps/halleus-release.sh
SERVICE=halleus.service
BASE=7bdcd9bddbfeffb69f95cae0f557c6d0da663d31
PREVIOUS_BASE=f160ced6f5bd6a947067b27a1a80f4a8fb4a14f3
OLD_LIVE=6fdfaa60aaa826b9815c03be9275da5c2f7627f1
TAG=v2026.11.08-admin-overview-r2
PIN="$1"
NODE=/usr/local/bin/node
TMP=''
WORKTREE=''
ACTIVATED=0

log() { printf 'HALLEUS_OVERVIEW | %s\n' "$*"; }
fatal() { log "SAFETY_FATAL: $*" >&2; exit 2; }
as_deploy() { runuser -u deploy -- "$@"; }
http_code() { curl --silent --show-error --connect-timeout 5 --max-time 20 -o /dev/null -w '%{http_code}' "$@"; }
cleanup() {
  local rc=$?
  trap - EXIT
  if [ -n "$WORKTREE" ] && [ -d "$WORKTREE" ]; then
    as_deploy git -C "$SOURCE" worktree remove --force "$WORKTREE" || log 'WORKTREE_CLEANUP_WARNING'
  fi
  if [ -n "$TMP" ] && [[ "$TMP" == /tmp/halleus-admin-overview-* ]] && [ -d "$TMP" ]; then
    if [ "$rc" -eq 0 ]; then rm -rf -- "$TMP"; else log "FAILURE_LOG_DIRECTORY=$TMP"; fi
  fi
  if [ "$rc" -ne 0 ]; then
    log "RESULT=BLOCKED_OR_FAILED_$rc"
    [ "$ACTIVATED" -eq 0 ] || log 'POST_ACTIVATION_FAILED_CHECK_CURRENT_AND_PREVIOUS'
  fi
  exit "$rc"
}
trap cleanup EXIT

[ "$EUID" -eq 0 ] || fatal 'Requires sudo/root.'
[[ "$PIN" =~ ^[0-9a-f]{40}$ ]] || fatal 'Expected pinned 40-char SHA.'
[ -d "$SOURCE/.git" ] && [ -f "$SOURCE/$ENGINE" ] || fatal 'Unexpected source.'
[ -x "$NODE" ] || fatal 'Node unavailable.'
exec 8>/run/lock/halleus-admin-overview.lock
flock -n 8 || fatal 'Another overview release is running.'
[ "$(as_deploy git -C "$SOURCE" branch --show-current)" = main ] || fatal 'Wrong branch.'
origin="$(as_deploy git -C "$SOURCE" remote get-url origin)"
[[ "$origin" =~ github\.com[:/]bleucluod/astro-clean(\.git)?$ ]] || fatal 'Wrong GitHub origin.'
[ -z "$(as_deploy git -C "$SOURCE" status --porcelain=v1 --untracked-files=all)" ] || fatal 'Dirty source.'
head="$(as_deploy git -C "$SOURCE" rev-parse HEAD)"
[[ "$head" = "$OLD_LIVE" || "$head" = "$PREVIOUS_BASE" || "$head" = "$BASE" || "$head" = "$PIN" ]] || fatal "Unexpected source HEAD: $head"
log "VERIFIED_SOURCE_HEAD=$head"
[ -f "$CURRENT/.halleus-release" ] || fatal 'Active release metadata missing.'
active_sha="$(sed -n 's/^commit=//p' "$CURRENT/.halleus-release")"
[[ "$active_sha" = "$OLD_LIVE" || "$active_sha" = "$PIN" ]] || fatal 'Unexpected active release.'
systemctl is-active --quiet "$SERVICE" || fatal 'Service inactive.'
nginx -t >/dev/null 2>&1 || fatal 'Nginx invalid.'
[ -d "$CURRENT/node_modules" ] || fatal 'Current dependencies missing.'
flock -n /run/lock/halleus-release.lock -c true || fatal 'Official engine is busy.'
as_deploy git -C "$SOURCE" fetch origin main || fatal 'Fetch failed.'
[ "$(as_deploy git -C "$SOURCE" rev-parse origin/main)" = "$PIN" ] || fatal 'GitHub HEAD changed.'
[ "$(as_deploy git -C "$SOURCE" rev-parse "$PIN^1")" = "$BASE" ] || fatal 'Unexpected parent commit.'
as_deploy git -C "$SOURCE" merge-base --is-ancestor "$head" "$PIN" || fatal 'Verified source HEAD is not an ancestor of pinned release.'
changed="$(as_deploy git -C "$SOURCE" diff-tree --no-commit-id --name-only -r "$PIN")"
expected=$'docs/HALLEUS_ADMIN_OVERVIEW_ROADMAP.md\nops/vps/halleus-admin-overview-release.sh'
[ "$changed" = "$expected" ] || fatal 'Unexpected release changeset.'
log 'SAFETY_PREFLIGHT=PASS'
if [ "$head" != "$PIN" ]; then
  as_deploy git -C "$SOURCE" merge --ff-only origin/main || fatal 'Cannot fast-forward source.'
fi
[ "$(as_deploy git -C "$SOURCE" rev-parse HEAD)" = "$PIN" ] || fatal 'Post-fetch SHA mismatch.'
[ -z "$(as_deploy git -C "$SOURCE" status --porcelain=v1 --untracked-files=all)" ] || fatal 'Source unexpectedly dirty.'

if [ "$active_sha" = "$PIN" ]; then
  log 'ALREADY_DEPLOYED=PASS'
else
  TMP="$(mktemp -d /tmp/halleus-admin-overview-XXXXXXXX)" || fatal 'Cannot make diagnostics directory.'
  chown deploy:deploy "$TMP"
  chmod 0700 "$TMP"
  WORKTREE="$TMP/worktree"
  as_deploy git -C "$SOURCE" worktree add --detach "$WORKTREE" "$PIN" || fatal 'Cannot prepare candidate.'
  ln -s -- "$(readlink -f "$CURRENT")/node_modules" "$WORKTREE/node_modules"
  [ -x "$WORKTREE/node_modules/.bin/tsc" ] || fatal 'TypeScript runtime missing.'
  [ -x "$WORKTREE/node_modules/.bin/eslint" ] || fatal 'ESLint runtime missing.'

  failures=''
  run_stage() {
    local label="$1"
    shift
    if "$@" >"$TMP/$label.log" 2>&1; then
      log "PASS $label"
    else
      log "CANDIDATE_FAILURE $label"
      failures="$failures $label"
    fi
  }
  log 'R1_FULL_INDEPENDENT_FAILURE_DISCOVERY=BEGIN'
  run_stage focused_dashboard as_deploy bash -c 'cd "$1"; exec "$2" scripts/check-admin-overview-dashboard.mjs' _ "$WORKTREE" "$NODE"
  run_stage admin_ux as_deploy bash -c 'cd "$1"; exec "$2" scripts/check-admin-ux-consolidation.mjs' _ "$WORKTREE" "$NODE"
  run_stage admin_routes as_deploy bash -c 'cd "$1"; exec "$2" scripts/check-admini-ui-routes.mjs' _ "$WORKTREE" "$NODE"
  run_stage admin_ia as_deploy bash -c 'cd "$1"; exec "$2" scripts/check-predeploy-admin-ia.mjs' _ "$WORKTREE" "$NODE"
  run_stage secure_admin as_deploy bash -c 'cd "$1"; exec "$2" scripts/check-secure-admin-core.mjs' _ "$WORKTREE" "$NODE"
  run_stage typescript as_deploy bash -c 'cd "$1"; exec ./node_modules/.bin/tsc --noEmit --incremental false' _ "$WORKTREE"
  run_stage eslint as_deploy bash -c 'cd "$1"; exec ./node_modules/.bin/eslint \
    components/admin/AdminConsole.tsx components/admin/AdminOverviewDashboard.tsx \
    app/api/admin/overview/trends/route.ts lib/admin/admin-overview-trends.ts \
    scripts/check-admin-overview-dashboard.mjs scripts/check-admin-overview-db-readonly.mjs \
    scripts/check-admin-ux-consolidation.mjs' _ "$WORKTREE"
  run_stage diff_check as_deploy git -C "$WORKTREE" --no-pager diff "$OLD_LIVE" "$PIN" --check

  pid="$(systemctl show -P MainPID "$SERVICE" 2>/dev/null || true)"
  if [[ "$pid" =~ ^[1-9][0-9]{0,9}$ ]]; then
    if "$NODE" "$WORKTREE/scripts/check-admin-overview-db-readonly.mjs" "$pid" >"$TMP/db_readonly.log" 2>&1 &&
      grep -Fxq 'ADMIN_OVERVIEW_DB_READONLY=PASS real_queries owner_and_non_owner' "$TMP/db_readonly.log"; then
      log 'PASS live_database_readonly'
    else
      log 'EXTERNAL_BLOCK_OR_QUERY_FAILURE live_database_readonly'
      failures="$failures db_readonly"
    fi
  else
    log 'EXTERNAL_BLOCK service_process_unavailable'
    failures="$failures db_runtime"
  fi

  if [ -n "$failures" ]; then
    log "R1_CONSOLIDATED_FAILURES=$failures"
    for item in $failures; do
      if [ -s "$TMP/$item.log" ]; then
        log "EVIDENCE=$TMP/$item.log"
        tail -n 35 "$TMP/$item.log"
      fi
    done
    exit 1
  fi
  log 'R1_ALL_CHECKS_AND_LIVE_READONLY_QUERIES=PASS'
  as_deploy git -C "$SOURCE" worktree remove --force "$WORKTREE" || fatal 'Cannot clean candidate worktree.'
  WORKTREE=''

  if as_deploy git -C "$SOURCE" rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
    [ "$(as_deploy git -C "$SOURCE" rev-list -n 1 "$TAG")" = "$PIN" ] || fatal 'Release tag collision.'
  else
    as_deploy git -C "$SOURCE" tag "$TAG" "$PIN" || fatal 'Cannot create pinned tag.'
  fi
  timeout 30s runuser -u deploy -- env GIT_TERMINAL_PROMPT=0 git -C "$SOURCE" push origin "refs/tags/$TAG" || fatal 'GitHub tag push failed.'
  log 'GITHUB_RELEASE_TAG=PASS'
  grep -Fxq "commit=$OLD_LIVE" "$CURRENT/.halleus-release" || fatal 'Live version changed during tests.'

  log 'OFFICIAL_RELEASE=START'
  bash "$SOURCE/$ENGINE" deploy --commit "$PIN" --tag "$TAG" --skip-wiki-maintenance || fatal 'Native release failed; inspect current/previous.'
  ACTIVATED=1
fi

grep -Fxq "commit=$PIN" "$CURRENT/.halleus-release" || fatal 'Wrong active release.'
systemctl is-active --quiet "$SERVICE" || fatal 'Service inactive after release.'
smoke_failed=0
for endpoint in /admini /shop /shop/track; do
  status="$(http_code "https://halleus.ir$endpoint" 2>/dev/null || true)"
  if [ "$status" = 200 ]; then log "LIVE_PAGE_PASS $endpoint"; else log "LIVE_PAGE_FAIL $endpoint HTTP=$status"; smoke_failed=1; fi
done
status="$(http_code 'https://halleus.ir/api/admin/overview/trends?days=7' 2>/dev/null || true)"
case "$status" in
  401|403) log "PRIVATE_API_UNAUTHENTICATED=PASS HTTP=$status" ;;
  *) log "PRIVATE_API_UNEXPECTED_STATUS=$status"; smoke_failed=1 ;;
esac
if [ "$smoke_failed" -ne 0 ]; then
  if [ "$ACTIVATED" -eq 1 ] && grep -Fxq "commit=$PIN" "$CURRENT/.halleus-release"; then
    log 'POST_DEPLOY_SMOKE_FAILED_CALLING_OFFICIAL_ROLLBACK'
    if bash "$SOURCE/$ENGINE" rollback; then
      ACTIVATED=0
      log 'OFFICIAL_ROLLBACK=PASS'
    else
      log 'OFFICIAL_ROLLBACK=FAILED_CHECK_MANUALLY'
    fi
  fi
  exit 1
fi
log "CURRENT_RELEASE=$(readlink -f "$CURRENT")"
log "PREVIOUS_RELEASE=$(readlink -f "$PREVIOUS")"
log 'ADMIN_OVERVIEW_PRODUCTION=LIVE_VERIFIED'
log 'DB_WRITES_SCHEMA_ENV_NGINX_CHANGES=NONE'
