#!/usr/bin/env bash
# One operator invocation: verified additive pricing schema, owner panel and
# canonical Halleus release. No payment keys read or changed.
set -Eeuo pipefail
set +x
umask 077
SOURCE=/srv/halleus/source
CURRENT=/srv/halleus/current
PREVIOUS=/srv/halleus/previous
ENV_FILE=/etc/halleus/halleus.env
SERVICE=halleus.service
NODE=/usr/local/bin/node
ENGINE="$SOURCE/ops/vps/halleus-release.sh"
BACKUP_DIR=/root/halleus-bitpay-preflight
BASE=7cc562d9feb3b6d48796257e71a900aa0974b359
PIN="${1:-}"
TAG="v0.1.shop-prices-${PIN:0:12}"
BACKUP_FILE="$BACKUP_DIR/before-shop-prices-$(date -u +%Y%m%dT%H%M%SZ).dump"

fail(){ printf 'SHOP_PRICES_HOLD: %s\n' "$1" >&2; exit 1; }
as_deploy(){ runuser -u deploy -- "$@"; }
check_http(){
  local label="$1" expected="$2" url="$3" code='' n
  for n in $(seq 1 35); do
    code="$(curl -s -o /dev/null --connect-timeout 3 --max-time 8 -w '%{http_code}' -- "$url" || true)"
    if [ "$code" = "$expected" ]; then
      printf 'SHOP_PRICES_HTTP: %s=%s PASS\n' "$label" "$code"
      return 0
    fi
    sleep 1
  done
  printf 'SHOP_PRICES_HTTP: %s expected=%s actual=%s FAIL\n' "$label" "$expected" "$code" >&2
  return 1
}

[ "$EUID" -eq 0 ] || fail 'Root operator required (sudo).'
[[ "$PIN" =~ ^[a-f0-9]{40}$ ]] || fail 'Exact 40-character GitHub release SHA required.'
[ -x "$NODE" ] && [ -f "$ENGINE" ] && [ -f "$ENV_FILE" ] || fail 'Canonical release system missing.'
[ -f "$CURRENT/package.json" ] && [ -L "$CURRENT" ] && [ -L "$PREVIOUS" ] || fail 'Current/previous release missing.'
[ "$(stat -c '%u:%a' "$ENV_FILE")" = '0:600' ] || fail 'Private env permissions unexpected.'
[ "$(as_deploy git -C "$SOURCE" branch --show-current)" = main ] || fail 'VPS source branch mismatch.'
case "$(as_deploy git -C "$SOURCE" remote get-url origin)" in
  https://github.com/bleucluod/astro-clean|https://github.com/bleucluod/astro-clean.git|git@github.com:bleucluod/astro-clean.git) ;;
  *) fail 'Wrong GitHub origin.' ;;
esac
[ -z "$(as_deploy git -C "$SOURCE" status --porcelain=v1 --untracked-files=all)" ] || fail 'VPS source has unrelated changes.'
active_sha="$(sed -n 's/^commit=//p' "$CURRENT/.halleus-release")"
[[ "$active_sha" = "$BASE" || "$active_sha" = "$PIN" ]] || fail 'Unexpected active release. Refusing to overwrite newer work.'
source_sha="$(as_deploy git -C "$SOURCE" rev-parse HEAD)"
systemctl is-active --quiet "$SERVICE" || fail 'Live Halleus service is not active.'
as_deploy git -C "$SOURCE" fetch origin main --tags || fail 'GitHub fetch failed.'
[ "$(as_deploy git -C "$SOURCE" rev-parse origin/main)" = "$PIN" ] || fail 'GitHub main is not the pinned candidate.'
as_deploy git -C "$SOURCE" merge-base --is-ancestor "$BASE" "$source_sha" ||
  fail 'Source HEAD is outside the reviewed release ancestry.'
as_deploy git -C "$SOURCE" merge-base --is-ancestor "$source_sha" "$PIN" ||
  fail 'Source HEAD cannot be safely fast-forwarded to the pinned candidate.'
exec 8>/run/lock/halleus-shop-prices-release.lock
flock -n 8 || fail 'A shop price release is already running.'

