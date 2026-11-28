-- Candidate only. Requires 0032, explicit migration approval and isolated PostgreSQL verification.
begin;
create table halleus_private.comparison_premium_reports (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid references auth.users(id) on delete restrict,
 guest_owner_id uuid,
 retry_key text not null check(retry_key ~ '^[A-Za-z0-9_-]{16,128}$'),
 binding_hash text not null check(binding_hash ~ '^[a-f0-9]{64}$'),
 record jsonb not null check(jsonb_typeof(record)='object' and coalesce(record->>'id','')=id::text and coalesce(record->>'version','')='comparison-product-v1' and coalesce(record->>'relationshipContext','')='romantic'),
 preview jsonb not null check(jsonb_typeof(preview)='object' and coalesce(preview->>'version','')='comparison-chapter-preview-v7' and jsonb_typeof(preview->'readyForSale')='boolean'),
 ready_for_sale boolean not null check(ready_for_sale is not distinct from (preview->>'readyForSale')::boolean),
 created_at timestamptz not null default now(),
 check((owner_id is null) <> (guest_owner_id is null)),
 unique(owner_id,retry_key), unique(guest_owner_id,retry_key)
);
create index comparison_premium_account_created_idx on halleus_private.comparison_premium_reports(owner_id,created_at desc,id);
create index comparison_premium_guest_created_idx on halleus_private.comparison_premium_reports(guest_owner_id,created_at desc,id) where guest_owner_id is not null;
alter table halleus_private.comparison_premium_reports enable row level security;
revoke all on halleus_private.comparison_premium_reports from public,anon,authenticated;
create table halleus_private.comparison_premium_payments (
 id uuid primary key default gen_random_uuid(),
 report_id uuid not null unique references halleus_private.comparison_premium_reports(id) on delete restrict,
 factor_id bigint not null unique default nextval('halleus_private.shared_display_numbers_seq'::regclass) check(factor_id>0),
 amount_toman integer not null check(amount_toman=500000),
 amount_rial bigint not null check(amount_rial=amount_toman::bigint*10),
 proof_hash text not null unique check(proof_hash ~ '^[a-f0-9]{64}$'),
 status text not null default 'created' check(status in ('created','redirect_ready','verify_pending','verified','review_required')),
 provider_payment_id text unique check(provider_payment_id ~ '^[1-9][0-9]{0,63}$'),
 provider_transaction_id text unique check(provider_transaction_id ~ '^[1-9][0-9]{0,63}$'),
 verified_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(status not in ('redirect_ready','verify_pending','verified') or provider_payment_id is not null),
 check(status not in ('verify_pending','verified') or provider_transaction_id is not null),
 check((status='verified')=(verified_at is not null))
);
alter table halleus_private.comparison_premium_payments enable row level security;
revoke all on halleus_private.comparison_premium_payments from public, anon, authenticated;
comment on table halleus_private.comparison_premium_payments is 'One invoice per private comparison report. Verified invoice is its entitlement. Uncertain attempts must not trigger another charge.';
commit;
