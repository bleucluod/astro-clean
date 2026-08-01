-- Halleus Batch A2a: persist publication-policy inputs and derived state.
-- Public route activation remains separate; existing access visibility is preserved.
begin;

alter table public.halleus_reports
  add column if not exists publication_owner_kind text not null default 'legacy',
  add column if not exists access_tier text not null default 'free',
  add column if not exists publication_intent text not null default 'default',
  add column if not exists publication_state text not null default 'private',
  add column if not exists publication_consent_state text not null default 'pending',
  add column if not exists identity_consent_state text not null default 'withheld',
  add column if not exists publication_policy_version text not null default '1';

update public.halleus_reports
set
  publication_owner_kind = 'legacy',
  access_tier = 'free',
  publication_intent =
    case when visibility = 'unpublished' then 'unpublish' else 'default' end,
  publication_state =
    case
      when visibility = 'restricted_by_admin' then 'restricted'
      when visibility = 'unpublished' then 'unpublished'
      else 'private'
    end,
  publication_consent_state = 'pending',
  identity_consent_state = 'withheld',
  publication_policy_version = '1';

alter table public.halleus_reports
  drop constraint if exists halleus_reports_publication_owner_kind_check;
alter table public.halleus_reports
  add constraint halleus_reports_publication_owner_kind_check
  check (publication_owner_kind in ('local', 'guest', 'account', 'legacy'));

alter table public.halleus_reports
  drop constraint if exists halleus_reports_access_tier_check;
alter table public.halleus_reports
  add constraint halleus_reports_access_tier_check
  check (access_tier in ('preview', 'free', 'premium'));

alter table public.halleus_reports
  drop constraint if exists halleus_reports_publication_intent_check;
alter table public.halleus_reports
  add constraint halleus_reports_publication_intent_check
  check (publication_intent in ('default', 'publish', 'unpublish'));

alter table public.halleus_reports
  drop constraint if exists halleus_reports_publication_state_check;
alter table public.halleus_reports
  add constraint halleus_reports_publication_state_check
  check (publication_state in ('private', 'public', 'unpublished', 'restricted'));

alter table public.halleus_reports
  drop constraint if exists halleus_reports_publication_consent_state_check;
alter table public.halleus_reports
  add constraint halleus_reports_publication_consent_state_check
  check (publication_consent_state in ('not-required', 'pending', 'granted', 'withdrawn'));

alter table public.halleus_reports
  drop constraint if exists halleus_reports_identity_consent_state_check;
alter table public.halleus_reports
  add constraint halleus_reports_identity_consent_state_check
  check (identity_consent_state in ('withheld', 'granted'));

alter table public.halleus_reports
  drop constraint if exists halleus_reports_publication_policy_version_check;
alter table public.halleus_reports
  add constraint halleus_reports_publication_policy_version_check
  check (publication_policy_version = '1');

alter table public.halleus_reports
  drop constraint if exists halleus_reports_legacy_publication_check;
alter table public.halleus_reports
  add constraint halleus_reports_legacy_publication_check
  check (
    publication_owner_kind <> 'legacy'
    or publication_state <> 'public'
  );

alter table public.halleus_reports
  drop constraint if exists halleus_reports_public_state_consent_check;
alter table public.halleus_reports
  add constraint halleus_reports_public_state_consent_check
  check (
    publication_state <> 'public'
    or (
      publication_owner_kind in ('guest', 'account')
      and (
        (
          access_tier = 'free'
          and publication_consent_state = 'not-required'
        )
        or (
          access_tier = 'premium'
          and publication_intent = 'publish'
          and publication_consent_state = 'granted'
        )
      )
    )
  );

create index if not exists halleus_reports_publication_state_idx
  on public.halleus_reports (publication_state, created_at desc)
  where deleted_at is null;

commit;