# Retain customer/merchant data and take a real full custom-format backup
# BEFORE the additive migration. Reuse the independently verified PG17 helper.
install -d -m 0700 -o root -g root "$BACKUP_DIR"
if [ "$active_sha" = "$PIN" ]; then
  printf '%s\n' 'SHOP_PRICES: candidate_already_active=RESUMED_PASS'
  check_http 'shop' 200 'https://halleus.ir/shop' ||
    fail 'Active shop route not healthy.'
  check_http 'pricing_catalog' 200 'https://halleus.ir/api/shop/prices' ||
    fail 'Active prices API not healthy.'
  printf '%s\n' 'SHOP_PRICES_ADMIN_RELEASE=PASS'
  exit 0
fi
# Match the canonical release engine's exact two-runtime-copy headroom,
# instead of the previous unjustified 6 GiB operator preflight threshold.
storage_contract="$SOURCE/ops/vps/halleus-release-storage.env"
[ -f "$storage_contract" ] || fail 'Canonical release storage contract missing.'
# shellcheck disable=SC1090
source "$storage_contract"
[[ "${HALLEUS_RUNTIME_BUDGET_BYTES:-}" =~ ^[1-9][0-9]*$ ]] &&
  [ "${HALLEUS_HEADROOM_RUNTIME_COPIES:-}" = 2 ] &&
  [ "${HALLEUS_KEEP_RELEASES:-}" = 2 ] ||
  fail 'Canonical storage contract invalid; do not override storage safety.'
required_bytes="$((HALLEUS_RUNTIME_BUDGET_BYTES * HALLEUS_HEADROOM_RUNTIME_COPIES))"
available_bytes="$(df -PB1 "$BACKUP_DIR" | awk 'END {print $4}')"
available_inodes="$(df -Pi "$BACKUP_DIR" | awk 'END {print $4}')"
# Keep explicit space for an additional private backup; previously validated
# backup archives will be reused instead of needlessly created.
extra_reserve="$((512 * 1024 * 1024))"
[[ "$available_bytes" =~ ^[0-9]+$ ]] && [[ "$available_inodes" =~ ^[0-9]+$ ]] ||
  fail 'Cannot measure free bytes/inodes for pricing release.'
printf 'SHOP_PRICES_STORAGE: free_bytes=%s required_release_bytes=%s backup_reserve_bytes=%s free_inodes=%s\n' \
  "$available_bytes" "$required_bytes" "$extra_reserve" "$available_inodes"
[ "$available_bytes" -ge "$((required_bytes + extra_reserve))" ] &&
  [ "$available_inodes" -ge 67514 ] ||
  fail 'Insufficient canonical release headroom plus private backup reserve; no migration attempted.'
service_pid="$(systemctl show -P MainPID "$SERVICE")"
[[ "$service_pid" =~ ^[1-9][0-9]*$ ]] && [ -r "/proc/$service_pid/environ" ] ||
  fail 'Cannot establish live Node database environment.'
shopt -s nullglob
existing_backups=("$BACKUP_DIR"/before-shop-prices-*.dump)
if [ "${#existing_backups[@]}" -gt 0 ]; then
  newest="${existing_backups[0]}"
  for f in "${existing_backups[@]}"; do [ "$f" -nt "$newest" ] && newest="$f"; done
  if [ ! -L "$newest" ] && [ -s "$newest" ] &&
    [ "$(stat -c '%u:%a' "$newest")" = '0:600' ] &&
    [ "$(stat -c '%Y' "$newest")" -gt "$(( $(date +%s) - 86400 ))" ] &&
    /usr/lib/postgresql/17/bin/pg_restore --list "$newest" >/dev/null 2>&1; then
    BACKUP_FILE="$newest"
    printf '%s\n' 'SHOP_PRICES: existing_backup=RESUMED_PASS'
  fi
fi
if [ ! -s "$BACKUP_FILE" ]; then
  as_deploy git -C "$SOURCE" show "${PIN}:ops/vps/halleus-bitpay-pg-backup.cjs" |
    "$NODE" - "$service_pid" "$BACKUP_FILE" ||
    fail 'Production DB backup failed. No migration attempted.'
fi
[ -s "$BACKUP_FILE" ] || fail 'DB backup missing or empty.'
chmod 0600 "$BACKUP_FILE"
/usr/lib/postgresql/17/bin/pg_restore --list "$BACKUP_FILE" >/dev/null ||
  fail 'Backup archive could not be verified.'
printf '%s\n' 'SHOP_PRICES: backup=PASS'

# Fast-forward only, never hard reset; this ensures the official release
# engine reads the correct bounded storage policy from SOURCE.
as_deploy git -C "$SOURCE" merge --ff-only origin/main ||
  fail 'Safe fast-forward of source failed.'
