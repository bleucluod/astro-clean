-- Halleus Batch 1: secure admin core and persisted premium-request queue.
-- Additive only. Execute in Supabase SQL Editor after reviewing the live schema.

begin;

create schema if not exists halleus_private;

revoke all on schema halleus_private from public;
revoke all on schema halleus_private from anon;
revoke all on schema halleus_private from authenticated;

create table if not exists halleus_private.admin_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'editor', 'support', 'analyst')),
  status text not null default 'active' check (status in ('active', 'suspended', 'revoked')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  constraint admin_memberships_revocation_state_check check (
    (status = 'revoked' and revoked_at is not null)
    or (status <> 'revoked')
  )
);

create index if not exists admin_memberships_role_status_idx
  on halleus_private.admin_memberships (role, status);

create table if not exists halleus_private.admin_audit_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid,
  actor_role text,
  action text not null,
  target_type text not null,
  target_id text,
  before_summary jsonb,
  after_summary jsonb,
  reason text,
  success boolean not null,
  request_correlation_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_events_created_idx
  on halleus_private.admin_audit_events (created_at desc);

create index if not exists admin_audit_events_actor_idx
  on halleus_private.admin_audit_events (actor_user_id, created_at desc);

create index if not exists admin_audit_events_target_idx
  on halleus_private.admin_audit_events (target_type, target_id, created_at desc);

create table if not exists halleus_private.admin_notes (
  id bigint generated always as identity primary key,
  target_type text not null check (target_type in ('user', 'report', 'premium_request')),
  target_id text not null,
  body text not null check (char_length(body) between 1 and 4000),
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists admin_notes_target_idx
  on halleus_private.admin_notes (target_type, target_id, created_at desc);

create table if not exists halleus_private.premium_requests (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  requested_product text not null check (char_length(requested_product) between 1 and 160),
  contact_name text not null check (char_length(contact_name) between 1 and 160),
  contact_value text not null check (char_length(contact_value) between 1 and 320),
  linked_report_id text,
  customer_notes text check (customer_notes is null or char_length(customer_notes) <= 4000),
  internal_notes text check (internal_notes is null or char_length(internal_notes) <= 4000),
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'approved', 'preparing', 'delivered', 'canceled')),
  agreed_amount numeric(14, 2) check (agreed_amount is null or agreed_amount >= 0),
  due_date date,
  delivery_status text not null default 'not_started'
    check (delivery_status in ('not_started', 'preparing', 'ready', 'delivered', 'canceled')),
  publication_choice text not null default 'not_requested'
    check (publication_choice in ('not_requested', 'private', 'public_with_consent')),
  source text not null default 'manual_order',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists premium_requests_queue_idx
  on halleus_private.premium_requests (status, created_at desc);

create index if not exists premium_requests_user_idx
  on halleus_private.premium_requests (user_id, created_at desc);

alter table halleus_private.admin_memberships enable row level security;
alter table halleus_private.admin_audit_events enable row level security;
alter table halleus_private.admin_notes enable row level security;
alter table halleus_private.premium_requests enable row level security;

revoke all on all tables in schema halleus_private from public;
revoke all on all tables in schema halleus_private from anon;
revoke all on all tables in schema halleus_private from authenticated;
revoke all on all sequences in schema halleus_private from public;
revoke all on all sequences in schema halleus_private from anon;
revoke all on all sequences in schema halleus_private from authenticated;

alter default privileges in schema halleus_private
  revoke all on tables from public, anon, authenticated;
alter default privileges in schema halleus_private
  revoke all on sequences from public, anon, authenticated;
alter default privileges in schema halleus_private
  revoke all on functions from public, anon, authenticated;

create or replace function halleus_private.reject_audit_event_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'admin_audit_events is append-only';
end;
$$;

drop trigger if exists admin_audit_events_no_update on halleus_private.admin_audit_events;
create trigger admin_audit_events_no_update
before update on halleus_private.admin_audit_events
for each row execute function halleus_private.reject_audit_event_mutation();

drop trigger if exists admin_audit_events_no_delete on halleus_private.admin_audit_events;
create trigger admin_audit_events_no_delete
before delete on halleus_private.admin_audit_events
for each row execute function halleus_private.reject_audit_event_mutation();

comment on schema halleus_private is
  'Server-only Halleus administration data. Not exposed to anon/authenticated roles.';

comment on table halleus_private.admin_memberships is
  'Database-backed admin authorization. Never infer roles from user_metadata or request parameters.';

comment on table halleus_private.admin_audit_events is
  'Append-only audit trail for sensitive admin operations and explicit private-content access.';

comment on column halleus_private.admin_audit_events.actor_user_id is
  'Verified actor UUID snapshot; intentionally not FK-bound so auth-user deletion cannot mutate append-only audit rows.';

comment on column halleus_private.admin_notes.created_by is
  'Verified admin UUID snapshot; intentionally not FK-bound so retained support notes do not block auth-user deletion.';

commit;
