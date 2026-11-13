#!/usr/bin/env bash
set -Eeuo pipefail
set +x
umask 077

repo=/srv/halleus/source
engine="$repo/ops/vps/halleus-release.sh"
base=eee77ac98411fb9ef9f1ab40005edb98d1f2785d
tested=e5faf2dbd3eb759020e48fb415355aa79c92975d
failed_release=d9e01036200b888ab81d1804fea51534e55b05d0
logs=/root/halleus-advanced-analytics-qa-7b2df0f3b3b6
migration="$repo/database/migrations/0041_analytics_engagement_and_hourly.sql"
node=/usr/local/bin/node

fail() { printf 'HALLEUS_ANALYTICS_RELEASE_HOLD: %s\n' "$*" >&2; exit 1; }
g() { runuser -u deploy -- git -C "$repo" "$@"; }
pin="$(g rev-parse HEAD)"
tag="v0.1.analytics-advanced-${pin:0:12}"

exec 8>/run/lock/halleus-analytics-release.lock
flock -n 8 || fail 'another analytics release in progress'
( exec 9>/run/lock/halleus-release.lock; flock -n 9 ) || fail 'official release already running'

[ "$EUID" -eq 0 ] || fail 'root required'
[ -f "$engine" ] && [ -x "$node" ] || fail 'release engine or Node missing'
[ -L /srv/halleus/current ] && [ -L /srv/halleus/previous ] || fail 'release links missing'
[ "$(g branch --show-current)" = main ] || fail 'wrong branch'
case "$(g remote get-url origin)" in
  https://github.com/bleucluod/astro-clean|https://github.com/bleucluod/astro-clean.git|git@github.com:bleucluod/astro-clean.git) ;;
  *) fail 'wrong origin';;
esac
[ -z "$(g status --porcelain=v1 --untracked-files=all)" ] || fail 'dirty source'
[ "$(g rev-parse "$pin^")" = "$failed_release" ] || fail 'release resume must be one commit after failed release'
expected_changes="$(printf '%s\n' ops/vps/halleus-analytics-release.sh ops/vps/halleus-release-storage.env scripts/check-vps-release-workflow.mjs)"
[ "$(g diff --name-only "$failed_release" "$pin")" = "$expected_changes" ] || fail 'release resume changes exceed approved files'
[ "$(g hash-object "$repo/ops/vps/halleus-analytics-release.sh")" = "$(g rev-parse "$pin:ops/vps/halleus-analytics-release.sh")" ] || fail 'runner differs from tracked source'
[ "$(g hash-object "$migration")" = 245346956fecee3cd896962f9f1e1fbef8bcaf38 ] || fail 'migration content mismatch'
[ "$(stat -c '%u:%a' /etc/halleus/halleus.env)" = 0:600 ] || fail 'private environment permissions'
active="$(sed -n 's/^commit=//p' /srv/halleus/current/.halleus-release)"
[ "$active" = "$base" ] || fail "unexpected active release $active"
[ -f /srv/halleus/previous/.halleus-release ] || fail 'previous release invalid'
[ "$(readlink -f /srv/halleus/current)" != "$(readlink -f /srv/halleus/previous)" ] || fail 'current equals previous'
systemctl is-active --quiet halleus.service || fail 'service inactive'
for name in ANALYTICS PRIVACY GA4 LINT TYPESCRIPT; do
  [ -f "$logs/PASS_R2_$name" ] || fail "missing R2 QA pass: $name"
done

g fetch origin main --tags || fail 'GitHub fetch failed'
[ "$(g rev-parse origin/main)" = "$pin" ] || fail 'GitHub main differs from approved pin'
[ -z "$(g status --porcelain=v1 --untracked-files=all)" ] || fail 'dirty after fetch'
g --no-pager diff --check "$base" "$pin" || fail 'diff check failed'
echo 'SAFETY_GATE=PASS'

