-- Halleus Batch 7: private-by-default report ownership and safe sharing state.
begin;

alter table public.halleus_reports
  add column if not exists title text,
  add column if not exists share_token_hash text,
  add column if not exists share_enabled boolean not null default false,
  add column if not exists restricted_at timestamptz,
  add column if not exists restricted_by uuid references auth.users(id) on delete set null,
  add column if not exists restriction_reason text,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null,
  add column if not exists delete_reason text;

update public.halleus_reports
set visibility = 'private', share_enabled = false, share_token_hash = null
where visibility <> 'private';

update public.halleus_reports
set title = coalesce(nullif(btrim(report_json #>> '{input,name}'), ''), 'گزارش ذخیره‌شده')
where title is null;

alter table public.halleus_reports
  alter column visibility set default 'private';
alter table public.halleus_reports drop constraint if exists halleus_reports_title_check;
alter table public.halleus_reports
  add constraint halleus_reports_title_check
  check (title is null or char_length(btrim(title)) between 1 and 160);
alter table public.halleus_reports drop constraint if exists halleus_reports_visibility_check;
alter table public.halleus_reports add constraint halleus_reports_visibility_check
  check (visibility in ('private', 'public', 'shared_by_link', 'unpublished', 'restricted_by_admin'));
alter table public.halleus_reports drop constraint if exists halleus_reports_share_state_check;
alter table public.halleus_reports add constraint halleus_reports_share_state_check check (
  (visibility = 'shared_by_link' and share_enabled and share_token_hash is not null and restricted_at is null and deleted_at is null)
  or (visibility <> 'shared_by_link' and not share_enabled and share_token_hash is null)
);
create unique index if not exists halleus_reports_share_token_hash_idx
  on public.halleus_reports (share_token_hash)
  where share_token_hash is not null and deleted_at is null;
create index if not exists halleus_reports_active_owner_idx
  on public.halleus_reports (user_id, created_at desc)
  where deleted_at is null;

commit;
