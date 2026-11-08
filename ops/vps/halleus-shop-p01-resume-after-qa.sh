#!/usr/bin/env bash
# Finish P01 activation on the already-deployed, validated release. No rebuild.
set -Eeuo pipefail
set +x

SOURCE=/srv/halleus/source
CURRENT=/srv/halleus/current
ENV=/etc/halleus/halleus.env
SERVICE=halleus.service
NODE=/usr/local/bin/node
LOCK=/run/lock/halleus-release.lock
ACTIVE_SHA=547f4d2c6d286796cb07b2aa9e45852d61f396e7
NEW_SHA="${1:-}"
TMP=''
BACKUP=''
ENV_CHANGED=0

log() { printf 'HALLEUS_P01_RESUME | %s\n' "$*"; }
fatal() { log "SAFETY_FATAL: $*" >&2; exit 2; }
as_deploy() { runuser -u deploy -- "$@"; }
http_code() { curl --silent --show-error --connect-timeout 5 --max-time 20 -o /dev/null -w '%{http_code}' "$@"; }
expect_http() {
  local wanted="$1"; shift
  local got=''
  for _ in $(seq 1 30); do
    got="$(http_code "$@" 2>/dev/null || true)"
    [ "$got" = "$wanted" ] && return 0
    sleep 1
  done
  log "HTTP_EXPECTED_${wanted}_GOT_${got}"
  return 1
}
cleanup() {
  local rc=$?
  trap - EXIT
  if [ "$rc" -ne 0 ] && [ "$ENV_CHANGED" -eq 1 ]; then
    log 'RESTORING_PREVIOUS_CLOSED_SHOP_ENV'
    local rollback
    rollback="$(mktemp /etc/halleus/halleus.env.p01-restore.XXXXXXXX)" || rollback=''
    if [ -n "$rollback" ] && cp -p -- "$BACKUP" "$rollback" && mv -f -- "$rollback" "$ENV"; then
      systemctl restart "$SERVICE" || true
      if [ "$(http_code -X POST -H 'Content-Type: application/json' -H 'Origin: https://halleus.ir' --data '{}' https://halleus.ir/api/shop/quote 2>/dev/null || true)" = 404 ]; then
        log 'SHOP_CLOSED_ON_FAILURE=PASS'
      else
        log 'SHOP_CLOSED_ON_FAILURE=UNVERIFIED_CHECK_SERVICE'
      fi
    else
      log 'SAFETY_FATAL: ENV_RESTORE_FAILED_MANUAL_INTERVENTION_REQUIRED'
    fi
  fi
  if [ -n "$TMP" ] && [ -d "$TMP" ] && [[ "$TMP" == /tmp/halleus-p01-resume-* ]]; then rm -rf -- "$TMP"; fi
  if [ "$rc" -ne 0 ]; then
    log "GO_LIVE_STATUS=BLOCKED_RC_${rc}"
    [ -z "$BACKUP" ] || log "PRIVATE_ENV_BACKUP=$BACKUP"
  fi
  exit "$rc"
}
trap cleanup EXIT

[ "$EUID" -eq 0 ] || fatal 'Requires sudo/root.'
[[ "$NEW_SHA" =~ ^[0-9a-f]{40}$ ]] || fatal 'Pass pinned full GitHub SHA.'
[ -x "$NODE" ] && [ -f "$ENV" ] && [ ! -L "$ENV" ] || fatal 'Production runtime/env unavailable.'
exec 9>"$LOCK"
flock -n 9 || fatal 'Another Halleus release is in progress.'
[ "$(as_deploy git -C "$SOURCE" branch --show-current)" = main ] || fatal 'Wrong source branch.'
origin="$(as_deploy git -C "$SOURCE" remote get-url origin)"
[[ "$origin" =~ github\.com[:/]bleucluod/astro-clean(\.git)?$ ]] || fatal 'Wrong Git origin.'
[ -z "$(as_deploy git -C "$SOURCE" status --porcelain=v1 --untracked-files=all)" ] || fatal 'Source worktree not clean.'
[ "$(as_deploy git -C "$SOURCE" rev-parse HEAD)" = "$NEW_SHA" ] || fatal 'Source HEAD does not equal pinned resume commit.'
[ "$(as_deploy git -C "$SOURCE" rev-parse origin/main)" = "$NEW_SHA" ] || fatal 'GitHub origin/main does not equal pinned commit.'
[ "$(as_deploy git -C "$SOURCE" rev-parse "${NEW_SHA}^1")" = "$ACTIVE_SHA" ] || fatal 'Resume commit has unexpected parent.'
changed="$(as_deploy git -C "$SOURCE" diff-tree --no-commit-id --name-only -r "$NEW_SHA")"
expected=$'ops/vps/halleus-shop-p01-resume-after-qa.sh\nscripts/check-shop-print-handoff.mjs'
[ "$changed" = "$expected" ] || fatal 'Unexpected files in resume commit.'
active="$(readlink -f "$CURRENT")"
[ -n "$active" ] && [ -f "$active/.halleus-release" ] && [ -f "$active/scripts/check-shop-print-handoff.mjs" ] || fatal 'Live release missing.'
grep -Fxq "commit=$ACTIVE_SHA" "$active/.halleus-release" || fatal 'Live release has changed; do not redeploy or resume blindly.'
systemctl is-active --quiet "$SERVICE" || fatal 'Halleus service is not active.'
[ -d "$active/node_modules" ] || fatal 'Live dependency directory missing.'
log 'ACTIVE_DEPLOYED_RELEASE_REUSED=PASS'

