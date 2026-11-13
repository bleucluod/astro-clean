#!/usr/bin/env bash
set -Eeuo pipefail
set +x
umask 077

# Controlled multi-surface showcases migration + canonical release.
repo=/srv/halleus/source
engine="$repo/ops/vps/halleus-release.sh"
migration="$repo/database/migrations/0042_multi_surface_shop_showcases.sql"
tested=3e6fe6143f12d69958fc1b281bce5aeaeb54e0df
active_base=0d075971eb4de7ea4d1cb3dc1bccaa4025b8cd38
migration_blob=8c0d5c12b19d9846e6db102e20e6df0cae62fec6
node=/usr/local/bin/node
mode=preflight
if [ "$#" -gt 0 ]; then mode="$1"; fi
fail() { echo "HALLEUS_SHOWCASES_RELEASE_HOLD: $*" >&2; exit 1; }
g() { runuser -u deploy -- git -C "$repo" "$@"; }

[ "$EUID" -eq 0 ] || fail 'root required'
[ "$mode" = preflight ] || [ "$mode" = release ] || fail 'use preflight or release'
exec 8>/run/lock/halleus-showcases-release.lock
flock -n 8 || fail 'showcases release is locked'
( exec 9>/run/lock/halleus-release.lock; flock -n 9 ) || fail 'canonical release already running'
[ -f "$engine" ] && [ -x "$node" ] || fail 'engine or node missing'
[ -L /srv/halleus/current ] && [ -L /srv/halleus/previous ] || fail 'release links missing'
[ "$(g branch --show-current)" = main ] || fail 'wrong branch'
case "$(g remote get-url origin)" in
  https://github.com/bleucluod/astro-clean|https://github.com/bleucluod/astro-clean.git|git@github.com:bleucluod/astro-clean.git) ;;
  *) fail 'wrong origin';;
esac
[ -z "$(g status --porcelain=v1 --untracked-files=all)" ] || fail 'dirty worktree'
pin="$(g rev-parse HEAD)"
[ "$(g rev-parse "$pin^")" = "$tested" ] || fail 'expected one release entrypoint commit after verified source'
[ "$(g diff --name-only "$tested" "$pin")" = 'ops/vps/halleus-showcases-release.sh' ] || fail 'unrelated release commit changes'
[ "$(g hash-object "$repo/ops/vps/halleus-showcases-release.sh")" = "$(g rev-parse "$pin:ops/vps/halleus-showcases-release.sh")" ] || fail 'untracked release entrypoint'
[ "$(g hash-object "$migration")" = "$migration_blob" ] || fail 'migration content mismatch'
[ "$(stat -c '%u:%a' /etc/halleus/halleus.env)" = 0:600 ] || fail 'unsafe private environment'
[ -f /srv/halleus/current/.halleus-release ] && [ -f /srv/halleus/previous/.halleus-release ] || fail 'release metadata missing'
active="$(sed -n 's/^commit=//p' /srv/halleus/current/.halleus-release)"
[ "$active" = "$active_base" ] || fail "unexpected production release $active"
[ "$(readlink -f /srv/halleus/current)" != "$(readlink -f /srv/halleus/previous)" ] || fail 'no independent rollback target'
systemctl is-active --quiet halleus.service || fail 'service inactive'
g fetch origin main --tags || fail 'GitHub unavailable'
[ "$(g rev-parse origin/main)" = "$pin" ] || fail 'origin/main mismatch'
g --no-pager diff --check "$tested" "$pin" || fail 'invalid diff'
[ -z "$(g status --porcelain=v1 --untracked-files=all)" ] || fail 'source dirtied after fetch'

# Use the exact storage and retention policy enforced by the official engine.
source "$repo/ops/vps/halleus-release-storage.env"
[ "$HALLEUS_KEEP_RELEASES" = 2 ] && [ "$HALLEUS_HEADROOM_RUNTIME_COPIES" = 2 ] || fail 'rollback retention changed'
[[ "$HALLEUS_RUNTIME_BUDGET_BYTES" =~ ^[1-9][0-9]*$ ]] || fail 'invalid budget'
disk="$(df -B1 --output=avail /srv/halleus | tail -1 | tr -d '[:space:]')"
[ "$disk" -gt "$((HALLEUS_RUNTIME_BUDGET_BYTES * 2 + 536870912))" ] || fail 'release disk space low'
[ "$(df -B1 --output=avail /root | tail -1 | tr -d '[:space:]')" -gt 536870912 ] || fail 'backup disk space low'
pid="$(systemctl show -P MainPID halleus.service)"
[[ "$pid" =~ ^[1-9][0-9]*$ ]] && [ -r "/proc/$pid/environ" ] || fail 'live service DB not readable'
pinshort="$(printf '%s' "$pin" | cut -c1-12)"
tag="v0.1.shop-showcases-$pinshort"
echo 'SAFETY_GATE=PASS'

