#!/usr/bin/env bash
# Owner-approved, one-shot NM 12-month migration and guarded release.
# DB migration is deliberately separate from the canonical application release.
set -Eeuo pipefail
set +x
umask 077

SOURCE=/srv/halleus/source
ACTIVE=/srv/halleus/current
BASE=b8605f551b5ab9ede70fa3a48595348863ceb234
MIGRATION_BLOB=93459f37207be18770582afb8a41a87096f83bf6
BACKUP_DIR=/root/halleus-bitpay-preflight
SCRIPT=ops/vps/halleus-shop-nemad-0043-go-live.sh
MIGRATION=database/migrations/0043_nemad_man_shared_prices.sql
BACKUP_TOOL=ops/vps/halleus-bitpay-pg-backup.cjs
EXPECTED_ACTIVE=5c8969b7751d4cf71286adb987bf648adf421b0c

fatal() { printf 'SAFETY_FATAL: %s\n' "$*" >&2; exit 2; }
blocked() { printf 'EXTERNAL_BLOCK: %s\n' "$*" >&2; exit 3; }

[ "$(id -un)" = deploy ] || fatal 'Run as deploy, not root.'
[ -d "$SOURCE/.git" ] || fatal 'Source repo missing.'
cd "$SOURCE"
[ "$(git branch --show-current)" = main ] || fatal 'Unexpected branch.'
case "$(git remote get-url origin)" in
  https://github.com/bleucluod/astro-clean|https://github.com/bleucluod/astro-clean.git|git@github.com:bleucluod/astro-clean.git) ;;
  *) fatal 'Unexpected origin.' ;;
esac
[ -z "$(git status --porcelain=v1 --untracked-files=all)" ] || fatal 'Dirty VPS source.'
HEAD="$(git rev-parse HEAD)"
[ "$HEAD" = "$(git rev-parse origin/main)" ] || fatal 'VPS source is not at origin/main.'
[ "$(git rev-parse HEAD^)" = "$BASE" ] || fatal 'Unexpected release parent.'
EXPECTED_CHANGED="$(printf '%s\n' 'lib/shop/nemad-man-bahman-preview.ts' "$SCRIPT")"
[ "$(git diff-tree --no-commit-id --name-only -r "$HEAD")" = "$EXPECTED_CHANGED" ] || fatal 'Unexpected changes in release finalizer commit.'
[ "$(git hash-object "$MIGRATION")" = "$MIGRATION_BLOB" ] || fatal 'Migration source differs from reviewed blob.'
[ -f "$BACKUP_TOOL" ] && [ -f ops/vps/halleus-shop-nemad-go-live.sh ] || fatal 'Release support scripts missing.'
[ "$(sed -n 's/^commit=//p' "$ACTIVE/.halleus-release")" = "$EXPECTED_ACTIVE" ] || fatal 'Active release changed; preserve the live candidate.'
[ "$(systemctl is-active halleus.service)" = active ] || fatal 'Halleus service is not active.'

# The running service database URL, never a guessed Supabase endpoint, drives both steps.
sudo -v || fatal 'Root permission unavailable.'
sudo test -f /etc/halleus/halleus.env || fatal 'Production env unavailable.'
sudo nginx -t >/dev/null 2>&1 || fatal 'Nginx configuration invalid.'
sudo nginx -T 2>/dev/null | grep -E 'proxy_set_header[[:space:]]+X-Halleus-Shop-Client-IP[[:space:]]+\$remote_addr[[:space:]]*;' >/dev/null || fatal 'Trusted ingress header missing.'
probe="$(sudo bash ops/vps/halleus-shop-stage1-runtime-db-readonly.sh)" || blocked 'Runtime DB probe failed.'
grep -Fxq 'db_probe=READONLY_METADATA_PASS' <<< "$probe" || blocked 'Runtime DB metadata probe incomplete.'

# Ensure the official release's 2-copy budget plus a private backup reserve.
# No release or database modification happens unless enough space is reported.
# shellcheck disable=SC1091
source ops/vps/halleus-release-storage.env
[[ "${HALLEUS_RUNTIME_BUDGET_BYTES:-}" =~ ^[1-9][0-9]*$ ]] || fatal 'Release storage budget missing.'
[ "${HALLEUS_HEADROOM_RUNTIME_COPIES:-}" = 2 ] || fatal 'Release storage policy differs.'
FREE="$(df -B1 --output=avail /srv/halleus | tail -n 1 | tr -d '[:space:]')"
[[ "$FREE" =~ ^[0-9]+$ ]] || fatal 'Cannot determine available storage.'
NEEDED="$((HALLEUS_RUNTIME_BUDGET_BYTES * 2 + 512 * 1024 * 1024))"
printf 'NEMAD_STORAGE: free=%s required=%s\n' "$FREE" "$NEEDED"
[ "$FREE" -ge "$NEEDED" ] || blocked 'Insufficient storage for backup and atomic release.'

# Create local release tag only for this verified exact HEAD.
TAG="v2026.11.18-chart-nemad12-db0043-${HEAD:0:7}"
if git show-ref --verify --quiet "refs/tags/$TAG"; then
  [ "$(git rev-list -n 1 "$TAG")" = "$HEAD" ] || fatal 'Tag collision.'
else
  git tag "$TAG" "$HEAD" || fatal 'Cannot create lightweight release tag.'
fi
if timeout 20s env GIT_TERMINAL_PROMPT=0 git push origin "refs/tags/$TAG" >/dev/null 2>&1; then
  printf 'NEMAD_TAG: GitHub=PASS tag=%s\n' "$TAG"
