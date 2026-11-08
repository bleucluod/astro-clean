#!/usr/bin/env bash
# Halleus P01 go-live: only after operator approval. No migrations or Nginx edits.
set -Eeuo pipefail
set +x

SOURCE=/srv/halleus/source
CURRENT=/srv/halleus/current
ENV_FILE=/etc/halleus/halleus.env
SERVICE=halleus.service
NODE=/usr/local/bin/node
EXPECTED_PARENT=dbb5ca1117e0066a858c2fe51e9ab084781f60d4
RELEASE_TAG=v2026.11.08-p01-go-live
COMMIT="${1:-}"

fatal() { printf 'SAFETY_FATAL: %s\n' "$*" >&2; exit 2; }
log() { printf 'HALLEUS_P01_GO_LIVE | %s\n' "$*"; }
exec_deploy() { runuser -u deploy -- "$@"; }
http_code() { curl --silent --show-error --connect-timeout 5 --max-time 20 --output /dev/null --write-out '%{http_code}' "$@"; }
wait_http() {
    local expected="$1"; shift
    local code=''
    local attempt
    for attempt in $(seq 1 45); do
        code="$(http_code "$@" 2>/dev/null || true)"
        [ "$code" = "$expected" ] && return 0
        sleep 1
    done
    log "HTTP_GATE_FAILED_EXPECTED_${expected}_ACTUAL_${code}"
    return 1
}
RELEASE_APPLIED=0
ENV_CHANGED=0
BACKUP=''
cleanup() {
    local rc=$?
    trap - EXIT
    if [ "$rc" -ne 0 ] && [ "$ENV_CHANGED" -eq 1 ] && [ -n "$BACKUP" ] && [ -f "$BACKUP" ]; then
        log 'RESTORE_PRELAUNCH_ENV=BEGIN'
        cp -p -- "$BACKUP" "$ENV_FILE" || true
        chmod 0600 "$ENV_FILE" || true
        if systemctl restart "$SERVICE"; then log 'RESTORE_PRELAUNCH_ENV=RESTARTED'; else log 'RESTORE_PRELAUNCH_ENV=RESTART_FAILED'; fi
        local code
        code="$(http_code -X POST -H 'Content-Type: application/json' -H 'Origin: https://halleus.ir' --data '{}' 'https://halleus.ir/api/shop/quote' || true)"
        if [ "$code" = 404 ]; then log 'SHOP_CLOSED_ON_FAILURE=PASS'; else log "SHOP_CLOSED_ON_FAILURE=UNVERIFIED_HTTP_${code}"; fi
        log "ENV_ROLLBACK_BACKUP=$BACKUP"
    fi
    if [ "$rc" -ne 0 ]; then
        log "GO_LIVE_STATUS=BLOCKED_RC_${rc}"
        if [ "$RELEASE_APPLIED" -eq 1 ]; then log 'DEPLOYED_CODE_REMAINS_ACTIVE; SALE_GATE_RESTORED_WHERE_APPLICABLE'; fi
    fi
    exit "$rc"
}
trap cleanup EXIT

[ "$EUID" -eq 0 ] || fatal 'Run as root with sudo.'
[[ "$COMMIT" =~ ^[a-f0-9]{40}$ ]] || fatal 'Expected pinned 40-character GitHub commit argument.'
[ "$COMMIT" != "$EXPECTED_PARENT" ] || fatal 'Go-live script commit must follow P01 code commit.'
[ -f "$SOURCE/ops/vps/halleus-release.sh" ] || fatal 'Official release engine missing.'
[ -f "$SOURCE/ops/vps/halleus-shop-stage1-runtime-db-readonly.sh" ] || fatal 'DB readonly authority probe missing.'
[ -f "$ENV_FILE" ] && [ ! -L "$ENV_FILE" ] || fatal 'Production environment file missing or symlink.'
[ -x "$NODE" ] || fatal 'Pinned Node runtime missing.'
systemctl is-active --quiet "$SERVICE" || fatal 'Halleus service not healthy at preflight.'