echo '=== INDEPENDENT FOCUSED CHECKS ==='
check_failed=0
for file in scripts/check-shop-multi-surface-showcases.mjs scripts/check-vps-release-workflow.mjs scripts/check-privacy-conscious-analytics.mjs; do
  if runuser -u deploy -- bash -c 'cd "$1" && "$2" "$3"' _ "$repo" "$node" "$file"; then
    echo "SOURCE_CHECK_PASS=$file"
  else
    echo "SOURCE_CHECK_FAILURE=$file" >&2
    check_failed=$((check_failed + 1))
  fi
done
[ "$check_failed" -eq 0 ] || fail "source checks failed: $check_failed"
[ -z "$(g status --porcelain=v1 --untracked-files=all)" ] || fail 'dirty source after checks'

db_stage() {
  "$node" - "$1" "$pid" "$migration" <<'NODE'
'use strict';
const fs = require('node:fs');
const { createRequire } = require('node:module');
const [mode, pid, migration] = process.argv.slice(2);
const raw = fs.readFileSync('/proc/' + pid + '/environ','utf8').split('\0')
  .find(value => value.startsWith('DATABASE_URL='));
if (!raw) { console.error('SHOWCASE_DB_HOLD: runtime_database_unavailable'); process.exit(2); }
const postgres = createRequire('/srv/halleus/current/package.json')('postgres');
const sql = postgres(raw.slice('DATABASE_URL='.length), {max:1,connect_timeout:8,prepare:false});
const base = {
  wiki_shop_showcases:['id','article_id','product_id','after_section_index','enabled','revision'],
  wiki_shop_showcase_proposals:['id','article_id','product_id','status'],
  wiki_shop_showcase_exports:['article_id','batch_id','product_ids'],
  wiki_shop_showcase_daily_metrics:['showcase_id','product_id','day','impressions','clicks'],
  admin_audit_events:['actor_user_id','actor_role','action','target_type','target_id','success','request_correlation_id'],
};
const extra = {
  shop_showcase_placements:['id','surface','slot','product_id','title','description','button_label','enabled','revision'],
  shop_showcase_daily_metrics:['showcase_id','product_id','day','impressions','clicks'],
  shop_showcase_ai_batches:['id','product_ids','surface_ids','created_by'],
  shop_showcase_ai_proposals:['id','batch_id','surface','slot','product_id','status'],
};
const newIndexes=['shop_showcase_placements_enabled_idx','shop_showcase_metrics_day_idx','shop_showcase_ai_proposals_pending_idx'];
async function inspect() {
  const rows=await sql.unsafe("select c.relname as tbl,c.relrowsecurity as rls,a.attname as col from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped where n.nspname='halleus_private' and c.relkind in ('r','p')");
  const indexes=new Set((await sql.unsafe("select indexname from pg_indexes where schemaname='halleus_private'")).map(x=>x.indexname));
  const constraints=new Map((await sql.unsafe("select con.conname as name,pg_get_constraintdef(con.oid) as definition from pg_constraint con join pg_namespace n on n.oid=con.connamespace where n.nspname='halleus_private'")).map(x=>[x.name,x.definition]));
  const tables=new Map();
  for(const row of rows) {
    if(!tables.has(row.tbl)) tables.set(row.tbl,{rls:row.rls,cols:new Set()});
    tables.get(row.tbl).cols.add(row.col);
  }
  for(const [name,cols] of Object.entries(base)) {
    const t=tables.get(name);
    if(!t?.rls || cols.some(col=>!t.cols.has(col))) throw Error('missing_private_base_'+name);
  }
  if(!indexes.has('wiki_showcase_daily_metrics_day_idx')) throw Error('missing_wiki_metrics_index');
  for(const name of ['wiki_shop_showcases','wiki_shop_showcase_daily_metrics','wiki_shop_showcase_proposals']) {
    const result=await sql.unsafe("select count(*)::integer as n from halleus_private."+name+" where product_id is not null and product_id !~ '^[a-z][a-z0-9_-]{1,39}$'");
    if(result[0]?.n!==0) throw Error('unreviewed_existing_product_ids');
  }
  const names=Object.keys(extra);
  const found=names.filter(name=>tables.has(name));
  const foundIndexes=newIndexes.filter(name=>indexes.has(name));
  if(!found.length && !foundIndexes.length) return 'NOT_APPLIED';
  if(found.length!==names.length || foundIndexes.length!==newIndexes.length) throw Error('partial_0042_schema');
  for(const [name,cols] of Object.entries(extra)){
    const t=tables.get(name);
    if(!t?.rls || cols.some(col=>!t.cols.has(col))) throw Error('invalid_0042_'+name);
  }
  for(const table of ['wiki_shop_showcases','wiki_shop_showcase_daily_metrics','wiki_shop_showcase_proposals']){
    const c=table+'_product_id_check';
    if(!constraints.has(c) || !constraints.get(c).includes('~')) throw Error('missing_new_product_constraint_'+table);
  }
  if(!constraints.has('shop_showcase_placements_surface_slot_key')) throw Error('missing_slot_unique_constraint');
  return 'APPLIED';
}
(async()=>{
  const state=await inspect();
  console.log('SHOWCASE_DB: base=PASS migration_0042='+state);
  if(mode==='apply' && state==='NOT_APPLIED'){
    const contents=fs.readFileSync(migration,'utf8');
    if(!contents.startsWith('-- Multi-surface product showcases. Additive;')||!contents.trimEnd().endsWith('commit;'))
      throw Error('migration_contract_mismatch');
    await sql.unsafe(contents);
    console.log('SHOWCASE_DB: migration_0042=EXECUTED');
  }
  if(mode==='apply'){
    if((await inspect())!=='APPLIED')throw Error('migration_verification_failed');
    console.log('SHOWCASE_DB: migration_0042=PASS');
  }
})().catch(e=>{
  const message=String(e?.message||'error');
  console.error('SHOWCASE_DB_HOLD: '+(/^[a-z0-9_]+$/.test(message)?message:'database_error')+
    ' code='+String(e?.code||'unknown').replace(/[^a-zA-Z0-9_]/g,'').slice(0,20));
  process.exitCode=1;
}).finally(()=>sql.end({timeout:3}));
NODE
}

