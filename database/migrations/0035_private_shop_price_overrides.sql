-- Owner-only live catalog pricing; safe additive migration for self-hosted PostgreSQL.
-- Existing orders, payment attempts and source prices remain unchanged.
begin;

create table if not exists halleus_private.shop_price_overrides (
  product_id text not null check (product_id in ('p01', 'p02')),
  size text not null check (size in ('10x15', '20x30', '30x45')),
  price_toman integer not null check (price_toman between 1000 and 10000000),
  expires_at timestamptz,
  revision integer not null default 1 check (revision > 0),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  primary key (product_id, size)
);

create table if not exists halleus_private.shop_price_change_events (
  id bigint generated always as identity primary key,
  product_id text not null check (product_id in ('p01', 'p02')),
  size text not null check (size in ('10x15', '20x30', '30x45')),
  actor_user_id uuid not null,
  action text not null check (action in ('set', 'reset')),
  before_price_toman integer,
  after_price_toman integer,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table halleus_private.shop_price_overrides enable row level security;
alter table halleus_private.shop_price_change_events enable row level security;
revoke all on halleus_private.shop_price_overrides from public, anon, authenticated;
revoke all on halleus_private.shop_price_change_events from public, anon, authenticated;
revoke all on sequence halleus_private.shop_price_change_events_id_seq from public, anon, authenticated;

create trigger shop_price_events_no_update before update on halleus_private.shop_price_change_events
for each row execute function halleus_private.reject_audit_event_mutation();
create trigger shop_price_events_no_delete before delete on halleus_private.shop_price_change_events
for each row execute function halleus_private.reject_audit_event_mutation();

comment on table halleus_private.shop_price_overrides is
  'Owner-only effective catalog prices; expiry evaluated on every read; existing order totals stay immutable.';
comment on table halleus_private.shop_price_change_events is
  'Append-only owner price change history; never stores customer or payment credentials.';

commit;