# Focused regression: new GitHub test against the unchanged active release code.
TMP="$(mktemp -d /tmp/halleus-p01-resume-XXXXXXXX)"
mkdir -m 0700 "$TMP/scripts"
cp -- "$SOURCE/scripts/check-shop-print-handoff.mjs" "$TMP/scripts/check-shop-print-handoff.mjs"
"$NODE" - "$TMP/scripts/check-shop-print-handoff.mjs" <<'JS'
const fs = require('node:fs');
const path = process.argv[2];
let source = fs.readFileSync(path, 'utf8');
const anchor = "const root = resolve(import.meta.dirname, '..');";
if (source.split(anchor).length !== 2 ||
    !source.includes("'@/lib/shop/shop-manual-print-archive': {}")) {
  process.exitCode = 2;
  throw new Error('Unexpected focused-guard source; refusing activation.');
}
source = source.replace(anchor, 'const root = process.env.HALLEUS_P01_ACTIVE_RELEASE_FOR_TEST;');
fs.writeFileSync(path, source, { mode: 0o600 });
JS
chown -R deploy:deploy "$TMP"
ln -s -- "$active/node_modules" "$TMP/node_modules"
as_deploy env -u HALLEUS_SHOP_HANDOFF_ZIP_QA_PATH HALLEUS_P01_ACTIVE_RELEASE_FOR_TEST="$active" "$NODE" "$TMP/scripts/check-shop-print-handoff.mjs" || fatal 'Focused print-handoff test still fails.'
log 'RESUMED_FAILED_PRINT_HANDOFF_CHECK=PASS'

# Read-only production prerequisites; no migrations, Nginx edit, or new release.
nginx -t >/dev/null 2>&1 || fatal 'Nginx syntax invalid.'
nginx_config="$(nginx -T 2>/dev/null)" || fatal 'Nginx configuration unreadable.'
grep -Eiq 'proxy_set_header[[:space:]]+X-Halleus-Shop-Client-IP[[:space:]]+\$remote_addr[[:space:]]*;' <<< "$nginx_config" || fatal 'Nginx overwritten IP header missing.'
unset nginx_config
probe="$(bash "$SOURCE/ops/vps/halleus-shop-stage1-runtime-db-readonly.sh")" || fatal 'Read-only DB metadata unavailable.'
for required in db_probe=READONLY_METADATA_PASS db_orders=true db_events=true db_rate_limits=true db_private_schema=true db_admin_memberships=true db_shared_numbers=true; do
  grep -Fxq "$required" <<< "$probe" || fatal "DB contract missing $required"