[ "$(as_deploy git -C "$SOURCE" rev-parse HEAD)" = "$PIN" ] ||
  fail 'Source HEAD does not match the approved candidate.'
[ -z "$(as_deploy git -C "$SOURCE" status --porcelain=v1 --untracked-files=all)" ] ||
  fail 'Source became dirty after fast-forward.'

# Run all safe independent checks prior to any DB mutation. Syntax,
# authorization, quote and expiry fixtures run against the pinned source.
failures=0
if as_deploy "$NODE" "$SOURCE/scripts/check-shop-live-prices.mjs"; then
  printf '%s\n' 'SHOP_PRICES: focused_price_guard=PASS'
else
  printf '%s\n' 'SHOP_PRICES: focused_price_guard=FAIL' >&2
  failures=1
fi
[ "$failures" -eq 0 ] || fail 'Independent preflight checks failed; no migration or deployment attempted.'

# Candidate QA takes place in a disposable detached worktree with locked
# dependencies, BEFORE production migration. Do not delete a failed candidate.
# Resume the existing valid R1 candidate rather than reinstalling/building it.
# R1 was fully discovered: seven focused guards, TypeScript and diff passed;
# only the two legacy payment-status SQL mocks failed.
R1=86d9ec457d29a41ee59cd8433e90328b32ccb4ed
QA="/srv/halleus/releases/.shop-prices-preflight-86d9ec457d29"
expected_resume_changes="$(printf '%s\n' \
  'docs/HALLEUS_SHOP_BITPAY_EASY_WINS_ROADMAP_2026-11-10.md' \
  'ops/vps/halleus-shop-prices-release.sh' \
  'scripts/check-shop-order-api-privacy.mjs' \
  'scripts/check-shop-order-experience.mjs')"
observed_resume_changes="$(as_deploy git -C "$SOURCE" diff --name-only "$R1" "$PIN")"
resume_qa=0
if [ -e "$QA" ]; then
  current_qa_sha="$(as_deploy git -C "$QA" rev-parse HEAD 2>/dev/null)" ||
    fail 'Existing R1 candidate is not a valid Git worktree.'
  [ -z "$(as_deploy git -C "$QA" status --porcelain=v1 --untracked-files=all)" ] ||
    fail 'Existing R1 candidate has unreviewed changes; preserve it.'
  if [ "$observed_resume_changes" = "$expected_resume_changes" ] &&
    [ "$current_qa_sha" = "$R1" ]; then
    as_deploy git -C "$QA" merge --ff-only "$PIN" ||
      fail 'Fast-forward of existing R1 candidate failed. Candidate preserved.'
    resume_qa=1
  elif [ "$observed_resume_changes" = "$expected_resume_changes" ] &&
       [ "$current_qa_sha" = "$PIN" ]; then
    resume_qa=1
  else
    fail 'R1 candidate or change fingerprint differs; preserve existing worktree.'
  fi
  printf 'SHOP_PRICES: R1_candidate_preserved_and_resumed=PASS sha=%s\n' "$PIN"
else
  # Defensive fallback if the prior VPS candidate was removed independently.
  QA="/srv/halleus/releases/.shop-prices-preflight-${PIN:0:12}"
  [ ! -e "$QA" ] || fail 'Unexpected alternate QA worktree: preserve it.'
  as_deploy git -C "$SOURCE" worktree add --detach "$QA" "$PIN" ||
    fail 'Could not stage isolated price candidate.'
fi
pnpm_bin="$(as_deploy bash -lc 'command -v pnpm')"
[ -n "$pnpm_bin" ] || fail 'pnpm missing for the deploy user.'
if [ ! -d "$QA/node_modules/typescript" ]; then
  as_deploy "$pnpm_bin" --dir "$QA" install --frozen-lockfile --prod=false ||
    fail 'Preflight dependency install failed; candidate preserved.'
fi
failures=0
if [ "$resume_qa" -eq 1 ]; then
  # The non-fixture source and dependencies did not change since R1.
  for check in \
    scripts/check-shop-order-api-privacy.mjs \
    scripts/check-shop-order-experience.mjs; do
    if as_deploy bash -c 'cd "$1"; shift; exec /usr/local/bin/node "$@"' _ "$QA" "$check"; then
      printf 'SHOP_PRICES_R2: %s=PASS\n' "$check"
    else
      printf 'SHOP_PRICES_R2: %s=FAIL\n' "$check" >&2
      failures=1
    fi
  done
  printf '%s\n' 'SHOP_PRICES_R2: R1_other_focused_checks=RESUMED_PASS'
  printf '%s\n' 'SHOP_PRICES_R2: R1_complete_TypeScript=RESUMED_PASS'
