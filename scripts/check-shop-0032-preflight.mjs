import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const migration = read('database/migrations/0032_private_shop_orders_shared_numbers.sql');
const inventory = read('database/preflight/0032_shop_orders_readonly_inventory.sql');
const optional = read('database/preflight/0032_shop_existing_numbers_optional.sql');
const liveMetadata = read('database/preflight/0032_shop_live_schema_metadata.sql');

function checkReadOnlySql(name, source) {
  const clean = source.replace(/--[^\n]*/g, '').trim();
  const statements = clean.split(';').map((part) => part.trim()).filter(Boolean);
  assert.ok(statements.length >= 3, `${name}: no meaningful preflight.`);
  assert.match(statements[0], /^begin\s+transaction\s+isolation\s+level\s+repeatable\s+read\s+read\s+only$/i);
  assert.match(statements.at(-1), /^rollback$/i);
  for (const [index, statement] of statements.slice(1, -1).entries()) {
    assert.match(statement, /^select\s/i, `${name}: statement ${index + 2} is not SELECT.`);
    assert.doesNotMatch(statement,
      /\b(create|alter|drop|truncate|insert|update|delete|copy|grant|revoke|set|lock|call|execute|perform|do|vacuum|analyze)\b/i,
      `${name}: statement ${index + 2} contains a write or privileged command.`);
  }
  assert.doesNotMatch(clean, /\b(recipient_mobile|guest_access_hash|address|report_json|contact_name|private_key|database_url)\b/i,
    `${name}: preflight must not select customer or connection secrets.`);
}

checkReadOnlySql('metadata inventory', inventory);
checkReadOnlySql('conditional existing numbers', optional);
checkReadOnlySql('live catalog metadata', liveMetadata);
assert.match(liveMetadata, /to_regclass\('public\.halleus_reports'\)/);
assert.match(liveMetadata, /to_regclass\('supabase_migrations\.schema_migrations'\)/);
assert.match(liveMetadata, /pg_catalog\.pg_get_indexdef/);
assert.match(liveMetadata, /pg_catalog\.pg_get_triggerdef/);
assert.match(liveMetadata, /pg_catalog\.pg_total_relation_size/);
assert.doesNotMatch(liveMetadata.replace(/--[^\n]*/g, ''), /\bcount\s*\(|\bpg_authid\b|\bpg_dump\b|\bsetval\s*\(|\bnextval\s*\(/i,
  'Live metadata preflight cannot count/read production rows or mutate sequence state.');
assert.match(inventory, /to_regclass\('public\.halleus_reports'\)/);
assert.match(inventory, /to_regclass\('auth\.users'\)/);
assert.match(inventory, /to_regprocedure\('halleus_private\.reject_audit_event_mutation\(\)'\)/);
assert.match(inventory, /a\.attname in \('id', 'created_at', 'display_number', 'user_id'\)/);
assert.match(inventory, /relrowsecurity/);
assert.match(inventory, /pg_get_triggerdef/);
assert.match(inventory, /count\(\*\) as total_reports/);
assert.doesNotMatch(inventory, /to_jsonb|row_to_json|select\s+\*/i);
assert.match(optional, /display_number exists and has type BIGINT/);
assert.match(optional, /max\(display_number\)/);
assert.match(optional, /group by display_number having count\(\*\) > 1/);

// Source/contract conformance only. It does NOT claim an actual DB execution.
assert.match(migration, /create schema if not exists halleus_private/);
assert.match(migration, /create sequence if not exists halleus_private\.shared_display_numbers_seq/);
assert.match(migration, /create unique index if not exists halleus_reports_display_number_unique/);
assert.match(migration, /lock table public\.halleus_reports in access exclusive mode/);
assert.match(migration, /lock table halleus_private\.shop_orders in access exclusive mode/);
assert.match(migration, /create or replace function halleus_private\.assign_report_display_number/);
assert.match(migration, /before insert or update of display_number on public\.halleus_reports/);
assert.match(migration, /shop_order_events_no_update/);
assert.match(migration, /shop_order_events_no_delete/);
assert.match(migration, /alter table halleus_private\.shop_orders enable row level security/);
assert.match(migration, /revoke all on halleus_private\.shop_orders, halleus_private\.shop_order_events from public, anon, authenticated/);
const initial = read('database/migrations/0001_initial_schema.sql');
assert.match(initial, /create table if not exists halleus_reports \(/);
assert.match(initial, /id text primary key/);
const adminCore = read('database/migrations/0002_secure_admin_core.sql');
assert.match(adminCore, /function halleus_private\.reject_audit_event_mutation/);

const store = read('lib/shop/shop-order-store.ts');
assert.match(store, /getAdminDatabase\(\)/);
assert.match(store, /insert into halleus_private\.shop_orders/);
assert.match(store, /on conflict \(idempotency_hash\) do nothing/);
assert.match(store, /for update/);
const database = read('lib/admin/admin-database.ts');
assert.match(database, /getHalleusRuntimeEnv\(\)\.databaseUrl/);
assert.doesNotMatch(database, /supabase\.co|pooler\.supabase|5432|6543/i);
const release = read('ops/vps/halleus-release.sh');
assert.match(release, /SOURCE="\$ROOT\/source"/);
assert.match(release, /ENV_FILE="\/etc\/halleus\/halleus\.env"/);
assert.doesNotMatch(release, /0032_private_shop_orders_shared_numbers|shop_orders_readonly_inventory/);

console.log('Shop S2 schema preflight: migration 0032 actual-source dependencies, report ID/sequence/lock/RLS assumptions, isolated read-only preflight, production catalog-only metadata, optional clone number scan and no automatic release migration passed.');
console.log('EXTERNAL_BLOCK: no isolated real-shape PostgreSQL execution or live VPS schema evidence is claimed by this static check.');