origin="$(exec_deploy git -C "$SOURCE" remote get-url origin)"
[[ "$origin" =~ github\.com[:/]bleucluod/astro-clean(\.git)?$ ]] || fatal 'Unexpected Git origin.'
[ "$(exec_deploy git -C "$SOURCE" branch --show-current)" = main ] || fatal 'Source branch must be main.'
[ -z "$(exec_deploy git -C "$SOURCE" status --porcelain=v1 --untracked-files=all)" ] || fatal 'VPS source is dirty; no mutation attempted.'
[ "$(exec_deploy git -C "$SOURCE" rev-parse HEAD)" = "$COMMIT" ] || fatal 'Sync VPS source to the exact go-live commit first.'
[ "$(exec_deploy git -C "$SOURCE" rev-parse origin/main)" = "$COMMIT" ] || fatal 'origin/main is not the pinned go-live commit.'
exec_deploy git -C "$SOURCE" merge-base --is-ancestor "$EXPECTED_PARENT" "$COMMIT" || fatal 'P01 implementation is not an ancestor.'
changed_files="$(exec_deploy git -C "$SOURCE" diff-tree --no-commit-id --name-only -r "$COMMIT")"
[ "$changed_files" = 'ops/vps/halleus-shop-p01-go-live.sh' ] || fatal 'Go-live commit changes unexpected paths.'
log "GITHUB_COMMIT_VERIFIED=$COMMIT"

# Check release prerequisites without repeating the R3 database migrations or Nginx edits.
nginx -t >/dev/null 2>&1 || fatal 'Nginx configuration invalid.'
nginx_config="$(nginx -T 2>/dev/null)" || fatal 'Nginx live config unreadable.'
grep -Eiq 'proxy_set_header[[:space:]]+X-Halleus-Shop-Client-IP[[:space:]]+\$remote_addr[[:space:]]*;' <<< "$nginx_config" || fatal 'Verified overwritten Nginx IP header not found.'
unset nginx_config
log 'NGINX_READONLY_INGRESS_CHECK=PASS'