echo '=== DATABASE READ-ONLY PREFLIGHT ==='
db_result="$(db_stage check)" || fail 'unsafe or unexpected live database schema'
printf '%s\n' "$db_result"
case "$db_result" in
  *'migration_0042=NOT_APPLIED') applied=0 ;;
  *'migration_0042=APPLIED') applied=1 ;;
  *) fail 'unexpected DB result';;
esac
if [ "$mode" = preflight ]; then
  echo 'HALLEUS_SHOWCASES_PREFLIGHT_PASS'
  echo "RELEASE_SHA=$pin"
  echo 'No database mutations, backup, tags, or deployment performed.'
  exit 0
fi

echo '=== VERIFIED DATABASE BACKUP ==='
backup_dir=/root/halleus-bitpay-preflight
install -d -m 0700 -o root -g root "$backup_dir"
backup=''
if [ "$applied" -eq 1 ]; then
  shopt -s nullglob
  for f in "$backup_dir"/before-showcases-*.dump; do
    [ -f "$f" ] && [ ! -L "$f" ] && [ -s "$f" ] || continue
    [ "$(stat -c '%u:%a' "$f")" = 0:600 ] || continue
    if /usr/lib/postgresql/17/bin/pg_restore --list "$f" >/dev/null 2>&1; then
      if [ -z "$backup" ] || [ "$f" -nt "$backup" ]; then backup="$f"; fi
    fi
  done
  shopt -u nullglob
  [ -n "$backup" ] || fail 'migration applied but no verified original backup found'
  echo 'SHOWCASE_DB_BACKUP=RESUMED_PASS'
