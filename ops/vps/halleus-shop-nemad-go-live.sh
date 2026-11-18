#!/usr/bin/env bash
set -Eeuo pipefail
EXPECTED="${1:-}"
TAG="${2:-}"
RESUME_PREVIOUS=0
if [ "$#" -eq 3 ] && [ "${3:-}" = --resume-previous ]; then
  RESUME_PREVIOUS=1
elif [ "$#" -ne 2 ]; then
  echo 'Usage: bash ops/vps/halleus-shop-nemad-go-live.sh <full-commit-sha> <version-tag> [--resume-previous]' >&2
  exit 2
fi
[[ "$EXPECTED" =~ ^[0-9a-f]{40}$ ]] && [[ "$TAG" =~ ^v[0-9A-Za-z._-]+$ ]] || {
  echo 'SAFETY_FATAL: invalid expected commit or tag' >&2
  exit 2
}
cd /srv/halleus/source
[ "$(git branch --show-current)" = main ] || { echo 'SAFETY_FATAL: not main'; exit 2; }
case "$(git remote get-url origin)" in
  https://github.com/bleucluod/astro-clean|https://github.com/bleucluod/astro-clean.git|git@github.com:bleucluod/astro-clean.git) ;;
  *) echo 'SAFETY_FATAL: wrong origin'; exit 2 ;;
