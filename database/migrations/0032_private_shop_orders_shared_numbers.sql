-- Halleus physical shop: private guest orders and one display-number sequence for reports/orders.
-- RELEASE GATE: review actual production maxima, existing columns, roles and backups first.
-- This migration is NOT run automatically by the shop UI or checkout APIs.

begin;

create schema if not exists halleus_private;
revoke all on schema halleus_private from public, anon, authenticated;

create sequence if not exists halleus_private.shared_display_numbers_seq as bigint start with 1;

alter table public.halleus_reports
  add column if not exists display_number bigint;

create unique index if not exists halleus_reports_display_number_unique
  on public.halleus_reports(display_number) where display_number is not null;

create table if not exists halleus_private.shop_orders (
  id uuid primary key default gen_random_uuid(),
  display_number bigint not null unique default nextval('halleus_private.shared_display_numbers_seq'::regclass),
  idempotency_hash text not null unique check (length(idempotency_hash) = 64),
  guest_access_hash text not null unique check (length(guest_access_hash) = 64),
  payload_hash text not null check (length(payload_hash) = 64),
  recipient_name text not null check (char_length(recipient_name) between 1 and 100),
  recipient_mobile text not null check (recipient_mobile ~ '^\+989[0-9]{9}$'),
  province text not null check (char_length(province) between 1 and 60),
  city text not null check (char_length(city) between 1 and 70),
  address text not null check (char_length(address) between 10 and 400),
  postal_code text not null check (postal_code ~ '^[0-9]{10}$'),
  delivery_note text check (delivery_note is null or char_length(delivery_note) <= 200),
  carrier text not null check (carrier in ('post', 'tipax')),
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  item_count integer not null check (item_count between 1 and 200),
  subtotal_toman integer not null check (subtotal_toman > 0),
  shipping_and_packaging_toman integer not null check (shipping_and_packaging_toman >= 0),
  total_toman integer not null check (total_toman = subtotal_toman + shipping_and_packaging_toman),
  status text not null default 'awaiting_transfer' check (status in (
    'awaiting_transfer', 'transfer_declared', 'payment_verified', 'payment_rejected',
    'preparing', 'shipped', 'delivered', 'cancel_requested', 'canceled'
  )),
  transfer_reference text check (transfer_reference is null or char_length(transfer_reference) between 1 and 50),
  transfer_time text check (transfer_time is null or transfer_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  transfer_declared_at timestamptz,
  payment_verified_at timestamptz,
  tracking_code text check (tracking_code is null or char_length(tracking_code) between 1 and 100),
  handed_to_carrier_at timestamptz,
  cancellation_reason text check (cancellation_reason is null or char_length(cancellation_reason) <= 500),
  cancel_origin_status text check (cancel_origin_status is null or cancel_origin_status in (
    'transfer_declared', 'payment_verified', 'preparing'
  )),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_orders_status_created_idx
  on halleus_private.shop_orders(status, created_at desc);
create index if not exists shop_orders_created_idx
  on halleus_private.shop_orders(created_at desc);

-- Prevent report/order number collisions during an initial backfill. Existing numbers
-- are preserved; unnumbered reports receive values in stable creation order.
lock table public.halleus_reports in access exclusive mode;
lock table halleus_private.shop_orders in access exclusive mode;

with base as (
  select greatest(
    coalesce((select max(display_number) from public.halleus_reports), 0),
    coalesce((select max(display_number) from halleus_private.shop_orders), 0)
  ) as number
), numbered as (
  select id, row_number() over (order by created_at nulls last, id) as ordinal
  from public.halleus_reports where display_number is null
)
update public.halleus_reports as reports
set display_number = (select number from base) + numbered.ordinal
from numbered where reports.id = numbered.id;

select setval(
  'halleus_private.shared_display_numbers_seq'::regclass,
  greatest(
    (select last_value from halleus_private.shared_display_numbers_seq),
    coalesce((select max(display_number) from public.halleus_reports), 0),
    coalesce((select max(display_number) from halleus_private.shop_orders), 0),
    1
  ),
  (select is_called from halleus_private.shared_display_numbers_seq)
    or coalesce((select max(display_number) from public.halleus_reports), 0) > 0
    or coalesce((select max(display_number) from halleus_private.shop_orders), 0) > 0
);

create or replace function halleus_private.assign_report_display_number()
returns trigger language plpgsql security definer set search_path = pg_catalog as $$
begin
  if TG_OP = 'INSERT' then
    new.display_number := nextval('halleus_private.shared_display_numbers_seq'::regclass);
  elsif new.display_number is distinct from old.display_number then
    raise exception 'Report display number is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists halleus_reports_shared_display_number on public.halleus_reports;
create trigger halleus_reports_shared_display_number
before insert or update of display_number on public.halleus_reports
for each row execute function halleus_private.assign_report_display_number();

create table if not exists halleus_private.shop_order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references halleus_private.shop_orders(id) on delete restrict,
  actor_user_id uuid,
  action text not null check (char_length(action) between 1 and 80),
  before_status text,
  after_status text,
  reason text check (reason is null or char_length(reason) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists shop_order_events_order_idx
  on halleus_private.shop_order_events(order_id, created_at desc);

alter table halleus_private.shop_orders enable row level security;
alter table halleus_private.shop_order_events enable row level security;
revoke all on halleus_private.shop_orders, halleus_private.shop_order_events from public, anon, authenticated;
revoke all on sequence halleus_private.shared_display_numbers_seq from public, anon, authenticated;
revoke all on sequence halleus_private.shop_order_events_id_seq from public, anon, authenticated;

drop trigger if exists shop_order_events_no_update on halleus_private.shop_order_events;
create trigger shop_order_events_no_update before update on halleus_private.shop_order_events
for each row execute function halleus_private.reject_audit_event_mutation();
drop trigger if exists shop_order_events_no_delete on halleus_private.shop_order_events;
create trigger shop_order_events_no_delete before delete on halleus_private.shop_order_events
for each row execute function halleus_private.reject_audit_event_mutation();

comment on table halleus_private.shop_orders is
  'Private guest orders; access requires a separately held secret or verified owner capability.';
comment on column halleus_private.shop_orders.display_number is
  'Public display number shared transactionally with newly inserted Halleus reports.';
comment on column halleus_private.shop_orders.guest_access_hash is
  'SHA-256 of a separately held customer tracking secret; never return in public listings.';

commit;
