#!/usr/bin/env bash
# Resume ONLY the failed stage-1 DB metadata probe against the RUNNING app's
# actual environment and its postgres.js driver. No rows, secrets or writes.
set -Eeuo pipefail
set +x

if [ "${EUID}" -ne 0 ]; then
  echo 'SAFETY_FATAL: requires root to inspect the existing service process environment.'
  exit 2
fi

echo 'HALLEUS_SHOP_S1_RUNTIME_DB_READONLY_V1'
node_bin='/usr/local/bin/node'
package='/srv/halleus/current/package.json'
if [ ! -x "$node_bin" ] || [ ! -f "$package" ]; then
  echo 'db_probe=EXTERNAL_BLOCK:verified_runtime_files_missing'
  exit 0
fi

pid="$(systemctl show -P MainPID halleus.service 2>/dev/null || true)"
if [[ ! "$pid" =~ ^[1-9][0-9]{0,9}$ ]] || [ ! -r "/proc/$pid/environ" ]; then
  echo 'db_probe=EXTERNAL_BLOCK:active_service_environment_unavailable'
  exit 0
fi

exe="$(readlink -f -- "/proc/$pid/exe" 2>/dev/null || true)"
case "$exe" in
  */node|*/nodejs) ;;
  *) echo 'db_probe=EXTERNAL_BLOCK:service_main_pid_not_node'; exit 0 ;;
esac

"$node_bin" - "$pid" <<'JS_READONLY' 2>/dev/null
const { readFileSync, existsSync } = require('node:fs');
const { createRequire } = require('node:module');

const pid = process.argv[2];
const packagePath = '/srv/halleus/current/package.json';
const print = (key, value) => console.log(`${key}=${value}`);
const classify = (error) => {
  const code = String(error?.code ?? '');
  if (['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH', 'ECONNRESET'].includes(code)) return 'network_or_socket';
  if (['28P01', '28000'].includes(code)) return 'db_authentication';
  if (['42501'].includes(code)) return 'db_permission';
  if (['3D000'].includes(code)) return 'db_name';
  return 'connection_or_query_error';
};

async function run() {
  if (!existsSync(packagePath)) {
    print('db_probe', 'EXTERNAL_BLOCK:runtime_package_missing');
    return;
  }
  let url = '';
  try {
    const env = readFileSync(`/proc/${pid}/environ`).toString('utf8').split('\0');
    const setting = env.find((value) => value.startsWith('DATABASE_URL='));
    if (setting) url = setting.slice('DATABASE_URL='.length);
  } catch {
    print('db_probe', 'EXTERNAL_BLOCK:service_env_read_failed');
    return;
  }
  if (!url) {
    print('db_probe', 'EXTERNAL_BLOCK:running_service_database_url_missing');
    return;
  }

  let postgres;
  try {
    postgres = createRequire(packagePath)('postgres');
  } catch {
    print('db_probe', 'EXTERNAL_BLOCK:runtime_postgres_driver_missing');
    return;
  }

  const sql = postgres(url, { max: 1, idle_timeout: 2, connect_timeout: 8, prepare: false });
  url = '';
  let inTransaction = false;
  try {
    await sql.unsafe('begin transaction isolation level repeatable read read only');
    inTransaction = true;
    const facts = await sql.unsafe(`
      select current_setting('server_version_num')::integer as version,
        to_regclass('public.halleus_reports') is not null as reports,
        to_regclass('auth.users') is not null as auth_users,
        to_regnamespace('halleus_private') is not null as private_schema,
        to_regclass('halleus_private.shop_orders') is not null as orders,
        to_regclass('halleus_private.shop_order_events') is not null as events,
        to_regclass('halleus_private.shared_display_numbers_seq') is not null as shared_numbers,
        to_regclass('halleus_private.shop_rate_limits') is not null as rate_limits,
        to_regclass('halleus_private.admin_memberships') is not null as admin_memberships,
        to_regrole('anon') is not null as anon,
        to_regrole('authenticated') is not null as authenticated
    `);
    for (const [key, value] of Object.entries(facts[0] ?? {})) print(`db_${key}`, value);
    const columns = await sql.unsafe(`
      select n.nspname as schema, c.relname as relation, a.attname as field,
        format_type(a.atttypid, a.atttypmod) as type
      from pg_catalog.pg_attribute a
      join pg_catalog.pg_class c on c.oid = a.attrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where a.attnum > 0 and not a.attisdropped and (
        (n.nspname = 'public' and c.relname = 'halleus_reports'
          and a.attname in ('id', 'created_at', 'display_number'))
        or (n.nspname = 'halleus_private'
          and c.relname in ('shop_orders', 'shop_order_events', 'shop_rate_limits')
          and a.attname in ('id', 'display_number', 'version', 'scope_hash', 'hits')))
      order by n.nspname, c.relname, a.attname
    `);
    for (const item of columns) print('db_column', `${item.schema}.${item.relation}.${item.field}:${item.type}`);
    await sql.unsafe('rollback');
    inTransaction = false;
    print('db_probe', 'READONLY_METADATA_PASS');
  } catch (error) {
    print('db_probe', `EXTERNAL_BLOCK:${classify(error)}`);
  } finally {
    if (inTransaction) {
      try { await sql.unsafe('rollback'); } catch { /* connection already failed */ }
    }
    try { await sql.end({ timeout: 2 }); } catch { /* connection already failed */ }
  }
}

run().catch(() => print('db_probe', 'EXTERNAL_BLOCK:runtime_probe_failed'));
JS_READONLY
echo 'HALLEUS_SHOP_S1_RUNTIME_DB_READONLY_DONE'
