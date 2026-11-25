-- Candidate only; requires 0032 shared sequence and 0045. Explicit operator approval.
begin;
create table halleus_private.vedic_d1_payments (
 id uuid primary key default gen_random_uuid(),
 report_id uuid not null unique references halleus_private.vedic_d1_reports(id) on delete restrict,
 factor_id bigint not null unique default nextval('halleus_private.shared_display_numbers_seq'::regclass) check(factor_id>0),
 amount_toman integer not null check(amount_toman>0),
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
alter table halleus_private.vedic_d1_payments enable row level security;
revoke all on halleus_private.vedic_d1_payments from public, anon, authenticated;
comment on table halleus_private.vedic_d1_payments is 'One invoice per private D1 report. Verified invoice is its entitlement. Uncertain attempts must not trigger another charge.';
commit;