else
  for check in \
    scripts/check-shop-live-prices.mjs \
    scripts/check-shop-orders.mjs \
    scripts/check-shop-checkout.mjs \
    scripts/check-shop-order-api-privacy.mjs \
    scripts/check-shop-order-experience.mjs \
    scripts/check-shop-p02-live-product.mjs \
    scripts/check-shop-postgres-http-e2e.mjs \
    scripts/check-shop-bitpay-full-integration.mjs \
    scripts/check-shop-bitpay-flow.mjs; do
    check_args=()
    [ "$check" = scripts/check-shop-postgres-http-e2e.mjs ] && check_args=(--code-smoke)
    if as_deploy bash -c 'cd "$1"; shift; exec /usr/local/bin/node "$@"' _ "$QA" "$check" "${check_args[@]}"; then
      printf 'SHOP_PRICES_PREFLIGHT: %s=PASS\n' "$check"
    else
      printf 'SHOP_PRICES_PREFLIGHT: %s=FAIL\n' "$check" >&2
      failures=1
    fi
  done
  if as_deploy "$pnpm_bin" --dir "$QA" exec tsc -p tsconfig.json --noEmit; then
    printf '%s\n' 'SHOP_PRICES_PREFLIGHT: complete_TypeScript=PASS'
  else
    printf '%s\n' 'SHOP_PRICES_PREFLIGHT: complete_TypeScript=FAIL' >&2
    failures=1
  fi
fi
if as_deploy git -C "$SOURCE" --no-pager diff --check "$BASE" "$PIN"; then
  printf '%s\n' 'SHOP_PRICES_PREFLIGHT: diff_check=PASS'
else
  printf '%s\n' 'SHOP_PRICES_PREFLIGHT: diff_check=FAIL' >&2
  failures=1
fi
if [ "$failures" -ne 0 ]; then
  printf 'SHOP_PRICES_PREFLIGHT_FAILED: candidate preserved at %s; migration not attempted\n' "$QA" >&2
  exit 1
fi
as_deploy git -C "$SOURCE" worktree remove --force "$QA" ||
  fail 'Could not remove passed temporary preflight worktree.'
printf '%s\n' 'SHOP_PRICES: ALL_ISOLATED_PREFLIGHT=PASS'

# Private ledger addition only: no existing order/price rows touched.
"$NODE" - "$service_pid" "$SOURCE/database/migrations/0035_private_shop_price_overrides.sql" <<'NODE_MIGRATE'
const {readFileSync}=require('node:fs');
const {createRequire}=require('node:module');
const pid=process.argv[2],path=process.argv[3];
const url=readFileSync(`/proc/${pid}/environ`,'utf8').split('\0')
  .find(x=>x.startsWith('DATABASE_URL='))?.slice('DATABASE_URL='.length);
if(!url){console.error('SHOP_PRICES_HOLD: runtime database connection missing');process.exit(4)}
const pg=createRequire('/srv/halleus/current/package.json')('postgres');
(async()=>{
  const sql=pg(url,{max:1,connect_timeout:8,prepare:false});
  try {
    const [base]=await sql`select
      to_regclass('halleus_private.shop_orders') is not null as orders,
      to_regclass('halleus_private.shop_payment_attempts') is not null as payments`;
    if(!base.orders||!base.payments)throw Error('preexisting_shop_ledgers_missing');
    const [before]=await sql`select
      to_regclass('halleus_private.shop_price_overrides') is not null as prices,
      to_regclass('halleus_private.shop_price_change_events') is not null as history`;
    if(before.prices!==before.history)throw Error('partial_price_schema_manual_review_required');
    if(!before.prices){
      const migration=readFileSync(path,'utf8');
      if(!migration.startsWith('-- Owner-only live catalog pricing;')
          ||!migration.includes('commit;'))throw Error('migration_source_mismatch');
      await sql.unsafe(migration);
    }
    const [after]=await sql`select
      to_regclass('halleus_private.shop_price_overrides') is not null as prices,
      to_regclass('halleus_private.shop_price_change_events') is not null as history,
      exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
       where n.nspname='halleus_private' and c.relname='shop_price_overrides' and c.relrowsecurity) as price_rls,
      exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
       where n.nspname='halleus_private' and c.relname='shop_price_change_events' and c.relrowsecurity) as history_rls`;
    if(!after.prices||!after.history||!after.price_rls||!after.history_rls)
      throw Error('private_price_schema_verification_failed');
    console.log('SHOP_PRICES: migration_0035=PASS private_schema=PASS');
  } catch(err){
    console.error('SHOP_PRICES_HOLD: database='+String(err?.code||'schema_error').replace(/[^a-zA-Z0-9_]/g,'_').slice(0,90));
    process.exitCode=5;
  } finally {await sql.end({timeout:2});}
})().catch(()=>{console.error('SHOP_PRICES_HOLD: migration driver failed');process.exitCode=5});
NODE_MIGRATE

