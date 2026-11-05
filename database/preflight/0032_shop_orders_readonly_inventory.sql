-- S2 / migration 0032: metadata-only, read-only preflight.
-- Use only against a verified isolated copy of the self-hosted Halleus database.
-- No identifiers, recipient/contact information, order contents or access secrets
-- are selected. Never substitute this for a verified production backup/review.
-- Do not run migration 0032 from this file. Its ACCESS EXCLUSIVE backfill lock
-- requires a separately approved production-impact window.

begin transaction isolation level repeatable read read only;

-- Gate 1: required catalog, roles and audit function from the actual environment.
select current_setting('server_version_num')::integer as postgres_version_number,
  to_regclass('public.halleus_reports') is not null as reports_table_exists,
  to_regclass('auth.users') is not null as auth_users_table_exists,
  to_regnamespace('halleus_private') is not null as private_schema_exists,
  to_regprocedure('halleus_private.reject_audit_event_mutation()') is not null as audit_rejection_function_exists,
  to_regrole('anon') is not null as anon_role_exists,
  to_regrole('authenticated') is not null as authenticated_role_exists,
  to_regclass('halleus_private.shop_orders') is not null as existing_shop_orders_table,
  to_regclass('halleus_private.shop_order_events') is not null as existing_shop_events_table,
  to_regclass('halleus_private.shared_display_numbers_seq') is not null as existing_shared_number_sequence;

-- Gate 2: the source draft's report ID is TEXT, but live shapes may differ.
select a.attname as column_name,
  format_type(a.atttypid, a.atttypmod) as column_type,
  a.attnotnull as not_null,
  a.attgenerated <> '' as generated_column,
  a.attidentity <> '' as identity_column
from pg_catalog.pg_attribute as a
where a.attrelid = to_regclass('public.halleus_reports')
  and a.attnum > 0 and not a.attisdropped
  and a.attname in ('id', 'created_at', 'display_number', 'user_id')
order by a.attname;

-- Gate 3: one exact row count, without decompressing or selecting report_json.
-- If display_number already exists, run the *separate optional numeric file*
-- only after the column type is confirmed bigint. If the column is absent,
-- migration 0032 must add it, and pre-existing report numbers cannot exist there.
select count(*) as total_reports from public.halleus_reports;

-- Gate 4: existing indexes/triggers that may conflict with shared numbering.
select c.relname as index_name,
  i.indisunique as unique_index,
  pg_catalog.pg_get_indexdef(i.indexrelid) as definition
from pg_catalog.pg_index as i
join pg_catalog.pg_class as c on c.oid = i.indexrelid
where i.indrelid = to_regclass('public.halleus_reports')
  and pg_catalog.pg_get_indexdef(i.indexrelid) ilike '%display_number%'
order by c.relname;

select t.tgname as report_trigger_name,
  pg_catalog.pg_get_triggerdef(t.oid) as trigger_definition
from pg_catalog.pg_trigger as t
where t.tgrelid = to_regclass('public.halleus_reports')
  and not t.tgisinternal
order by t.tgname;

-- Gate 5: private relation types/RLS status, without selecting private rows.
select c.relname as private_relation,
  c.relkind as relation_kind,
  c.relrowsecurity as rls_enabled
from pg_catalog.pg_class as c
join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
where n.nspname = 'halleus_private'
  and c.relname in ('shop_orders', 'shop_order_events', 'shared_display_numbers_seq')
order by c.relname;

rollback;
