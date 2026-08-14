-- Halleus Pre-Deploy Batch 2:
-- credit resources + permanent per-output unlock + versioned access policy.
-- This migration has never been production-applied. Local runners stage it only.
begin;

alter table halleus_private.premium_requests
  add column if not exists product_code text;

alter table halleus_private.premium_requests
  drop constraint if exists premium_requests_product_code_check;

alter table halleus_private.premium_requests
  add constraint premium_requests_product_code_check
  check (
    product_code is null
    or product_code ~ '^[a-z0-9]+(_[a-z0-9]+)*$'
  );

create index if not exists premium_requests_product_code_idx
  on halleus_private.premium_requests (product_code, status, created_at desc);

create table if not exists halleus_private.product_packages (
  code text primary key
    check (code ~ '^[a-z0-9]+(_[a-z0-9]+)*$'),
  name text not null,
  active boolean not null default false,
  price_minor bigint not null check (price_minor >= 0),
  currency text not null check (currency = 'IRR'),
  full_report_credits integer not null default 0
    check (full_report_credits >= 0),
  relationship_credits integer not null default 0
    check (relationship_credits >= 0),
  display_order integer not null default 0,
  badge text,
  cta text not null default '',
  description text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid
);

insert into halleus_private.product_packages (
  code, name, active, price_minor, currency,
  full_report_credits, relationship_credits,
  display_order, badge, cta, description
)
values
  (
    'single_full', 'یک گزارش کامل', false, 1490000, 'IRR',
    1, 0, 10, null, 'گرفتن یک گزارش کامل',
    'یک اعتبار برای بازکردن دائمی یک گزارش تولد کامل.'
  ),
  (
    'full_5', '۵ گزارش کامل', true, 5000000, 'IRR',
    5, 0, 20, 'پیشنهاد اصلی', 'گرفتن ۵ گزارش کامل',
    'پنج اعتبار مستقل گزارش کامل.'
  ),
  (
    'couple_5_2', '۵ گزارش کامل + ۲ تحلیل رابطه', true, 7000000, 'IRR',
    5, 2, 30, 'برای دو نفر', 'گرفتن بسته رابطه',
    'پنج گزارش کامل و دو تحلیل رابطه خصوصی.'
  )
on conflict (code) do nothing;

create table if not exists halleus_private.report_access_policy (
  singleton_id smallint primary key default 1
    check (singleton_id = 1),
  version integer not null default 1 check (version >= 1),
  config jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

insert into halleus_private.report_access_policy (
  singleton_id, version, config
)
values (
  1,
  1,
  '{
    "topStoriesFreeCount": 1,
    "importantHousesFreeCount": 1,
    "importantAspectsFreeCount": 1,
    "weeklyActionsFreeCount": 1,
    "nodeAxis": "teaser",
    "energyBalance": "teaser",
    "planetChapters": {
      "mercury": "premium",
      "venus": "premium",
      "mars": "premium",
      "jupiter": "premium",
      "saturn": "premium",
      "uranus": "premium",
      "neptune": "premium",
      "pluto": "premium"
    },
    "evidence": "compact_free",
    "technical": {
      "wheel": "free",
      "appendix": "premium",
      "provenance": "premium"
    },
    "upgradeTitle": null,
    "upgradeCtaLabel": null,
    "upgradeSupportSentence": null
  }'::jsonb
)
on conflict (singleton_id) do nothing;

create table if not exists halleus_private.account_credit_balances (
  user_id uuid not null references auth.users(id) on delete cascade,
  credit_type text not null
    check (credit_type in ('full_report_credit', 'relationship_credit')),
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, credit_type)
);

create table if not exists halleus_private.credit_ledger (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  credit_type text not null
    check (credit_type in ('full_report_credit', 'relationship_credit')),
  delta integer not null check (delta <> 0),
  balance_after integer not null check (balance_after >= 0),
  source text not null,
  package_code text,
  source_request_id bigint
    references halleus_private.premium_requests(id) on delete set null,
  reason text not null,
  actor_user_id uuid,
  related_report_id text,
  relationship_result_key text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, credit_type, idempotency_key)
);

create index if not exists credit_ledger_user_created_idx
  on halleus_private.credit_ledger (user_id, created_at desc);

create table if not exists halleus_private.report_unlocks (
  user_id uuid not null references auth.users(id) on delete cascade,
  report_id text not null,
  unlocked_at timestamptz not null default now(),
  source_package_code text,
  consume_ledger_id bigint not null
    references halleus_private.credit_ledger(id) on delete restrict,
  primary key (user_id, report_id)
);

create table if not exists halleus_private.relationship_unlocks (
  user_id uuid not null references auth.users(id) on delete cascade,
  result_key text not null,
  unlocked_at timestamptz not null default now(),
  source_package_code text,
  consume_ledger_id bigint not null
    references halleus_private.credit_ledger(id) on delete restrict,
  primary key (user_id, result_key)
);

alter table halleus_private.product_packages enable row level security;
alter table halleus_private.report_access_policy enable row level security;
alter table halleus_private.account_credit_balances enable row level security;
alter table halleus_private.credit_ledger enable row level security;
alter table halleus_private.report_unlocks enable row level security;
alter table halleus_private.relationship_unlocks enable row level security;

revoke all on halleus_private.product_packages from public, anon, authenticated;
revoke all on halleus_private.report_access_policy from public, anon, authenticated;
revoke all on halleus_private.account_credit_balances from public, anon, authenticated;
revoke all on halleus_private.credit_ledger from public, anon, authenticated;
revoke all on halleus_private.report_unlocks from public, anon, authenticated;
revoke all on halleus_private.relationship_unlocks from public, anon, authenticated;

comment on table halleus_private.account_credit_balances is
  'Current account credit resources. Credits are not account-wide unlimited entitlements.';
comment on table halleus_private.report_unlocks is
  'Permanent per-report unlock after one full_report_credit consumption.';
comment on table halleus_private.relationship_unlocks is
  'Durable proof that a locally stored private relationship result consumed one relationship_credit.';
comment on table halleus_private.report_access_policy is
  'Versioned presentation policy controlling what a Free report reveals without regenerating the report.';
comment on table halleus_private.product_packages is
  'Admin-configurable manual-purchase package catalog. Price is integer IRR; activation is explicit.';

commit;
