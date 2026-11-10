#!/usr/bin/env bash
# Operator-controlled BitPay.ir S1 release: production, sensitive operation.
# Execute ONLY from the verified GitHub commit with sudo bash -s -- <pinned-sha>.
# Never logs keys, connection strings, callback secrets, or customer rows.
set -Eeuo pipefail
set +x
umask 077

SOURCE=/srv/halleus/source
CURRENT=/srv/halleus/current
ENV_FILE=/etc/halleus/halleus.env
ENGINE="$SOURCE/ops/vps/halleus-release.sh"
SERVICE=halleus.service
NODE=/usr/local/bin/node
PIN="${1:-}"
TAG='v0.1.bitpay-s1-'"${PIN:0:12}"
BACKUP_DIR=/root/halleus-bitpay-preflight
STARTED_AT="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_FILE="$BACKUP_DIR/before-bitpay-$STARTED_AT.dump"
ENV_BACKUP="$BACKUP_DIR/halleus-env-before-bitpay-$STARTED_AT"
STAGED_ENV=''
ENV_ACTIVATED=0

fail() { printf 'BITPAY_RELEASE_HOLD: %s\n' "$1" >&2; exit 1; }
pass() { printf 'BITPAY_RELEASE: %s=PASS\n' "$1"; }
as_deploy() { runuser -u deploy -- "$@"; }

on_exit() {
  local rc=$?
  trap - EXIT
  if [ "$rc" -ne 0 ] && [ "$ENV_ACTIVATED" -eq 1 ]; then
    printf '%s\n' 'BITPAY_ROLLBACK: restoring prior private environment and restarting service' >&2
    install -m 0600 -o root -g root "$ENV_BACKUP" "$ENV_FILE" || true
    systemctl restart "$SERVICE" || true
    systemctl is-active --quiet "$SERVICE" || printf '%s\n' 'BITPAY_ROLLBACK_WARNING: inspect halleus.service' >&2
  fi
  [ -z "$STAGED_ENV" ] || rm -f -- "$STAGED_ENV"
  exit "$rc"
}
trap on_exit EXIT

[ "${EUID}" -eq 0 ] || fail 'Run as root via sudo from an interactive VPS shell.'
[ -t 2 ] && [ -r /dev/tty ] || fail 'Interactive terminal required for API key and explicit approval.'
[[ "$PIN" =~ ^[a-f0-9]{40}$ ]] || fail 'Expected exact 40-character GitHub commit SHA.'
[ -x "$NODE" ] && command -v pg_dump >/dev/null && command -v pg_restore >/dev/null || fail 'Node/pg_dump/pg_restore missing.'
[ -f "$ENV_FILE" ] && [ -f "$ENGINE" ] && [ -f "$CURRENT/package.json" ] || fail 'Canonical VPS runtime files missing.'
[ -d "$SOURCE/.git" ] || fail 'Source Git checkout missing.'
[ "$(as_deploy git -C "$SOURCE" branch --show-current)" = main ] || fail 'Wrong VPS source branch.'
origin="$(as_deploy git -C "$SOURCE" remote get-url origin)"
case "$origin" in https://github.com/bleucluod/astro-clean|https://github.com/bleucluod/astro-clean.git|git@github.com:bleucluod/astro-clean.git) ;; *) fail 'Unexpected origin; stop.';; esac
[ -z "$(as_deploy git -C "$SOURCE" status --porcelain=v1 --untracked-files=all)" ] || fail 'Unrelated changes in VPS source checkout.'
systemctl is-active --quiet "$SERVICE" || fail 'Service is not healthy before activation.'
[ -L "$CURRENT" ] && [ -L /srv/halleus/previous ] || fail 'Current/previous release links missing.'
[ "$(stat -c %a "$ENV_FILE")" = 600 ] || fail 'Private environment file must have mode 600.'

printf '%s\n' 'BITPAY_RELEASE: pinned GitHub preflight'
as_deploy git -C "$SOURCE" fetch --tags origin main || fail 'Cannot fetch pinned source.'
[ "$(as_deploy git -C "$SOURCE" rev-parse origin/main)" = "$PIN" ] || fail 'GitHub main changed; do not deploy an unreviewed commit.'
[ -f "$CURRENT/.halleus-release" ] || fail 'Missing current release metadata.'

# Verify shop is actually active before taking any financial action.
service_pid="$(systemctl show -P MainPID "$SERVICE")"
[[ "$service_pid" =~ ^[1-9][0-9]*$ ]] && [ -r "/proc/$service_pid/environ" ] || fail 'Cannot inspect actual Node service environment.'
"$NODE" - "$service_pid" <<'NODE_ENV_GATE'
const {readFileSync}=require('node:fs');
const pid=process.argv[2];
const env=Object.fromEntries(readFileSync(`/proc/${pid}/environ`).toString('utf8').split('\0')
  .filter(Boolean).map(x=>{const pos=x.indexOf('=');return [x.slice(0,pos),x.slice(pos+1)];}));
