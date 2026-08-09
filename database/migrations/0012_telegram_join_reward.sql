-- Telegram join reward: one lifetime 24h Premium reward per Halleus account and Telegram user.
-- Forward-only. Apply only during the final Telegram release.
begin;

create table if not exists halleus_private.telegram_reward_challenges (
  id uuid primary key default gen_random_uuid(),
  halleus_user_id uuid not null,
  token_hash text not null unique check (char_length(token_hash) = 64),
  telegram_user_id bigint,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  linked_at timestamptz,
  constraint telegram_reward_challenge_window check (expires_at > created_at),
  constraint telegram_reward_link_state check (
    (telegram_user_id is null and linked_at is null)
    or (telegram_user_id is not null and linked_at is not null)
  )
);

create index if not exists telegram_reward_challenges_user_created_idx
  on halleus_private.telegram_reward_challenges (halleus_user_id, created_at desc);
create index if not exists telegram_reward_challenges_expiry_idx
  on halleus_private.telegram_reward_challenges (expires_at);

create table if not exists halleus_private.telegram_reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  halleus_user_id uuid not null,
  telegram_user_id bigint not null,
  redeemed_at timestamptz not null default now(),
  premium_starts_at timestamptz not null,
  premium_ends_at timestamptz not null,
  source text not null default 'telegram_join_reward'
    check (source = 'telegram_join_reward'),
  constraint telegram_join_reward_user_once unique (halleus_user_id),
  constraint telegram_join_reward_telegram_once unique (telegram_user_id),
  constraint telegram_join_reward_exact_24h check (
    premium_ends_at = premium_starts_at + interval '24 hours'
  )
);

create index if not exists telegram_reward_redemptions_active_idx
  on halleus_private.telegram_reward_redemptions (halleus_user_id, premium_ends_at desc);

alter table halleus_private.telegram_reward_challenges enable row level security;
alter table halleus_private.telegram_reward_redemptions enable row level security;

revoke all on halleus_private.telegram_reward_challenges from public, anon, authenticated;
revoke all on halleus_private.telegram_reward_redemptions from public, anon, authenticated;

create or replace function halleus_private.reject_telegram_reward_redemption_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'telegram_reward_redemptions is append-only';
end;
$$;

drop trigger if exists telegram_reward_redemptions_no_update
  on halleus_private.telegram_reward_redemptions;
create trigger telegram_reward_redemptions_no_update
before update on halleus_private.telegram_reward_redemptions
for each row execute function halleus_private.reject_telegram_reward_redemption_mutation();

drop trigger if exists telegram_reward_redemptions_no_delete
  on halleus_private.telegram_reward_redemptions;
create trigger telegram_reward_redemptions_no_delete
before delete on halleus_private.telegram_reward_redemptions
for each row execute function halleus_private.reject_telegram_reward_redemption_mutation();

comment on table halleus_private.telegram_reward_redemptions is
  'Permanent minimal redemption ledger. Stores only Halleus account UUID, Telegram numeric user ID, and reward timestamps; no Telegram profile fields.';

commit;

select 'HALLEUS_TELEGRAM_JOIN_REWARD=SUCCESS' as marker;