else
  backup="$backup_dir/before-showcases-$(date -u +%Y%m%dT%H%M%SZ)-$$.dump"
  [ ! -e "$backup" ] || fail 'backup name collision'
  "$node" "$repo/ops/vps/halleus-bitpay-pg-backup.cjs" "$pid" "$backup" || fail 'Postgres backup failed'
  [ -s "$backup" ] && [ "$(stat -c '%u:%a' "$backup")" = 0:600 ] || fail 'backup invalid'
  echo 'SHOWCASE_DB_BACKUP=PASS'
fi

echo '=== ADDITIVE MIGRATION ==='
[ "$(sed -n 's/^commit=//p' /srv/halleus/current/.halleus-release)" = "$active_base" ] || fail 'active release changed before migration'
systemctl is-active --quiet halleus.service || fail 'service stopped'
if [ "$applied" -eq 1 ]; then
  echo 'SHOWCASE_DB: migration_0042=RESUMED_PASS'
else
  db_stage apply || fail 'migration failed; original code remains live'
fi

echo '=== EXACT RELEASE TAG ==='
if ! g show-ref --verify --quiet "refs/tags/$tag"; then
  g tag "$tag" "$pin" || fail 'tag creation failed'
fi
[ "$(g rev-list -n 1 "$tag")" = "$pin" ] || fail 'tag collision'
g push origin "refs/tags/$tag" || fail 'tag push failed; migration may already be applied'

echo '=== CANONICAL RELEASE ==='
[ "$(sed -n 's/^commit=//p' /srv/halleus/current/.halleus-release)" = "$active_base" ] || fail 'active changed before deploy'
bash "$engine" deploy --commit "$pin" --tag "$tag" --skip-wiki-maintenance || fail 'official release failed; additive DB remains'
[ "$(sed -n 's/^commit=//p' /srv/halleus/current/.halleus-release)" = "$pin" ] || fail 'wrong active SHA'
[ "$(sed -n 's/^commit=//p' /srv/halleus/previous/.halleus-release)" = "$active_base" ] || fail 'previous release missing'
systemctl is-active --quiet halleus.service || fail 'service inactive after deployment'

echo '=== LIVE SHOWCASE SMOKE ==='
smoke_fail=0
check_http() {
  local label="$1" expected="$2" url="$3" observed
  observed="$(curl --silent --max-time 15 -o /dev/null -w '%{http_code}' "$url" || true)"
  if [ "$observed" != "$expected" ]; then
    printf 'SMOKE_FAIL %s expected=%s got=%s\n' "$label" "$expected" "$observed" >&2
    smoke_fail=$((smoke_fail + 1))
  fi
}
check_http HOME 200 https://halleus.ir/
check_http WIKI 200 https://halleus.ir/wiki
check_http SHOP 200 https://halleus.ir/shop
check_http SKY 200 https://halleus.ir/sky
for surface in natal synastry sky; do
  check_http "SHOWCASES_$surface" 200 "https://halleus.ir/api/shop/showcases?surface=$surface"
done
check_http INVALID_SURFACE 400 'https://halleus.ir/api/shop/showcases?surface=invalid'
check_http ADMIN_REQUIRES_AUTH 401 'https://halleus.ir/api/admin/shop/showcases'
code="$(curl --silent --max-time 15 -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' --data '{}' https://halleus.ir/api/shop/showcase-event || true)"
[ "$code" = 403 ] || smoke_fail=$((smoke_fail+1))
if [ "$smoke_fail" -ne 0 ]; then
  echo "SHOWCASE_SMOKE_FAILURES=$smoke_fail" >&2
  if bash "$engine" rollback; then
    [ "$(sed -n 's/^commit=//p' /srv/halleus/current/.halleus-release)" = "$active_base" ] || fail 'rollback active mismatch'
    systemctl is-active --quiet halleus.service || fail 'rollback service inactive'
    echo 'SHOWCASE_CODE_ROLLBACK=PASS' >&2
  else
    echo 'SHOWCASE_CODE_ROLLBACK=FAILED' >&2
  fi
  exit 1
fi
printf 'CURRENT=%s\nPREVIOUS=%s\n' "$(readlink -f /srv/halleus/current)" "$(readlink -f /srv/halleus/previous)"
echo 'HALLEUS_SHOWCASES_RELEASE_AND_SMOKE_PASS'
