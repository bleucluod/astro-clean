-- D-S2-01 / option A: catalog-only inspection of the verified self-hosted database.
-- Read-only, no application-table SELECT and no customer/report row extraction.
-- Do not run 0032, use a production writer, or export data with this file.
-- Obtain a separate, reviewed schema-only clone before any isolated migration.

begin transaction isolation level repeatable read read only;

-- Capability markers only: no version table or auth-user rows are queried.
select current_setting('server_version_num')::integer as postgres_version_number,
  to_regclass('public.halleus_reports') is not null as reports_table_exists,
  to_regclass('auth.users') is not null as auth_users_table_exists,
  to_regnamespace('halleus_private') is not null as private_schema_exists,
  to_regprocedure('halleus_private.reject_audit_event_mutation()') is not null as audit_guard_exists,
  to_regclass('halleus_private.shop_orders') is not null as shop_orders_table_exists,
  to_regclass('halleus_private.shop_order_events') is not null as shop_events_table_exists,
  to_regclass('halleus_private.shared_display_numbers_seq') is not null as shared_sequence_exists,
  to_regclass('supabase_migrations.schema_migrations') is not null as supabase_migration_log_exists,
  to_regrole('anon') is not null as anon_role_exists,
  to_regrole('authenticated') is not null as authenticated_role_exists;

-- Catalog estimates are approximate; no COUNT(*) or report JSON scan occurs.
select n.nspname as schema_name, c.relname as relation_name,
  c.relkind as relation_kind, c.reltuples::bigint as estimated_rows,
  pg_catalog.pg_total_relation_size(c.oid) as total_bytes,
  c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced,
  c.relacl::text as relation_acl
from pg_catalog.pg_class as c
join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
where (n.nspname = 'public' and c.relname = 'halleus_reports')
  or (n.nspname = 'halleus_private' and c.relname in (
    'shop_orders', 'shop_order_events', 'shared_display_numbers_seq'
  ))
order by n.nspname, c.relname;

-- Structural columns only, including actual types, not defaults or row values.
select n.nspname as schema_name, c.relname as relation_name,
  a.attname as column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod) as column_type,
  a.attnotnull as not_null,
  a.attgenerated <> '' as generated_column,
  a.attidentity <> '' as identity_column
from pg_catalog.pg_attribute as a
join pg_catalog.pg_class as c on c.oid = a.attrelid
join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
where a.attnum > 0 and not a.attisdropped
  and ((n.nspname = 'public' and c.relname = 'halleus_reports')
    or (n.nspname = 'halleus_private' and c.relname in (
      'shop_orders', 'shop_order_events'
    )))
order by n.nspname, c.relname, a.attnum;

-- Existing definitions could conflict with the new number sequence.
select n.nspname as schema_name, c.relname as relation_name,
  i.relname as index_name,
  pg_catalog.pg_get_indexdef(i.oid) as index_definition
from pg_catalog.pg_index as ix
join pg_catalog.pg_class as c on c.oid = ix.indrelid
join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
join pg_catalog.pg_class as i on i.oid = ix.indexrelid
where (n.nspname = 'public' and c.relname = 'halleus_reports')
  or (n.nspname = 'halleus_private' and c.relname in (
    'shop_orders', 'shop_order_events'
  ))
order by n.nspname, c.relname, i.relname;

select n.nspname as schema_name, c.relname as relation_name,
  t.tgname as trigger_name,
  pg_catalog.pg_get_triggerdef(t.oid) as trigger_definition
from pg_catalog.pg_trigger as t
join pg_catalog.pg_class as c on c.oid = t.tgrelid
join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
where not t.tgisinternal and (
  (n.nspname = 'public' and c.relname = 'halleus_reports')
  or (n.nspname = 'halleus_private' and c.relname in (
    'shop_orders', 'shop_order_events'
  ))
)
order by n.nspname, c.relname, t.tgname;

rollback;