echo '=== RELEASE POLICY GUARD ==='
runuser -u deploy -- bash -c 'cd "$1" && "$2" scripts/check-vps-release-workflow.mjs' _ "$repo" "$node" || fail 'storage policy guard failed'

# Official release storage policy and room for a private DB backup.
# shellcheck disable=SC1090
source "$repo/ops/vps/halleus-release-storage.env"
[ "${HALLEUS_HEADROOM_RUNTIME_COPIES:-}" = 2 ] || fail 'storage contract changed'
[ "${HALLEUS_KEEP_RELEASES:-}" = 2 ] || fail 'release retention changed'
[[ "${HALLEUS_RUNTIME_BUDGET_BYTES:-}" =~ ^[1-9][0-9]*$ ]] || fail 'storage limit invalid'
available="$(df -B1 --output=avail /srv/halleus | tail -n 1 | tr -d '[:space:]')"
required="$((HALLEUS_RUNTIME_BUDGET_BYTES * 2 + 536870912))"
[ "$available" -ge "$required" ] || fail "not enough disk for release and DB backup"
[ "$(df -B1 --output=avail /root | tail -n 1 | tr -d '[:space:]')" -ge 536870912 ] || fail 'backup disk low'
pid="$(systemctl show -P MainPID halleus.service)"
[[ "$pid" =~ ^[1-9][0-9]*$ ]] && [ -r "/proc/$pid/environ" ] || fail 'cannot read live service environment'

db_stage() {
  "$node" - "$1" "$pid" "$migration" <<'NODE'
'use strict';
const fs = require('node:fs');
const { createRequire } = require('node:module');
const [mode, pid, path] = process.argv.slice(2);
const raw = fs.readFileSync('/proc/' + pid + '/environ', 'utf8')
  .split('\0').find(s => s.startsWith('DATABASE_URL='));
if (!raw) { console.error('DB_HOLD: runtime DATABASE_URL unavailable'); process.exit(2); }
const pg = createRequire('/srv/halleus/current/package.json')('postgres');
const sql = pg(raw.slice('DATABASE_URL='.length), { max: 1, connect_timeout: 8, prepare: false });
const base = {
  wiki_shop_showcase_daily_metrics: ['showcase_id','product_id','day','impressions','clicks'],
  analytics_live_sessions: ['session_id','source','area','page_path','last_seen'],
  analytics_daily: ['day','page_path','source','views','sessions','product_clicks','chart_starts','checkout_starts'],
  analytics_seen_daily: ['day','session_id','page_path'],
};
const additions = {
  analytics_live_sessions: ['last_engagement_at','visitor_kind','campaign'],
  analytics_daily: ['active_seconds','entrances','new_visits','returning_visits','campaign_visits',
    'scroll_50','scroll_90','internal_clicks','chart_completions','compare_starts','compare_completions'],
  analytics_minute_presence: ['minute','session_id','area'],
  analytics_page_progress: ['day','session_id','page_path','max_scroll'],
  analytics_hourly: ['hour','area','views','active_seconds','product_clicks'],
};
const newTables = ['analytics_minute_presence','analytics_page_progress','analytics_hourly'];
const baseIndexes = ['wiki_showcase_daily_metrics_day_idx','analytics_live_sessions_seen_idx',
  'analytics_daily_page_idx','analytics_seen_daily_day_idx'];
const newIndexes = ['analytics_minute_presence_minute_idx','analytics_page_progress_day_idx'];
async function inspect() {
  const rows = await sql`select c.relname as tbl, c.relrowsecurity as rls, a.attname as col
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
    where n.nspname='halleus_private' and c.relkind in ('r','p')`;
  const indexes = new Set((await sql`select indexname from pg_indexes where schemaname='halleus_private'`)
    .map(r => r.indexname));
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.tbl)) map.set(r.tbl, { columns:new Set(), rls:r.rls });
    map.get(r.tbl).columns.add(r.col);
  }
  for (const [name, cols] of Object.entries(base)) {
    const t=map.get(name);
    if (!t || !t.rls || cols.some(c=>!t.columns.has(c))) throw Error('base_0039_0040_schema_missing');
  }
  if (baseIndexes.some(i=>!indexes.has(i))) throw Error('base_0039_0040_index_missing');
  let present=0, total=0;
  for (const [name, cols] of Object.entries(additions)) {
    const t=map.get(name);
    for (const col of cols) { total++; if (t?.columns.has(col)) present++; }
  }
  const newTablesValid = newTables.every(n => map.get(n)?.rls);
  const newIndexesValid = newIndexes.every(n=>indexes.has(n));
  if (present === 0 && newTables.every(n=>!map.has(n)) && newIndexes.every(n=>!indexes.has(n))) return 'NOT_APPLIED';
  if (present === total && newTablesValid && newIndexesValid) return 'APPLIED';
  throw Error('partial_or_invalid_0041_schema_manual_review');
}
(async()=>{
  const before=await inspect();
  console.log('ANALYTICS_DB: base_0039_0040=PASS migration_0041=' + before);
  if(mode==='apply' && before==='NOT_APPLIED') {
    const migration = fs.readFileSync(path, 'utf8');
    if(!migration.startsWith('-- Halleus analytics: additive active-engagement, hourly trends and temporary presence.')
       || !migration.trimEnd().endsWith('commit;')) throw Error('migration_contract_mismatch');
    await sql.unsafe(migration);
    console.log('ANALYTICS_DB: migration_0041=EXECUTED');
  }
  if(mode==='apply') {
    const after=await inspect();
    if(after!=='APPLIED') throw Error('migration_verification_failed');
    console.log('ANALYTICS_DB: migration_0041=PASS');
  }
})().catch(e => {
  const message = String(e?.message || 'error');
  const safe = /^[a-z0-9_]+$/.test(message) ? message : 'database_preflight_or_migration_error';
  console.error('ANALYTICS_DB_HOLD: ' + safe + ' code=' + String(e?.code || 'unknown').replace(/[^a-zA-Z0-9_]/g,'').slice(0,20));
  process.exitCode=1;
}).finally(()=>sql.end({ timeout: 3 }));
NODE
}