done
# shellcheck disable=SC1090
source "$ENV"
[ "${HALLEUS_SHOP_MVP_ENABLED:-false}" != true ] || fatal 'Shop was already enabled.'
[ -n "${HALLEUS_SHOP_PRINT_ORIGINALS_DIR:-}" ] && [ -n "${HALLEUS_SHOP_PRINT_ARCHIVE_ROOT:-}" ] || fatal 'Private print paths missing.'
[ -d "$HALLEUS_SHOP_PRINT_ARCHIVE_ROOT" ] && [ ! -L "$HALLEUS_SHOP_PRINT_ARCHIVE_ROOT" ] || fatal 'Private archive missing.'
marker="$HALLEUS_SHOP_PRINT_ARCHIVE_ROOT/.halleus-private-shop-archive"
[ -f "$marker" ] && [ ! -L "$marker" ] || fatal 'Archive marker missing or symlink.'
for private_path in "$HALLEUS_SHOP_PRINT_ARCHIVE_ROOT" "$marker"; do
  mode="$(stat -c %a -- "$private_path")"
  [[ "$mode" =~ ^[0-7]{3,4}$ ]] && (( (8#$mode & 077) == 0 )) || fatal 'Private archive mode is too broad.'
done
cmp -s <(printf 'HALLEUS_PRIVATE_SHOP_ARCHIVE_V1\n') "$marker" || fatal 'Archive marker content mismatch.'
[ "$(http_code -X POST -H 'Content-Type: application/json' -H 'Origin: https://halleus.ir' --data '{}' https://halleus.ir/api/shop/quote)" = 404 ] || fatal 'Expected shop API 404 before opening.'
log 'PRELAUNCH_SAFETY=PASS'

BACKUP="$(mktemp /etc/halleus/halleus.env.p01-before-resume.XXXXXXXX)"
cp -p -- "$ENV" "$BACKUP"
chmod 0600 "$BACKUP"
staged="$(mktemp /etc/halleus/halleus.env.p01-next.XXXXXXXX)"
cp -p -- "$ENV" "$staged"
secret="$(openssl rand -hex 32)"
[ "${#secret}" -eq 64 ] || fatal 'Secure random secret generation failed.'
{
  printf '\n# P01 controlled activation - last assignment is authoritative\n'
  printf 'HALLEUS_SHOP_RATE_SECRET=%s\n' "$secret"
  printf 'HALLEUS_SHOP_TRUSTED_CLIENT_IP=nginx-overwrite-v1\n'
  printf 'HALLEUS_SHOP_SHARED_RATE_ENABLED=true\n'
  printf 'HALLEUS_SHOP_MVP_ENABLED=true\n'
} >> "$staged"
unset secret
chmod 0600 "$staged"
mv -f -- "$staged" "$ENV"
ENV_CHANGED=1
systemctl restart "$SERVICE" || fatal 'Service restart failed after enabling P01.'
systemctl is-active --quiet "$SERVICE" || fatal 'Service inactive after restart.'
[ "$(readlink -f "$CURRENT")" = "$active" ] || fatal 'Live release switched unexpectedly.'

for endpoint in /shop /shop/moon-phase-print /shop/cart /shop/checkout; do
  expect_http 200 "https://halleus.ir$endpoint" || fatal "Public page failed: $endpoint"
  log "PAGE_OK=$endpoint"
done
for endpoint in /api/shop/quote /api/shop/orders; do
  expect_http 400 -X POST -H 'Content-Type: application/json' -H 'Origin: https://halleus.ir' --data '{}' "https://halleus.ir$endpoint" || fatal "Rate/DB/API failure: $endpoint"
done
expect_http 200 -X POST -H 'Content-Type: application/json' -H 'Origin: https://halleus.ir' \
  --data '{"carrier":"post","items":[{"productId":"p01","size":"10x15","quantity":1}]}' \
  'https://halleus.ir/api/shop/quote' || fatal 'P01 valid quote failed.'
expect_http 400 -X POST -H 'Content-Type: application/json' -H 'Origin: https://halleus.ir' \
  --data '{"carrier":"post","items":[{"productId":"p02","size":"10x15","quantity":1}]}' \
  'https://halleus.ir/api/shop/quote' || fatal 'Deferred P02 quote was not blocked.'

# Check page robots without treating absence of robots meta as noindex.
for endpoint in /shop /shop/moon-phase-print; do
  curl --fail --silent --show-error --max-time 20 "https://halleus.ir$endpoint" | "$NODE" -e \
  'let s="";process.stdin.setEncoding("utf8");process.stdin.on("data",v=>s+=v);process.stdin.on("end",()=>{const r=s.match(/<meta\s+[^>]*name=["\x27]robots["\x27][^>]*>/i);if(r&&/noindex/i.test(r[0]))process.exit(1);});' || fatal "P01 unexpectedly noindex: $endpoint"
done
for endpoint in /shop/birth-sky-map /shop/milky-way-print; do
  curl --fail --silent --show-error --max-time 20 "https://halleus.ir$endpoint" | "$NODE" -e \
  'let s="";process.stdin.setEncoding("utf8");process.stdin.on("data",v=>s+=v);process.stdin.on("end",()=>{const r=s.match(/<meta\s+[^>]*name=["\x27]robots["\x27][^>]*>/i);if(!r||!/noindex/i.test(r[0]))process.exit(1);});' || fatal "Deferred product not noindex: $endpoint"
done
log 'PUBLIC_SMOKE_AND_P01_ONLY_QUOTE=PASS'
ENV_CHANGED=0
log 'P01_PUBLIC_SALES=OPEN_VERIFIED'
log "ACTIVE_RELEASE=$active"
log "PRIVATE_ENV_ROLLBACK_COPY=$BACKUP"
log 'P02_P03=NOT_FOR_SALE_NOINDEX'