set -a
# The official release engine already uses this exact env file via bash source.
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
[ "${HALLEUS_SHOP_MVP_ENABLED:-false}" != true ] || fatal 'Shop unexpectedly enabled before go-live.'
[ -n "${HALLEUS_SHOP_PRINT_ARCHIVE_ROOT:-}" ] || fatal 'Private archive env path missing.'
[ -n "${HALLEUS_SHOP_PRINT_ORIGINALS_DIR:-}" ] || fatal 'Private original artwork env path missing.'
[ -d "$HALLEUS_SHOP_PRINT_ARCHIVE_ROOT" ] && [ ! -L "$HALLEUS_SHOP_PRINT_ARCHIVE_ROOT" ] || fatal 'Archive root missing or symlink.'
[ -d "$HALLEUS_SHOP_PRINT_ORIGINALS_DIR" ] && [ ! -L "$HALLEUS_SHOP_PRINT_ORIGINALS_DIR" ] || fatal 'Private print originals missing or symlink.'
[[ "$HALLEUS_SHOP_PRINT_ARCHIVE_ROOT" = /* && "$HALLEUS_SHOP_PRINT_ORIGINALS_DIR" = /* ]] || fatal 'Archive/originals paths must be absolute.'
archive_mode="$(stat -c %a -- "$HALLEUS_SHOP_PRINT_ARCHIVE_ROOT")"
[[ "$archive_mode" =~ ^[0-7]{3,4}$ ]] && (( (8#$archive_mode & 077) == 0 )) || fatal 'Private archive root permissions too broad.'
marker="$HALLEUS_SHOP_PRINT_ARCHIVE_ROOT/.halleus-private-shop-archive"
[ -f "$marker" ] && [ ! -L "$marker" ] || fatal 'Private archive marker missing.'
marker_mode="$(stat -c %a -- "$marker")"
[[ "$marker_mode" =~ ^[0-7]{3,4}$ ]] && (( (8#$marker_mode & 077) == 0 )) || fatal 'Private archive marker permissions too broad.'
cmp -s <(printf 'HALLEUS_PRIVATE_SHOP_ARCHIVE_V1\n') "$marker" || fatal 'Private archive marker mismatch.'
log 'PRIVATE_SHOP_ARCHIVE_READONLY_CHECK=PASS'

probe_output="$(bash "$SOURCE/ops/vps/halleus-shop-stage1-runtime-db-readonly.sh")" || fatal 'DB readonly probe failed.'
for key in 'db_probe=READONLY_METADATA_PASS' 'db_orders=true' 'db_events=true' 'db_rate_limits=true' 'db_private_schema=true' 'db_admin_memberships=true' 'db_shared_numbers=true'; do
    grep -Fxq "$key" <<< "$probe_output" || fatal "Database metadata not ready: $key"
done
log 'DATABASE_READONLY_METADATA=PASS'
pre_code="$(http_code -X POST -H 'Content-Type: application/json' -H 'Origin: https://halleus.ir' --data '{}' 'https://halleus.ir/api/shop/quote')" || fatal 'Prelaunch public API unreachable.'
[ "$pre_code" = 404 ] || fatal "Expected closed-shop 404 before release; got $pre_code."
log 'PUBLIC_SHOP_PRELAUNCH_CLOSED=PASS'

# The official release engine accepts a validated local tag resolving to this pinned commit.
# A remote push is attempted but not required to run the engine if GitHub has read-only VPS credentials.
if exec_deploy git -C "$SOURCE" rev-parse -q --verify "refs/tags/$RELEASE_TAG" >/dev/null; then
    [ "$(exec_deploy git -C "$SOURCE" rev-list -n 1 "$RELEASE_TAG")" = "$COMMIT" ] || fatal 'Release tag collision.'
else
    exec_deploy git -C "$SOURCE" tag "$RELEASE_TAG" "$COMMIT" || fatal 'Could not create pinned local release tag.'
fi
if exec_deploy env GIT_TERMINAL_PROMPT=0 GIT_SSH_COMMAND="ssh -o BatchMode=yes" git -C "$SOURCE" push origin "refs/tags/$RELEASE_TAG" >/dev/null 2>&1; then
    log 'GITHUB_RELEASE_TAG_PUSH=PASS'
else
    log 'GITHUB_RELEASE_TAG_PUSH=EXTERNAL_BLOCK_LOCAL_TAG_VERIFIED'
fi
[ "$(exec_deploy git -C "$SOURCE" rev-list -n 1 "$RELEASE_TAG")" = "$COMMIT" ] || fatal 'Release tag no longer points to pinned commit.'

# Build, storage gate, atomic switch, site smoke and automatic release rollback.
log 'OFFICIAL_RELEASE=BEGIN_SHOP_REMAINS_CLOSED'
bash "$SOURCE/ops/vps/halleus-release.sh" deploy --commit "$COMMIT" --tag "$RELEASE_TAG" --skip-wiki-maintenance || fatal 'Official release failed; shop remains closed.'
RELEASE_APPLIED=1
active="$(readlink -f "$CURRENT")"
[ -f "$active/.halleus-release" ] || fatal 'Active release metadata missing.'
grep -Fxq "commit=$COMMIT" "$active/.halleus-release" || fatal 'Unexpected active release commit.'
log 'OFFICIAL_RELEASE=PASS'

# R1-style complete independent focused failure discovery, on the actual built release.
failed=()
for script in \
    check-shop-seo-slugs.mjs \
    check-shop-mvp-activation.mjs \
    check-shop-manual-print-archive.mjs \
    check-shop-checkout.mjs \
    check-shop-print-handoff.mjs \
    check-shop-order-api-privacy.mjs \
    check-shop-private-print-originals.mjs \
    check-encoding.mjs; do
    if [ ! -f "$active/scripts/$script" ]; then
        log "BLOCKED_BY_DEPENDENCY $script missing"
        failed+=("$script:MISSING")
    elif exec_deploy "$NODE" "$active/scripts/$script"; then
        log "PASS $script"
    else
        log "CANDIDATE_FAILURE $script"
        failed+=("$script:FAILED")
    fi
done
pnpm_bin="$(exec_deploy bash -lc 'command -v pnpm')" || true
if [ -n "$pnpm_bin" ]; then
    if exec_deploy "$pnpm_bin" --dir "$active" exec tsc --noEmit; then log 'PASS scoped-typescript'; else failed+=(typescript); log 'CANDIDATE_FAILURE scoped-typescript'; fi
    if exec_deploy "$pnpm_bin" --dir "$active" exec eslint \
        'app/shop/page.tsx' 'app/shop/moon-phase-print/page.tsx' 'app/sitemap.ts' \
        'lib/admin/admin-auth.ts' 'lib/shop/shop-manual-print-archive.ts' \
        'app/api/admin/shop/orders/[id]/print/route.ts' \
        'components/admin/ShopOrdersWorkspace.tsx' \
        'scripts/check-shop-seo-slugs.mjs' 'scripts/check-shop-manual-print-archive.mjs'; then
        log 'PASS scoped-eslint'
    else failed+=(eslint); log 'CANDIDATE_FAILURE scoped-eslint'; fi
else
    failed+=(pnpm_unavailable)
    log 'EXTERNAL_BLOCK pnpm unavailable'
fi
if [ "${#failed[@]}" -gt 0 ]; then
    printf 'GO_LIVE_CHECK_FAILURES=%s\n' "${failed[*]}" >&2
    fatal 'Tests failed; sale was not enabled. Do not repeat the release blindly.'
fi
log 'ALL_FOCUSED_CHECKS=PASS'

# Retain a root-only rollback copy before changing shop secrets/flags.
BACKUP="$(mktemp /etc/halleus/halleus.env.p01-before-go-live.XXXXXXXX)" || fatal 'Could not allocate secret backup.'
cp -p -- "$ENV_FILE" "$BACKUP" || fatal 'Could not back up production env.'
chmod 0600 "$BACKUP"
secret="$(openssl rand -hex 32)" || fatal 'Could not generate rate secret.'
[ "${#secret}" -eq 64 ] || fatal 'Rate secret generation invalid.'
{
    printf '\n# Controlled P01 shop go-live; overrides any prior staging values.\n'
    printf 'HALLEUS_SHOP_RATE_SECRET=%s\n' "$secret"
    printf 'HALLEUS_SHOP_TRUSTED_CLIENT_IP=nginx-overwrite-v1\n'
    printf 'HALLEUS_SHOP_SHARED_RATE_ENABLED=true\n'
    printf 'HALLEUS_SHOP_MVP_ENABLED=false\n'
} >> "$ENV_FILE" || fatal 'Could not stage private rate environment.'
ENV_CHANGED=1
unset secret
systemctl restart "$SERVICE" || fatal 'Closed-shop secret staging restart failed.'
wait_http 404 -X POST -H 'Content-Type: application/json' -H 'Origin: https://halleus.ir' --data '{}' 'https://halleus.ir/api/shop/quote' || fatal 'Closed-shop staging smoke failed.'
log 'RATE_SECRET_STAGED_SHOP_CLOSED=PASS'

# Explicitly open only P01. Guarded routes refuse P02/P03 regardless of activation.
printf '\nHALLEUS_SHOP_MVP_ENABLED=true\n' >> "$ENV_FILE" || fatal 'Cannot enable P01 sales.'
systemctl restart "$SERVICE" || fatal 'Go-live service restart failed.'
systemctl is-active --quiet "$SERVICE" || fatal 'Service stopped after go-live.'
wait_http 200 'https://halleus.ir/shop' || fatal 'Public shop did not become healthy after activation.'

# Fail closed unless the public ingress and private DB rate limiter both serve requests.
for endpoint in /shop /shop/moon-phase-print /shop/cart /shop/checkout; do
    code="$(http_code "https://halleus.ir$endpoint")" || fatal "Unreachable live endpoint $endpoint"
    [ "$code" = 200 ] || fatal "Unexpected live endpoint $endpoint HTTP $code"
    log "PASS live $endpoint HTTP_200"
done
for endpoint in /shop /shop/moon-phase-print; do
    curl --fail --silent --show-error --connect-timeout 5 --max-time 20 "https://halleus.ir${endpoint}?halleus_p01_live_verification=1" | \
        "$NODE" -e 'let s="";process.stdin.setEncoding("utf8");process.stdin.on("data",v=>s+=v);process.stdin.on("end",()=>{const m=s.match(/<meta\s+[^>]*name=["\x27]robots["\x27][^>]*>/i); if(!m || !/noindex/i.test(m[0]))process.exit(0);process.exit(1);});' || fatal "Noindex still present on $endpoint"
    log "PASS live $endpoint ROBOTS_INDEXABLE"
done
for endpoint in /api/shop/quote /api/shop/orders; do
    code="$(http_code -X POST -H 'Content-Type: application/json' -H 'Origin: https://halleus.ir' --data '{}' "https://halleus.ir$endpoint")" || fatal "Rate-limited public API unreachable $endpoint"
    [ "$code" = 400 ] || fatal "Expected validated input 400 at $endpoint; got $code (rate/DB/ingress failure?)"
    log "PASS live $endpoint VALIDATED_INPUT_HTTP_400"
done
for endpoint in /shop/birth-sky-map /shop/milky-way-print; do
    curl --fail --silent --show-error --connect-timeout 5 --max-time 20 "https://halleus.ir$endpoint" | \
        "$NODE" -e 'let s="";process.stdin.setEncoding("utf8");process.stdin.on("data",v=>s+=v);process.stdin.on("end",()=>{const m=s.match(/<meta\s+[^>]*name=["\x27]robots["\x27][^>]*>/i);if(m && /noindex/i.test(m[0]))process.exit(0);process.exit(1);});' || fatal "Postponed product indexable unexpectedly: $endpoint"
    log "PASS postponed $endpoint NOINDEX"
done

# Sitemap is revalidated on a 300s interval and may lag the switch briefly.
ENV_CHANGED=0
log "P01_PUBLIC_SALES=OPEN_VERIFIED"
log "GITHUB_COMMIT=$COMMIT"
log "ACTIVE_RELEASE=$active"
log "ENV_PRIVATE_ROLLBACK_COPY=$BACKUP"
log 'P02_P03=NONPURCHASABLE_NOINDEX'
log 'NO_DB_MIGRATION_OR_NGINX_MUTATION=PASS'