echo '=== DATABASE READ-ONLY PREFLIGHT ==='
db_result="$(db_stage check)" || fail 'base schema or database inspection invalid; no mutation'
printf '%s\n' "$db_result"
case "$db_result" in
  *'migration_0041=APPLIED') already_applied=1 ;;
  *'migration_0041=NOT_APPLIED') already_applied=0 ;;
  *) fail 'unexpected migration state' ;;
esac

# Existing, audited runtime-PID pg_dump helper; archive is root-only.
backup_dir=/root/halleus-bitpay-preflight
install -d -m 0700 -o root -g root "$backup_dir"
backup=''
echo '=== VERIFIED DATABASE BACKUP ==='
if [ "$already_applied" -eq 1 ] && [ -x /usr/lib/postgresql/17/bin/pg_restore ]; then
  shopt -s nullglob
  for prior in "$backup_dir"/before-analytics-*.dump; do
    [ -f "$prior" ] && [ ! -L "$prior" ] && [ -s "$prior" ] || continue
    [ "$(stat -c '%u:%a' "$prior")" = 0:600 ] || continue
    /usr/lib/postgresql/17/bin/pg_restore --list "$prior" >/dev/null 2>&1 || continue
    if [ -z "$backup" ] || [ "$prior" -nt "$backup" ]; then backup="$prior"; fi
  done
  shopt -u nullglob
fi
if [ -n "$backup" ]; then
  echo 'ANALYTICS_DB_BACKUP=RESUMED_PASS'
else
  backup="$backup_dir/before-analytics-$(date -u +%Y%m%dT%H%M%SZ)-$$.dump"
  [ ! -e "$backup" ] || fail 'backup filename collision'
  "$node" "$repo/ops/vps/halleus-bitpay-pg-backup.cjs" "$pid" "$backup" || fail 'database backup or pg_restore verification failed'
  [ -s "$backup" ] && [ "$(stat -c '%u:%a' "$backup")" = 0:600 ] || fail 'backup archive permissions or size invalid'
  echo 'ANALYTICS_DB_BACKUP=PASS'
