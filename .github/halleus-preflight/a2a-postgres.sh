#!/usr/bin/env bash
set -Eeuo pipefail

: "${PGHOST:=127.0.0.1}"
: "${PGPORT:=5432}"
: "${PGUSER:=postgres}"
: "${PGDATABASE:=halleus_preflight}"

MIGRATION="evidence/database/migrations/0009_report_publication_persistence.sql"

if [[ ! -f "$MIGRATION" ]]; then
  echo "MIGRATION_NOT_FOUND=$MIGRATION" >&2
  exit 2
fi

psql -v ON_ERROR_STOP=1 <<'SQL'
create table public.halleus_reports (
  id text primary key,
  user_id text not null,
  report_json jsonb not null default '{}'::jsonb,
  note text,
  favorite boolean not null default false,
  visibility text not null default 'private',
  source text not null default 'account',
  title text,
  share_token_hash text,
  share_enabled boolean not null default false,
  restricted_at timestamptz,
  restricted_by uuid,
  restriction_reason text,
  deleted_at timestamptz,
  deleted_by uuid,
  delete_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.halleus_reports (
  id,
  user_id,
  visibility,
  share_enabled,
  share_token_hash
) values
  ('legacy-private', 'u1', 'private', false, null),
  ('legacy-shared', 'u1', 'shared_by_link', true, 'token-hash'),
  ('legacy-restricted', 'u1', 'restricted_by_admin', false, null),
  ('legacy-unpublished', 'u1', 'unpublished', false, null);
SQL

psql -v ON_ERROR_STOP=1 -f "$MIGRATION"

psql -v ON_ERROR_STOP=1 <<'SQL'
do $$
declare
  invalid_count integer;
begin
  select count(*)
  into invalid_count
  from public.halleus_reports
  where publication_owner_kind <> 'legacy'
     or access_tier <> 'free'
     or identity_consent_state <> 'withheld'
     or publication_policy_version <> '1';

  if invalid_count <> 0 then
    raise exception 'legacy backfill mismatch';
  end if;

  if (select publication_state from public.halleus_reports where id = 'legacy-private') <> 'private' then
    raise exception 'private backfill mismatch';
  end if;

  if (select publication_state from public.halleus_reports where id = 'legacy-shared') <> 'private' then
    raise exception 'shared-link publication must stay private';
  end if;

  if (select visibility from public.halleus_reports where id = 'legacy-shared') <> 'shared_by_link' then
    raise exception 'sharing visibility was altered';
  end if;

  if (select publication_state from public.halleus_reports where id = 'legacy-restricted') <> 'restricted' then
    raise exception 'restricted backfill mismatch';
  end if;

  if (select publication_state from public.halleus_reports where id = 'legacy-unpublished') <> 'unpublished' then
    raise exception 'unpublished backfill mismatch';
  end if;
end $$;

do $$
begin
  begin
    update public.halleus_reports
    set publication_state = 'public'
    where id = 'legacy-private';

    raise exception 'legacy public state was accepted';
  exception
    when check_violation then null;
  end;
end $$;

insert into public.halleus_reports (
  id,
  user_id,
  publication_owner_kind,
  access_tier,
  publication_intent,
  publication_state,
  publication_consent_state,
  identity_consent_state,
  publication_policy_version
) values (
  'premium-public',
  'u2',
  'account',
  'premium',
  'publish',
  'public',
  'granted',
  'withheld',
  '1'
);

do $$
begin
  begin
    insert into public.halleus_reports (
      id,
      user_id,
      publication_owner_kind,
      access_tier,
      publication_intent,
      publication_state,
      publication_consent_state,
      identity_consent_state,
      publication_policy_version
    ) values (
      'premium-no-consent',
      'u2',
      'account',
      'premium',
      'publish',
      'public',
      'pending',
      'withheld',
      '1'
    );

    raise exception 'premium public state without consent was accepted';
  exception
    when check_violation then null;
  end;
end $$;
SQL

echo "POSTGRES_MIGRATION_PREFLIGHT=PASS"
