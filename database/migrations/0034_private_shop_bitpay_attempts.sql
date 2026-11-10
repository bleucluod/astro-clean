-- BitPay.ir private payment attempts. CANDIDATE ONLY: do not auto-apply.
-- Prerequisites: verify live self-hosted Supabase schema/roles, approved backup,
-- isolated PostgreSQL fixture and explicit operator authorization.
-- Existing shop_orders and shop_order_events are unchanged.
begin;

create table halleus_private.shop_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references halleus_private.shop_orders(id) on delete restrict,
  provider text not null default 'bitpay.ir' check (provider = 'bitpay.ir'),
  idempotency_hash text not null unique check (idempotency_hash ~ '^[a-f0-9]{64}$'),
  callback_token_hash text not null unique check (callback_token_hash ~ '^[a-f0-9]{64}$'),
  factor_id text not null check (factor_id ~ '^[1-9][0-9]{0,18}$'),
  amount_toman integer not null check (amount_toman > 0),
  amount_rial bigint not null check (amount_rial = amount_toman::bigint * 10),
  status text not null default 'created' check (status in (
    'created', 'redirect_ready', 'verify_pending', 'verified', 'failed', 'review_required'
  )),
  provider_payment_id text unique check (provider_payment_id ~ '^[1-9][0-9]{0,63}$'),
  provider_transaction_id text unique check (provider_transaction_id ~ '^[1-9][0-9]{0,63}$'),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shop_bitpay_verified_fields check (
    (status = 'verified' and provider_payment_id is not null
      and provider_transaction_id is not null and verified_at is not null)
    or (status <> 'verified' and verified_at is null)
  )
);

-- One unresolved or successful attempt per order; failed attempts may be retried
-- with a new idempotency key after the old failure is independently established.
create unique index shop_bitpay_one_unresolved_per_order
  on halleus_private.shop_payment_attempts (order_id)
  where status in ('created', 'redirect_ready', 'verify_pending', 'review_required', 'verified');
create index shop_bitpay_attempt_order_history
  on halleus_private.shop_payment_attempts (order_id, created_at desc);

alter table halleus_private.shop_payment_attempts enable row level security;
revoke all on halleus_private.shop_payment_attempts from public, anon, authenticated;
comment on table halleus_private.shop_payment_attempts is
  'Server-only BitPay.ir attempt ledger; callback token and idempotency stored hashed; no card or shipping data.';

commit;