esac
[ -z "$(git status --porcelain=v1 --untracked-files=normal)" ] || { echo 'SAFETY_FATAL: source is dirty'; exit 2; }
git fetch --tags --prune origin
git pull --ff-only origin main
if [ "$RESUME_PREVIOUS" -eq 1 ]; then
  # Resume only the already-built, smoke-verified f217 release preserved as previous.
  [ "$EXPECTED" = f2178589288b8238863f63467d61557c5f442436 ] || { echo 'SAFETY_FATAL: unexpected resume commit'; exit 2; }
  [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || { echo 'SAFETY_FATAL: stale source'; exit 2; }
  [ "$(git rev-parse HEAD^)" = "$EXPECTED" ] || { echo 'SAFETY_FATAL: unexpected resume ancestry'; exit 2; }
  [ "$(git diff-tree --no-commit-id --name-only -r HEAD)" = ops/vps/halleus-shop-nemad-go-live.sh ] || {
    echo 'SAFETY_FATAL: resume commit changed application code'; exit 2;
  }
  CURRENT_RELEASE="$(readlink -f /srv/halleus/current)"
  PREVIOUS_RELEASE="$(readlink -f /srv/halleus/previous)"
  [ "$CURRENT_RELEASE" = /srv/halleus/releases/v0.1.490-chart-mobile-editorial-20261115-5c8969b7751d ] || {
    echo 'SAFETY_FATAL: current release changed'; exit 2;
  }
  case "$PREVIOUS_RELEASE" in /srv/halleus/releases/*) ;; *) echo 'SAFETY_FATAL: unexpected previous release path'; exit 2;; esac
  [ -f "$PREVIOUS_RELEASE/.halleus-release" ] && [ -f "$PREVIOUS_RELEASE/.next/BUILD_ID" ] || {
    echo 'SAFETY_FATAL: preserved candidate is incomplete'; exit 2;
  }
  [ "$(sed -n 's/^commit=//p' "$PREVIOUS_RELEASE/.halleus-release")" = "$EXPECTED" ] || {
    echo 'SAFETY_FATAL: preserved candidate commit differs'; exit 2;
  }
  [ "$(sed -n 's/^tag=//p' "$PREVIOUS_RELEASE/.halleus-release")" = "$TAG" ] || {
    echo 'SAFETY_FATAL: preserved candidate tag differs'; exit 2;
  }
  [ "$(git -C "$PREVIOUS_RELEASE" rev-parse HEAD)" = "$EXPECTED" ] || {
    echo 'SAFETY_FATAL: preserved candidate worktree differs'; exit 2;
  }
  echo 'NEMAD_PRESERVED_RELEASE=VERIFIED'
else
  [ "$(git rev-parse HEAD)" = "$EXPECTED" ] || { echo 'SAFETY_FATAL: unexpected HEAD'; exit 2; }
fi
[ "$(git rev-list -n 1 "$TAG")" = "$EXPECTED" ] || { echo 'SAFETY_FATAL: tag/commit mismatch'; exit 2; }
sudo bash ops/vps/halleus-release.sh status
sudo nginx -T 2>/dev/null | grep -E 'proxy_set_header[[:space:]]+X-Halleus-Shop-Client-IP[[:space:]]+\$remote_addr[[:space:]]*;' >/dev/null || {
  echo 'EXTERNAL_BLOCK: Nginx trusted client-IP overwrite missing' >&2
  exit 3
}
probe="$(sudo bash ops/vps/halleus-shop-stage1-runtime-db-readonly.sh)"
printf '%s\n' "$probe"
grep -q '^db_probe=READONLY_METADATA_PASS$' <<< "$probe" || { echo 'EXTERNAL_BLOCK: DB runtime probe'; exit 3; }
sudo bash -e <<'ROOT'
set -Eeuo pipefail
[ -f /etc/halleus/halleus.env ] && [ ! -L /etc/halleus/halleus.env ] || { echo 'SAFETY_FATAL: env file'; exit 2; }
set -a
source /etc/halleus/halleus.env
set +a
[ "${HALLEUS_SHOP_SHARED_RATE_ENABLED:-}" = true ] || { echo 'EXTERNAL_BLOCK: shared rate guard'; exit 3; }
[ "${HALLEUS_SHOP_TRUSTED_CLIENT_IP:-}" = nginx-overwrite-v1 ] || { echo 'EXTERNAL_BLOCK: nginx IP trust contract'; exit 3; }
[ -n "${HALLEUS_SHOP_RATE_SECRET:-}" ] || { echo 'EXTERNAL_BLOCK: rate secret unavailable'; exit 3; }
for name in HALLEUS_SHOP_PRINT_ORIGINALS_DIR HALLEUS_SHOP_PRINT_ARCHIVE_ROOT; do
  value="${!name:-}"
  [ -n "$value" ] && [ -d "$value" ] && [ ! -L "$value" ] || { echo "EXTERNAL_BLOCK: $name missing or unsafe"; exit 3; }
done
/usr/local/bin/node <<'JS'
'use strict';
const {createRequire} = require('node:module');
if (Buffer.byteLength(process.env.HALLEUS_SHOP_RATE_SECRET || '', 'utf8') < 32) {
  console.error('EXTERNAL_BLOCK: rate secret too short'); process.exit(3);
}
const url = process.env.DATABASE_URL;
if (!url) { console.error('EXTERNAL_BLOCK: runtime DB URL missing'); process.exit(3); }
const postgres = createRequire('/srv/halleus/current/package.json')('postgres');
const sql = postgres(url, {max:1, idle_timeout:2, connect_timeout:8, prepare:false});
(async () => {
  const rows = await sql.unsafe(`
    select c.relname as relation, con.conname as name,
      pg_get_constraintdef(con.oid) as definition
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class c on c.oid=con.conrelid
    join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='halleus_private' and (
      (c.relname='shop_price_overrides' and con.conname='shop_price_overrides_product_id_check')
      or (c.relname='shop_price_change_events' and con.conname='shop_price_change_events_product_id_check')
    )
  `);
  if (rows.length !== 2 || rows.some(row => !String(row.definition).includes("'nm'"))) {
    throw new Error('0043 shared NM price constraints not verified');
  }
  console.log('SHOP_NM_DB_CONTRACT=PASS');
})().catch(err => { console.error('EXTERNAL_BLOCK:', err.message); process.exitCode=3; })
 .finally(() => sql.end({timeout:2}));
JS
ROOT
if [ "$RESUME_PREVIOUS" -eq 1 ]; then
  sudo test -s /root/halleus-bitpay-preflight/nemad-0043-20261118T170416Z-458991.dump || {
    echo 'SAFETY_FATAL: original pre-migration backup missing'; exit 2;
  }
  sudo /usr/lib/postgresql/17/bin/pg_restore --list /root/halleus-bitpay-preflight/nemad-0043-20261118T170416Z-458991.dump >/dev/null || {
    echo 'SAFETY_FATAL: original backup cannot be read'; exit 2;
  }
fi
echo 'HALLEUS_SHOP_RELEASE_PREFLIGHT=PASS'
read -r -p 'Confirm bank/card/IBAN recipient and manual print process (type PAYEE_PRINT_VERIFIED): ' approval
[ "$approval" = PAYEE_PRINT_VERIFIED ] || { echo 'SAFETY_FATAL: owner confirmation required'; exit 2; }
if [ "$RESUME_PREVIOUS" -eq 1 ]; then
  # Official engine performs a full restart and smoke before flipping sales flags.
  sudo bash ops/vps/halleus-release.sh rollback
  [ "$(sed -n 's/^commit=//p' /srv/halleus/current/.halleus-release)" = "$EXPECTED" ] || {
    echo 'SAFETY_FATAL: official rollback did not activate the preserved candidate'; exit 2;
  }
  echo 'NEMAD_EXISTING_RELEASE_REACTIVATED=PASS'
else
  sudo bash ops/vps/halleus-release.sh deploy --commit "$EXPECTED" --tag "$TAG" --skip-wiki-maintenance
fi
if ! sudo bash -e <<'ACTIVATE'
set -Eeuo pipefail
ENV_FILE=/etc/halleus/halleus.env
[ -f "$ENV_FILE" ] && [ ! -L "$ENV_FILE" ] || exit 2
set -a
source "$ENV_FILE"
set +a
[ "${HALLEUS_SHOP_SHARED_RATE_ENABLED:-}" = true ] || exit 3
[ "${HALLEUS_SHOP_TRUSTED_CLIENT_IP:-}" = nginx-overwrite-v1 ] || exit 3
backup="$(mktemp /etc/halleus/halleus.env.nemad-before-go-live.XXXXXXXX)"
cp -p "$ENV_FILE" "$backup"
chmod 0600 "$backup"
rollback_env() {
  local rc=$?
  if [ "$rc" -ne 0 ]; then
    cp -p -- "$backup" "$ENV_FILE" || true
    chmod 0600 "$ENV_FILE" || true
    systemctl restart halleus.service || true
    echo 'SAFETY_FATAL: NM go-live failed, env restored' >&2
  fi
}
trap rollback_env EXIT
printf '\n# Owner-approved Nemad Man 12-month shop go-live\nHALLEUS_SHOP_MVP_ENABLED=true\nHALLEUS_SHOP_NEMAD_ORDERS_ENABLED=true\n' >> "$ENV_FILE"
chmod 0600 "$ENV_FILE"
systemctl restart halleus.service
systemctl is-active --quiet halleus.service
# systemd "active" does not imply that Next.js is already listening.
# Poll the exact local product route before sending public sales smoke traffic.
ready=0
status=000
for attempt in $(seq 1 45); do
  status="$(curl -s --max-time 8 -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/shop/farvardin-sign || true)"
  if [ "$status" = 200 ]; then ready=1; break; fi
  sleep 1
done
[ "$ready" -eq 1 ] || { echo "FAIL: NM local readiness HTTP $status" >&2; exit 3; }
echo 'NEMAD_LOCAL_READINESS=PASS'
for slug in farvardin ordibehesht khordad tir mordad shahrivar mehr aban azar dey bahman esfand; do
  status="$(curl -sS -L --max-time 25 -o /dev/null -w '%{http_code}' "https://halleus.ir/shop/${slug}-sign")"
  [ "$status" = 200 ] || { echo "FAIL: ${slug}-sign HTTP $status"; exit 3; }
done
status="$(curl -sS -L --max-time 25 -o /dev/null -w '%{http_code}' https://halleus.ir/chart)"
[ "$status" = 200 ] || { echo "FAIL: chart HTTP $status"; exit 3; }
status="$(curl -sS --max-time 25 -o /dev/null -w '%{http_code}' -X POST \
  -H 'Content-Type: application/json' -H 'Origin: https://halleus.ir' \
  --data '{"carrier":"post","items":[{"productId":"nm","size":"10x15","quantity":1}]}' \
  https://halleus.ir/api/shop/quote)"
[ "$status" = 200 ] || { echo "FAIL: NM quote HTTP $status"; exit 3; }
status="$(curl -sS --max-time 25 -o /dev/null -w '%{http_code}' -X POST \
  -H 'Content-Type: application/json' -H 'Origin: https://halleus.ir' \
  --data '{"carrier":"post","items":[{"productId":"p03","size":"10x15","quantity":1}]}' \
  https://halleus.ir/api/shop/quote)"
[ "$status" = 400 ] || { echo "FAIL: closed P03 HTTP $status"; exit 3; }
trap - EXIT
echo 'HALLEUS_NEMAD_12_MONTH_GO_LIVE=PASS'
echo "PRIVATE_ENV_ROLLBACK_COPY=$backup"
ACTIVATE
then
  echo 'Shop activation failed; restoring previous release via official engine.' >&2
  # Never switch again if the official engine already restored the old release.
  if [ "$(sed -n 's/^commit=//p' /srv/halleus/current/.halleus-release 2>/dev/null)" = "$EXPECTED" ]; then
    sudo bash ops/vps/halleus-release.sh rollback || true
  fi
  exit 1
fi
sudo bash ops/vps/halleus-release.sh status
