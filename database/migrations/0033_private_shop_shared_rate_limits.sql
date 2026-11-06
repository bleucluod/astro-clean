-- Stage 1 physical-shop abuse control. Candidate only: never auto-applied to VPS.
-- Run on a verified isolated database first; production requires a separate
-- schema/role/backup review and explicit migration authorization.
begin;

create table if not exists halleus_private.shop_rate_limits (
  scope_hash text primary key check (scope_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null,
  hits integer not null check (hits between 1 and 2147483647)
);

create index if not exists shop_rate_limits_window_idx
  on halleus_private.shop_rate_limits (window_started_at);

alter table halleus_private.shop_rate_limits enable row level security;
revoke all on halleus_private.shop_rate_limits from public, anon, authenticated;

comment on table halleus_private.shop_rate_limits is
  'HMAC-only guest shop abuse buckets, shared across all application workers; no raw client IP stored.';

commit;
