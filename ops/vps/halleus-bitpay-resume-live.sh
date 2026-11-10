#!/usr/bin/env bash
# Resume an already deployed/approved BitPay S1 activation without rebuilding,
# reapplying migration 0034 or repeating authorization prompts.
# Never log merchant keys, callback secrets, database URLs or customer records.
set -Eeuo pipefail
set +x
umask 077

SOURCE=/srv/halleus/source
CURRENT=/srv/halleus/current
PREVIOUS=/srv/halleus/previous
ENV_FILE=/etc/halleus/halleus.env
PENDING=/etc/halleus/.halleus-bitpay-pending.env
BACKUP_DIR=/root/halleus-bitpay-preflight
SERVICE=halleus.service
NODE=/usr/local/bin/node
ACTIVE_SHA=7cc562d9feb3b6d48796257e71a900aa0974b359
PIN="${1:-}"
ORIGINAL_ENV=''
TEMP_ENV=''
ENV_ACTIVATED=0

fail() { printf 'BITPAY_RESUME_HOLD: %s\n' "$1" >&2; exit 1; }
as_deploy() { runuser -u deploy -- "$@"; }

http_probe() {
  local label="$1" expected="$2" attempts="$3" url="$4" code='000' try
  shift 4
  for ((try=1; try<=attempts; try++)); do
    code="$(curl --silent --output /dev/null --connect-timeout 2 --max-time 6 \
      --header 'Cache-Control: no-cache' --write-out '%{http_code}' "$@" -- "$url" || true)"
    if [ "$code" = "$expected" ]; then
      printf 'BITPAY_HTTP_PASS: %s HTTP=%s attempts=%s\n' "$label" "$code" "$try"
      return 0
    fi
    [ "$try" -eq "$attempts" ] || sleep 1
  done
  printf 'BITPAY_HTTP_FAIL: %s expected=%s actual=%s attempts=%s\n' "$label" "$expected" "$code" "$attempts" >&2
  return 1
}

cleanup() {
  local rc=$?
  trap - EXIT
  if [ "$rc" -ne 0 ] && [ "$ENV_ACTIVATED" -eq 1 ]; then
    printf '%s\n' 'BITPAY_ROLLBACK: restoring original private env; payment gate will be disabled'
    if [ -n "$ORIGINAL_ENV" ] && [ -s "$ORIGINAL_ENV" ]; then
      install -o root -g root -m 0600 -- "$ORIGINAL_ENV" "$ENV_FILE" || true
      systemctl restart "$SERVICE" || true
      if systemctl is-active --quiet "$SERVICE"; then
        http_probe 'rollback-local-payment' 200 30 'http://127.0.0.1:3000/shop/payment' || true
      fi
    else
      printf '%s\n' 'BITPAY_SAFETY_FATAL: env rollback copy missing; inspect service immediately' >&2
    fi
  fi
  [ -z "$TEMP_ENV" ] || rm -f -- "$TEMP_ENV"
  if [ "$rc" -eq 0 ]; then rm -f -- "$PENDING"; fi
  if [ -n "$ORIGINAL_ENV" ] && [ "$ENV_ACTIVATED" -eq 0 ]; then rm -f -- "$ORIGINAL_ENV"; fi
  exit "$rc"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

[ "$EUID" -eq 0 ] || fail 'Run as root through sudo on the VPS.'
exec 9>/run/lock/halleus-release.lock
flock -n 9 || fail 'Another Halleus release or activation is running.'
[ -t 2 ] && [ -r /dev/tty ] || fail 'Interactive private TTY required for merchant key.'
[[ "$PIN" =~ ^[0-9a-f]{40}$ ]] || fail 'Missing pinned GitHub script commit.'
[ -x "$NODE" ] && [ -x /usr/lib/postgresql/17/bin/pg_restore ] || fail 'Required Node/PG17 client missing.'
[ -f "$ENV_FILE" ] && [ -f "$CURRENT/package.json" ] && [ -d "$SOURCE/.git" ] || fail 'Canonical VPS layout missing.'
[ "$(stat -c '%u:%a' "$ENV_FILE")" = '0:600' ] || fail 'Private env must be root-owned mode 600.'
[ -L "$CURRENT" ] && [ -L "$PREVIOUS" ] || fail 'Current/previous release symlinks are missing.'
[ "$(readlink -f "$CURRENT")" != "$(readlink -f "$PREVIOUS")" ] || fail 'Current and previous must be distinct.'
[ "$(as_deploy git -C "$SOURCE" branch --show-current)" = main ] || fail 'VPS source must be main.'
case "$(as_deploy git -C "$SOURCE" remote get-url origin)" in
  https://github.com/bleucluod/astro-clean|https://github.com/bleucluod/astro-clean.git|git@github.com:bleucluod/astro-clean.git) ;;
  *) fail 'Unexpected GitHub origin.' ;;