const checks=['HALLEUS_SHOP_MVP_ENABLED','HALLEUS_SHOP_SHARED_RATE_ENABLED'];
if(checks.some(x=>env[x]!=='true')||env.HALLEUS_SHOP_TRUSTED_CLIENT_IP!=='nginx-overwrite-v1') {
  console.error('BITPAY_RELEASE_HOLD: live shop ingress not enabled; payment will not be activated');
  process.exitCode=3;
}else console.log('BITPAY_RELEASE: live_shop_contract=PASS');
NODE_ENV_GATE
pass preflight

# Resolve the production database only from the running Node service's environment.
# Never pass credentials via shell arguments or print them.
install -d -m 0700 -o root -g root "$BACKUP_DIR"
space_kib="$(df -Pk "$BACKUP_DIR" | awk 'END {print $4}')"
[[ "$space_kib" =~ ^[0-9]+$ ]] && [ "$space_kib" -ge 6291456 ] || fail 'Less than 6 GiB free for release + private DB backup.'

# Resume from the last valid checkpoint: the previous run only failed at pg_dump.
# Query the running service's DB and use a compatible pg_dump/pg_restore pair.
# Credentials are passed to libpq only through the child environment, never argv.
as_deploy git -C "$SOURCE" show "${PIN}:ops/vps/halleus-bitpay-pg-backup.cjs" |
  "$NODE" - "$service_pid" "$BACKUP_FILE" || fail 'Compatible PostgreSQL backup gate failed; no deployment or migration attempted.'
[ -s "$BACKUP_FILE" ] || fail 'Verified database backup file is missing or empty.'
chmod 0600 "$BACKUP_FILE"
pass backup_archive_readable

# The tag is pushed before release/migration so rollback has an exact source ref.
if as_deploy git -C "$SOURCE" rev-parse --verify "refs/tags/$TAG" >/dev/null 2>&1; then
  [ "$(as_deploy git -C "$SOURCE" rev-list -n 1 "$TAG")" = "$PIN" ] || fail 'Release tag collision.'
else
  as_deploy git -C "$SOURCE" tag "$TAG" "$PIN" || fail 'Unable to create pinned release tag.'
fi
as_deploy git -C "$SOURCE" push origin "refs/tags/$TAG" || fail 'Tag push failed before any DB mutation.'
pass release_tag_pushed

# Deploy code with payment flags still OFF. Only canonical atomic release engine.
if [ "$(sed -n 's/^commit=//p' "$CURRENT/.halleus-release")" != "$PIN" ]; then
  bash "$ENGINE" deploy --commit "$PIN" --tag "$TAG" --skip-wiki-maintenance || fail 'Canonical code release failed; payment remains disabled.'
fi
pass code_release

# Execute only the focused BitPay checks, collecting all independent failures.
failed=0
for script in \
  scripts/check-shop-bitpay-ir-client.mjs \
  scripts/check-shop-bitpay-attempt-ledger.mjs \
  scripts/check-shop-bitpay-flow.mjs \
  scripts/check-shop-bitpay-full-integration.mjs \
  scripts/check-shop-bitpay-activation-boundary.mjs \
  scripts/check-shop-payment-gateway.mjs; do
  if as_deploy bash -c 'cd /srv/halleus/current && exec /usr/local/bin/node "$1"' _ "$script"; then
    printf 'BITPAY_CHECK_PASS: %s\n' "$script"
  else
    printf 'BITPAY_CHECK_FAIL: %s\n' "$script" >&2
    failed=1
  fi
done
[ "$failed" -eq 0 ] || fail 'Focused checks failed; code is deployed safely but online payment remains disabled.'

# Operator must explicitly acknowledge merchant agreement and DB mutation.
printf '%s\n' 'WARNING: official BitPay.ir account contract, rial amounts and return parameters must match this integration.'
printf '%s\n' 'WARNING: the next step creates the private attempt table on the production DB.'
printf '%s\n' 'WARNING: the final step accepts real money; perform a controlled low-value payment immediately.'
read -r -p 'Type APPLY-BITPAY-0034 to authorize this migration: ' migration_ok < /dev/tty
[ "$migration_ok" = APPLY-BITPAY-0034 ] || fail 'Operator did not approve production migration.'

# Execute the reviewed 0034 migration via the RUNNING app's actual Postgres driver.
# No connection URL is printed or placed in argv; the migration has BEGIN/COMMIT.
service_pid="$(systemctl show -P MainPID "$SERVICE")"
"$NODE" - "$service_pid" "$CURRENT/database/migrations/0034_private_shop_bitpay_attempts.sql" <<'NODE_MIGRATE'
const {readFileSync}=require('node:fs');
const {createRequire}=require('node:module');
const pid=process.argv[2],path=process.argv[3];
const url=readFileSync(`/proc/${pid}/environ`).toString('utf8').split('\0')
  .find(x=>x.startsWith('DATABASE_URL='))?.slice('DATABASE_URL='.length);