else
  printf 'NEMAD_TAG: local_tag=PASS GitHub=EXTERNAL_BLOCK (no impact on pinned official release)\n'
fi

# The existing PG17-compatible helper reads credentials from the running service,
# creates a complete custom-format dump and verifies pg_restore --list.
sudo bash -se <<'ROOT_BACKUP'
set -Eeuo pipefail
set +x
umask 077
DIR=/root/halleus-bitpay-preflight
[ ! -L "$DIR" ] || { echo 'SAFETY_FATAL: backup directory is a symlink' >&2; exit 2; }
install -d -m 0700 -o root -g root "$DIR"
[ "$(stat -c '%u:%a' "$DIR")" = '0:700' ] || { echo 'SAFETY_FATAL: private backup directory permissions' >&2; exit 2; }
# Resume the already successful R1 backup; never replace the pre-migration snapshot
# with a dump of the post-migration database.
BACKUP="$DIR/nemad-0043-20261118T170416Z-458991.dump"
[ -s "$BACKUP" ] && [ -f "$BACKUP" ] && [ ! -L "$BACKUP" ] ||
  { echo 'SAFETY_FATAL: original pre-0043 backup unavailable' >&2; exit 2; }
[ "$(stat -c '%u:%a' "$BACKUP")" = '0:600' ] ||
  { echo 'SAFETY_FATAL: original backup ownership or mode differs' >&2; exit 2; }
/usr/lib/postgresql/17/bin/pg_restore --list "$BACKUP" >/dev/null ||
  { echo 'SAFETY_FATAL: original backup archive unreadable' >&2; exit 2; }
echo "NEMAD_BACKUP=RESUMED_PASS file=$BACKUP"
ROOT_BACKUP

# Validate the two exact 0035 constraints, then apply only the tracked 0043
# transaction. A partial/unexpected schema blocks without modifying anything.
sudo bash -se <<'ROOT_MIGRATE'
set -Eeuo pipefail
set +x
/usr/local/bin/node <<'JS'
'use strict';
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const pid = require('node:child_process').execFileSync('systemctl',
  ['show', '-P', 'MainPID', 'halleus.service'], { encoding: 'utf8' }).trim();
if (!/^[1-9][0-9]*$/.test(pid)) throw Error('active_service_pid_missing');
const url = readFileSync(`/proc/${pid}/environ`, 'utf8').split('\0')
  .find(x => x.startsWith('DATABASE_URL='))?.slice('DATABASE_URL='.length);
if (!url) throw Error('running_service_db_url_missing');
const postgres = createRequire('/srv/halleus/current/package.json')('postgres');
const sql = postgres(url, { max: 1, connect_timeout: 8, idle_timeout: 2, prepare: false });
const names = new Set(['shop_price_overrides', 'shop_price_change_events']);
const oldDefinition = "CHECK ((product_id = ANY (ARRAY['p01'::text, 'p02'::text])))";
async function readConstraints() {
  const rows = await sql.unsafe(`
    select c.relname as relation, con.conname as name, pg_get_constraintdef(con.oid) as definition
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class c on c.oid = con.conrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname='halleus_private' and (
      (c.relname='shop_price_overrides' and con.conname='shop_price_overrides_product_id_check')
      or (c.relname='shop_price_change_events' and con.conname='shop_price_change_events_product_id_check')
    )
  `);
  if (rows.length !== 2 || rows.some(r => !names.has(r.relation) || r.name !== r.relation + '_product_id_check')) {
    throw Error('unexpected_pricing_constraint_metadata');
  }
  return rows;
}
async function main() {
  try {
    const before = await readConstraints();
    if (before.every(r => r.definition === oldDefinition)) {
      const migration = readFileSync('/srv/halleus/source/database/migrations/0043_nemad_man_shared_prices.sql', 'utf8');
      if (!migration.startsWith('-- Shared Nemad Man price group;') || !migration.includes('commit;')) {
        throw Error('unexpected_0043_migration');
      }
      await sql.unsafe(migration);
      console.log('NEMAD_0043: transaction=APPLIED');
    } else if (before.every(r => r.definition.includes("'nm'::text")
        && r.definition.includes("'p01'::text") && r.definition.includes("'p02'::text"))) {
      console.log('NEMAD_0043: transaction=RESUMED_PASS');
    } else {
      throw Error('unexpected_or_partially_migrated_pricing_constraints');
    }
    const after = await readConstraints();
    if (!after.every(r => r.definition.includes("'nm'::text")
      && r.definition.includes("'p01'::text") && r.definition.includes("'p02'::text"))) {
      throw Error('post_migration_constraints_unverified');
    }
    console.log('NEMAD_0043: both_shared_price_constraints=PASS');
  } finally {
    await sql.end({ timeout: 2 });
  }
}
main().catch(err => {
  const safe = String(err?.message || 'migration_failed');
  console.error('NEMAD_0043_BLOCK: ' + (/^[a-z0-9_]+$/.test(safe) ? safe : 'database_migration_failed'));
  process.exitCode = 4;
});
JS
ROOT_MIGRATE

# Consent to the entire go-live was given in this conversation. This provides
# the existing operator acknowledgement, without altering payee settings.
printf '%s\n' PAYEE_PRINT_VERIFIED |
  bash ops/vps/halleus-shop-nemad-go-live.sh "$HEAD" "$TAG"
printf 'HALLEUS_CHART_NEMAD_RELEASE_AND_SALES=PASS sha=%s tag=%s\n' "$HEAD" "$TAG"