# Approved, exact source tag, then deploy ONLY through the canonical engine.
if as_deploy git -C "$SOURCE" rev-parse --verify "refs/tags/$TAG" >/dev/null 2>&1; then
  [ "$(as_deploy git -C "$SOURCE" rev-list -n 1 "$TAG")" = "$PIN" ] ||
    fail 'Pinned release tag collision.'
else
  as_deploy git -C "$SOURCE" tag "$TAG" "$PIN" ||
    fail 'Could not create reviewed price release tag.'
fi
as_deploy git -C "$SOURCE" push origin "refs/tags/$TAG" ||
  fail 'Pinned release tag push failed.'
bash "$ENGINE" deploy --commit "$PIN" --tag "$TAG" --skip-wiki-maintenance ||
  fail 'Official release failed. Old release remains or has been restored.'
[ "$(sed -n 's/^commit=//p' "$CURRENT/.halleus-release")" = "$PIN" ] ||
  fail 'Active release does not match pinned source.'
systemctl is-active --quiet "$SERVICE" || fail 'Live service is not active after release.'
printf '%s\n' 'SHOP_PRICES: official_release=PASS'

# The unchanged candidate checks were completed before migration and release.
# Reuse those passes; only run live HTTP/data-contract checks after activation.
failures=0
printf '%s\n' 'SHOP_PRICES_CHECKS: focused_preflight=RESUMED_PASS TypeScript=RESUMED_PASS'
check_http 'shop' 200 'https://halleus.ir/shop' || failures=1
check_http 'shop_payment' 200 'https://halleus.ir/shop/payment' || failures=1
check_http 'pricing_catalog' 200 'https://halleus.ir/api/shop/prices' || failures=1
check_http 'bitpay_invalid_callback' 409 'https://halleus.ir/api/shop/payments/bitpay/return' || failures=1
if ! curl --silent --fail --connect-timeout 5 --max-time 12 \
  'https://halleus.ir/api/shop/prices' |
  "$NODE" -e '
let s="";process.stdin.on("data",x=>s+=x).on("end",()=>{
try {
  const data=JSON.parse(s);
  for(const key of ["p01:10x15","p01:20x30","p01:30x45","p02:10x15","p02:20x30","p02:30x45"]){
    if(data.ok!==true||!Number.isSafeInteger(data.prices?.[key])||data.prices[key]<1000)process.exitCode=3;
  }
  if(!process.exitCode)console.log("SHOP_PRICES: public_catalog_contract=PASS");
}catch{process.exitCode=3}
})'; then failures=1; fi
printf 'SHOP_PRICES: active_sha=%s\n' "$PIN"
printf 'SHOP_PRICES: previous=%s service=%s\n' "$(readlink -f "$PREVIOUS")" "$(systemctl is-active "$SERVICE")"
if [ "$failures" -ne 0 ]; then
  printf '%s\n' 'SHOP_PRICES_POST_RELEASE_FAILURE: reverting code through canonical rollback; private additive schema remains.' >&2
  if bash "$ENGINE" rollback; then
    printf '%s\n' 'SHOP_PRICES: code_rollback=PASS payment_env_untouched=true'
  else
    printf '%s\n' 'SHOP_PRICES_SAFETY_FATAL: canonical rollback failed; inspect current/previous/service before doing anything else' >&2
  fi
  exit 1
fi
printf '%s\n' 'SHOP_PRICES_ADMIN_RELEASE=PASS'
printf '%s\n' 'SHOP_PRICES: admin_authenticated_price_write=NOT_TESTED_WITH_REAL_OWNER_SESSION'
printf '%s\n' 'SHOP_PRICES: DB price edits need no future VPS sync; existing BitPay payment flags were untouched.'