if(!url){console.error('BITPAY_RELEASE_HOLD: running DB endpoint missing');process.exit(4)}
const postgres=createRequire('/srv/halleus/current/package.json')('postgres');
(async()=>{
  const sql=postgres(url,{max:1,connect_timeout:8,prepare:false});
  try {
    const [pre]=await sql`select to_regclass('halleus_private.shop_payment_attempts') is not null as installed`;
    if(!pre.installed){
      const migration=readFileSync(path,'utf8');
      if(!migration.startsWith('-- BitPay.ir private payment attempts.')||!migration.includes('commit;'))throw Error('migration_source_unexpected');
      await sql.unsafe(migration);
    }
    const [check]=await sql`select
      to_regclass('halleus_private.shop_payment_attempts') is not null as ledger,
      to_regclass('halleus_private.shop_bitpay_one_unresolved_per_order') is not null as unique_index,
      exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
        where n.nspname='halleus_private' and c.relname='shop_payment_attempts' and c.relrowsecurity) as rls`;
    if(!check.ledger||!check.unique_index||!check.rls)throw Error('migration_verification_failed');
    console.log('BITPAY_RELEASE: private_attempt_ledger=PASS');
  } catch(err){console.error('BITPAY_RELEASE_HOLD: migration failed ('+String(err?.code||err?.message||'unknown')+')');process.exitCode=5}
  finally{await sql.end({timeout:2})}
})().catch(()=>{console.error('BITPAY_RELEASE_HOLD: migration driver error');process.exitCode=5});
NODE_MIGRATE

# Keep a recoverable copy of the original private env. Never print credentials.
install -m 0600 -o root -g root "$ENV_FILE" "$ENV_BACKUP"
read -r -s -p 'Paste BitPay.ir API key (hidden input): ' api_key < /dev/tty
printf '\n' > /dev/tty
[[ "$api_key" =~ ^[A-Za-z0-9._-]{8,512}$ ]] || fail 'API key format unsupported; no env modified.'
read -r -p 'Type ACTIVATE-REAL-PAYMENTS to enable customer payments: ' activate_ok < /dev/tty
[ "$activate_ok" = ACTIVATE-REAL-PAYMENTS ] || fail 'Operator did not authorize real payments.'

STAGED_ENV="$(mktemp /etc/halleus/.halleus-bitpay-env.XXXXXXXX)"
chmod 0600 "$STAGED_ENV"
awk '!/^HALLEUS_BITPAY_/' "$ENV_FILE" > "$STAGED_ENV" || fail 'Private env copy failed.'
grep -q '^DATABASE_URL=' "$STAGED_ENV" || fail 'Private env copy lost DATABASE_URL; refusing activation.'
{
  printf 'HALLEUS_BITPAY_SOURCE_READY=true\n'
  printf 'HALLEUS_BITPAY_LEDGER_READY=true\n'
  printf 'HALLEUS_BITPAY_PAYMENTS_ENABLED=true\n'
  printf 'HALLEUS_BITPAY_API_KEY=%s\n' "$api_key"
  printf 'HALLEUS_BITPAY_CALLBACK_SECRET=%s\n' "$(openssl rand -hex 32)"
} >> "$STAGED_ENV"
unset api_key
chown root:root "$STAGED_ENV"
mv -f -- "$STAGED_ENV" "$ENV_FILE"
STAGED_ENV=''
ENV_ACTIVATED=1
systemctl restart "$SERVICE" || fail 'Service restart failed; private environment will be rolled back.'
systemctl is-active --quiet "$SERVICE" || fail 'Service did not become active; rollback initiated.'

# Tests do not create actual orders or send real payment requests.
web_code="$(curl --max-time 12 --silent --output /dev/null --write-out '%{http_code}' https://halleus.ir/shop/payment || true)"
[ "$web_code" = 200 ] || fail 'Payment page live HTTP smoke failed; environment rollback initiated.'
# Missing callback parameters must fail as an authenticated-request error (409),
# NOT 404 (operator gate off) and never redirect as paid.
callback_code="$(curl --max-time 12 --silent --output /dev/null --write-out '%{http_code}' https://halleus.ir/api/shop/payments/bitpay/return || true)"
[ "$callback_code" = 409 ] || fail 'Live callback readiness check not 409; environment rollback initiated.'
[ "$(sed -n 's/^commit=//p' "$CURRENT/.halleus-release")" = "$PIN" ] || fail 'Active release SHA mismatch; rollback initiated.'
ENV_ACTIVATED=0
printf '%s\n' 'BITPAY_RELEASE: ONLINE_GATE_ENABLED=PASS'
printf 'BITPAY_RELEASE: active_sha=%s\n' "$PIN"
printf '%s\n' 'BITPAY_RELEASE: service=active page_http=200 backup_archive=verified'
printf '%s\n' 'BITPAY_RELEASE: first_real_payment=NOT_TESTED (complete a controlled real transaction and verify shop order + provider panel before promotion)'
