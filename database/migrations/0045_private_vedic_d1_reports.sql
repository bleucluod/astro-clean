-- Candidate only. Explicit approval and isolated PostgreSQL verification required.
begin;
create table halleus_private.vedic_d1_reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  input_hash text not null check (input_hash ~ '^[0-9a-f]{64}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  calculation_version text not null,
  writer_version text not null,
  free_reading jsonb not null check (jsonb_typeof(free_reading) = 'object' and coalesce(free_reading->>'kind','') = 'free-d1'),
  private_manuscript jsonb not null check (jsonb_typeof(private_manuscript) = 'object' and coalesce(private_manuscript->>'kind','') = 'private-d1-draft'),
  created_at timestamptz not null default now(),
  unique (owner_id, input_hash)
);
create index vedic_d1_reports_owner_created_idx
  on halleus_private.vedic_d1_reports (owner_id, created_at desc, id);
alter table halleus_private.vedic_d1_reports enable row level security;
revoke all on halleus_private.vedic_d1_reports from public, anon, authenticated;
comment on table halleus_private.vedic_d1_reports is 'Server-only owner-scoped D1 snapshots; never exposed by public report APIs. No purchase entitlement in this migration.';
commit;