fi

echo '=== ADDITIVE DATABASE MIGRATION ==='
[ "$(sed -n 's/^commit=//p' /srv/halleus/current/.halleus-release)" = "$base" ] || fail 'active release changed before migration'
systemctl is-active --quiet halleus.service || fail 'service stopped before migration'
if [ "$already_applied" -eq 1 ]; then
  echo 'ANALYTICS_DB: migration_0041=RESUMED_PASS'
else
  db_stage apply || fail 'migration failed; code not deployed; archive preserved'
fi

# Register exactly one immutable release tag after DB verification.
echo '=== RELEASE TAG ==='
if ! g show-ref --verify --quiet "refs/tags/$tag"; then
  g tag "$tag" "$pin" || fail 'local tag failed'
fi
[ "$(g rev-list -n 1 "$tag")" = "$pin" ] || fail 'tag collision'
g push origin "refs/tags/$tag" || fail 'GitHub tag push failed; migration already applied'

# Never bypass the canonical release engine. No Wiki production-data repair.
echo '=== OFFICIAL RELEASE ==='
[ "$(sed -n 's/^commit=//p' /srv/halleus/current/.halleus-release)" = "$base" ] || fail 'active release changed before deploy'
bash "$engine" deploy --commit "$pin" --tag "$tag" --skip-wiki-maintenance || fail 'official release failed; inspect active/previous before retry'
[ "$(sed -n 's/^commit=//p' /srv/halleus/current/.halleus-release)" = "$pin" ] || fail 'active SHA mismatch'
[ "$(sed -n 's/^commit=//p' /srv/halleus/previous/.halleus-release)" = "$base" ] || fail 'previous SHA mismatch'
systemctl is-active --quiet halleus.service || fail 'service inactive after deploy'

failures=()
for spec in '200 https://halleus.ir/' '200 https://halleus.ir/wiki' '200 https://halleus.ir/shop'; do
  expected="${spec%% *}"; url="${spec#* }"
  actual="$(curl --silent --show-error --max-time 15 -o /dev/null -w '%{http_code}' "$url" || true)"
  [ "$actual" = "$expected" ] || failures+=("$url:$actual")
done
code="$(curl --silent --show-error --max-time 15 -o /dev/null -w '%{http_code}' https://halleus.ir/api/admin/analytics || true)"
[ "$code" = 401 ] || failures+=("analytics_auth:$code")
code="$(curl --silent --show-error --max-time 15 -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' --data '{}' https://halleus.ir/api/analytics/event || true)"
[ "$code" = 403 ] || failures+=("analytics_reject_invalid:$code")
if [ "${#failures[@]}" -gt 0 ]; then
  printf 'ANALYTICS_LIVE_SMOKE_FAILED=%s\n' "${failures[*]}" >&2
  echo 'Post-release smoke failed; running official code rollback. Additive schema remains.' >&2
  if bash "$engine" rollback; then
    [ "$(sed -n 's/^commit=//p' /srv/halleus/current/.halleus-release)" = "$base" ] || fail 'rollback active SHA mismatch'
    systemctl is-active --quiet halleus.service || fail 'rollback service inactive'
    echo 'ANALYTICS_POST_SMOKE: OFFICIAL_CODE_ROLLBACK=PASS' >&2
  else
    echo 'ANALYTICS_POST_SMOKE: OFFICIAL_CODE_ROLLBACK=FAILED' >&2
  fi
  exit 1
fi
printf 'CURRENT=%s\nPREVIOUS=%s\n' "$(readlink -f /srv/halleus/current)" "$(readlink -f /srv/halleus/previous)"
echo 'HALLEUS_ANALYTICS_RELEASE_AND_SMOKE_PASS'