esac
[ -z "$(as_deploy git -C "$SOURCE" status --porcelain=v1 --untracked-files=all)" ] || fail 'VPS source has unrelated dirty files.'
[ "$(as_deploy git -C "$SOURCE" rev-parse HEAD)" = "$ACTIVE_SHA" ] || fail 'VPS source checkout differs from deployed release; investigate.'
[ "$(as_deploy git -C "$SOURCE" rev-parse origin/main)" = "$PIN" ] || fail 'GitHub main was not fetched/pinned to this script.'
[ "$(sed -n 's/^commit=//p' "$CURRENT/.halleus-release")" = "$ACTIVE_SHA" ] || fail 'Live release SHA mismatch.'
case "$(readlink -f "$CURRENT")" in /srv/halleus/releases/*) ;; *) fail 'Current release outside approved directory.' ;; esac
systemctl is-active --quiet "$SERVICE" || fail 'Live service is not active.'

# Migration 0034 already succeeded. Validate the existing ledger and privileges
# through the *running* Node process and self-hosted PostgreSQL, read only.
service_pid="$(systemctl show -P MainPID "$SERVICE")"
[[ "$service_pid" =~ ^[1-9][0-9]*$ ]] && [ -r "/proc/$service_pid/environ" ] || fail 'Live Node process environment not readable.'
gate_state="$("$NODE" - "$service_pid" <<'NODE_LEDGER'
const {readFileSync}=require('node:fs');
const {createRequire}=require('node:module');
const pid=process.argv[2];
const entries=readFileSync(`/proc/${pid}/environ`,'utf8').split('\0').filter(Boolean);
const env=Object.fromEntries(entries.map(x=>{const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1)];}));
const shop=['HALLEUS_SHOP_MVP_ENABLED','HALLEUS_SHOP_SHARED_RATE_ENABLED'];
if(shop.some(k=>env[k]!=='true')||env.HALLEUS_SHOP_TRUSTED_CLIENT_IP!=='nginx-overwrite-v1'){
  console.error('BITPAY_RESUME_HOLD: live shop ingress gate invalid');process.exit(3);
}
const flags=['HALLEUS_BITPAY_SOURCE_READY','HALLEUS_BITPAY_LEDGER_READY','HALLEUS_BITPAY_PAYMENTS_ENABLED'];
const yes=flags.filter(k=>env[k]==='true').length;
if(yes!==0 && yes!==flags.length){console.error('BITPAY_RESUME_HOLD: partially enabled live payment flags');process.exit(3)}
if(!env.DATABASE_URL){console.error('BITPAY_RESUME_HOLD: runtime database connection missing');process.exit(3)}
const sql=createRequire('/srv/halleus/current/package.json')('postgres')(env.DATABASE_URL,{max:1,connect_timeout:8,prepare:false});
(async()=>{
 try {
   const [facts]=await sql`
     select
       to_regclass('halleus_private.shop_payment_attempts') is not null as ledger,
       to_regclass('halleus_private.shop_bitpay_one_unresolved_per_order') is not null as one_unresolved,
       exists(select 1 from pg_catalog.pg_class c
         join pg_catalog.pg_namespace n on n.oid=c.relnamespace
         where n.nspname='halleus_private' and c.relname='shop_payment_attempts' and c.relrowsecurity) as rls,
       exists(select 1 from pg_catalog.pg_attribute a
         join pg_catalog.pg_class c on a.attrelid=c.oid
         join pg_catalog.pg_namespace n on n.oid=c.relnamespace
         where n.nspname='halleus_private' and c.relname='shop_payment_attempts'
         and a.attname='provider_transaction_id' and not a.attisdropped) as transaction_column
   `;
   if(!facts||Object.values(facts).some(x=>x!==true))throw new Error('incomplete_private_ledger');
   console.log(yes===flags.length?'already_enabled':'disabled');
 } catch {console.error('BITPAY_RESUME_HOLD: private ledger metadata verification failed');process.exitCode=4}
 finally {await sql.end({timeout:2})}
})().catch(()=>{console.error('BITPAY_RESUME_HOLD: PostgreSQL metadata probe failed');process.exitCode=4});
NODE_LEDGER
)" || fail 'Migration/ledger read-only verification failed.'
case "$gate_state" in disabled|already_enabled) ;; *) fail 'Unexpected live gate state.' ;; esac
printf 'BITPAY_RESUME: deployed_sha=%s ledger=PASS gate=%s\n' "$ACTIVE_SHA" "$gate_state"

# Previously approved production migration is not re-run. Confirm existing
# protected backup without dumping or changing any production data.
[ -d "$BACKUP_DIR" ] && [ "$(stat -c '%u:%a' "$BACKUP_DIR")" = '0:700' ] || fail 'Protected backup directory missing.'
shopt -s nullglob
archives=("$BACKUP_DIR"/before-bitpay-*.dump)
[ "${#archives[@]}" -gt 0 ] || fail 'Existing verified PostgreSQL backup not found.'
latest="${archives[0]}"
for archive in "${archives[@]}"; do
  [ "$archive" -nt "$latest" ] && latest="$archive"
done
[ -f "$latest" ] && [ ! -L "$latest" ] && [ "$(stat -c '%u:%a' "$latest")" = '0:600' ] || fail 'Backup archive metadata unsafe.'
[ "$(stat -c '%Y' "$latest")" -ge "$(( $(date +%s) - 86400 ))" ] || fail 'Verified backup is older than 24 hours.'
/usr/lib/postgresql/17/bin/pg_restore --list "$latest" >/dev/null 2>&1 || fail 'Saved backup archive failed validation.'
printf '%s\n' 'BITPAY_RESUME: existing_backup=PASS migration=RESUMED_PASS code_release=RESUMED_PASS'

http_probe 'before-local-payment' 200 8 'http://127.0.0.1:3000/shop/payment' || fail 'Live payment page not healthy before switching on.'
http_probe 'before-public-payment' 200 8 'https://halleus.ir/shop/payment' || fail 'Public payment page not healthy before switching on.'
if [ "$gate_state" = already_enabled ]; then
  http_probe 'already-enabled-callback' 409 8 'https://halleus.ir/api/shop/payments/bitpay/return' || fail 'Previously enabled callback is not secure.'
  printf '%s\n' 'BITPAY_RESUME: ONLINE_GATE_ENABLED=PASS (pre-existing); controlled charge still required'
  exit 0
fi

# Preserve entered API key on failed smoke in a root-only, non-active pending
# file so an HTTP retry does not ask the operator to reenter the merchant key.
# An existing staged file is accepted only if its non-BitPay env still matches.
if [ -e "$PENDING" ]; then
  [ -f "$PENDING" ] && [ ! -L "$PENDING" ] && [ "$(stat -c '%u:%a' "$PENDING")" = '0:600' ] || fail 'Private staged-key file unsafe.'
  base_hash="$(awk '!/^HALLEUS_BITPAY_/' "$ENV_FILE" | sha256sum | cut -d' ' -f1)"
  pending_hash="$(awk '!/^HALLEUS_BITPAY_/' "$PENDING" | sha256sum | cut -d' ' -f1)"
  [ "$base_hash" = "$pending_hash" ] || fail 'Private pending env no longer matches live environment.'
  for flag in HALLEUS_BITPAY_SOURCE_READY HALLEUS_BITPAY_LEDGER_READY HALLEUS_BITPAY_PAYMENTS_ENABLED; do
    grep -Fxq "$flag=true" "$PENDING" || fail 'Staged environment missing an enabled payment gate.'
  done
  printf '%s\n' 'BITPAY_RESUME: using existing root-only staged API key'
else
  read -r -s -p 'Paste BitPay.ir API key (hidden input, one time): ' api_key < /dev/tty
  printf '\n' > /dev/tty
  [[ "$api_key" =~ ^[A-Za-z0-9._-]{8,512}$ ]] || fail 'Invalid API key input; no environment changed.'
  TEMP_ENV="$(mktemp /etc/halleus/.halleus-bitpay-stage.XXXXXXXX)"
  chmod 0600 "$TEMP_ENV"
  awk '!/^HALLEUS_BITPAY_/' "$ENV_FILE" > "$TEMP_ENV" || fail 'Private env copy failed.'
  grep -q '^DATABASE_URL=' "$TEMP_ENV" || fail 'Private env copy lost database configuration.'
  {
    printf 'HALLEUS_BITPAY_SOURCE_READY=true\n'
    printf 'HALLEUS_BITPAY_LEDGER_READY=true\n'
    printf 'HALLEUS_BITPAY_PAYMENTS_ENABLED=true\n'
    printf 'HALLEUS_BITPAY_API_KEY=%s\n' "$api_key"
    printf 'HALLEUS_BITPAY_CALLBACK_SECRET=%s\n' "$(openssl rand -hex 32)"
  } >> "$TEMP_ENV"
  unset api_key
  chown root:root "$TEMP_ENV"
  mv -f -- "$TEMP_ENV" "$PENDING"
  TEMP_ENV=''
  printf '%s\n' 'BITPAY_RESUME: merchant_key_staged_privately=PASS'
fi

ORIGINAL_ENV="$(mktemp /etc/halleus/.halleus-bitpay-original.XXXXXXXX)"
install -m 0600 -o root -g root "$ENV_FILE" "$ORIGINAL_ENV"
ENV_ACTIVATED=1
install -m 0600 -o root -g root "$PENDING" "$ENV_FILE" || fail 'Failed to activate private environment.'
systemctl restart "$SERVICE" || fail 'Restart failed; environment rollback triggered.'

# Unlike the old script's single immediate curl, wait for the Next.js startup
# and independently verify both local/public payment paths and fail-closed callback.
http_probe 'active-local-homepage' 200 75 'http://127.0.0.1:3000/' || fail 'Local app did not start; rollback triggered.'
http_probe 'active-local-payment' 200 30 'http://127.0.0.1:3000/shop/payment' || fail 'Local payment page failed; rollback triggered.'
http_probe 'active-public-payment' 200 30 'https://halleus.ir/shop/payment' || fail 'Public payment route failed; rollback triggered.'
http_probe 'active-local-callback-invalid' 409 8 'http://127.0.0.1:3000/api/shop/payments/bitpay/return' --header 'x-halleus-shop-client-ip: 127.0.0.1' || fail 'Local callback did not fail closed; rollback triggered.'
http_probe 'active-public-callback-invalid' 409 8 'https://halleus.ir/api/shop/payments/bitpay/return' || fail 'Public callback did not fail closed; rollback triggered.'
systemctl is-active --quiet "$SERVICE" || fail 'Service no longer active; rollback triggered.'
[ "$(sed -n 's/^commit=//p' "$CURRENT/.halleus-release")" = "$ACTIVE_SHA" ] || fail 'Live release changed during activation.'
new_pid="$(systemctl show -P MainPID "$SERVICE")"
[[ "$new_pid" =~ ^[1-9][0-9]*$ ]] || fail 'Live service PID missing after restart.'
"$NODE" - "$new_pid" <<'NODE_VERIFY'
const {readFileSync}=require('node:fs');
const p=process.argv[2];
const env=Object.fromEntries(readFileSync(`/proc/${p}/environ`,'utf8').split('\0').filter(Boolean).map(x=>{
  const n=x.indexOf('=');return [x.slice(0,n),x.slice(n+1)];
}));
for(const flag of ['HALLEUS_BITPAY_SOURCE_READY','HALLEUS_BITPAY_LEDGER_READY','HALLEUS_BITPAY_PAYMENTS_ENABLED']) {
  if(env[flag]!=='true') process.exitCode=4;
}
if(typeof env.HALLEUS_BITPAY_API_KEY!=='string'||env.HALLEUS_BITPAY_API_KEY.length<8
   ||typeof env.HALLEUS_BITPAY_CALLBACK_SECRET!=='string'||Buffer.byteLength(env.HALLEUS_BITPAY_CALLBACK_SECRET)<32){
  process.exitCode=4;
}
if(process.exitCode)console.error('BITPAY_RESUME_HOLD: live payment secrets/flags missing');
NODE_VERIFY
ENV_ACTIVATED=0
rm -f -- "$ORIGINAL_ENV"
ORIGINAL_ENV=''
rm -f -- "$PENDING"
printf '%s\n' 'BITPAY_RESUME: ONLINE_GATE_ENABLED=PASS'
printf 'BITPAY_RESUME: active_sha=%s service=active callback_invalid=409 public_payment=200\n' "$ACTIVE_SHA"
printf '%s\n' 'BITPAY_RESUME: real_merchant_charge=NOT_TESTED; perform one controlled actual payment and confirm the order + provider settlement'
