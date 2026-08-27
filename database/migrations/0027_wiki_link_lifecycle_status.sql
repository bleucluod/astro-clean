alter table public.wiki_internal_links
  add column if not exists activation_status text not null default 'active',
  add column if not exists activated_at timestamptz not null default now(),
  add column if not exists last_verified_at timestamptz,
  add column if not exists activation_error text,
  add column if not exists disabled_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'wiki_internal_links_activation_status_check'
  ) then
    alter table public.wiki_internal_links
      add constraint wiki_internal_links_activation_status_check
      check (activation_status in ('pending', 'active', 'failed', 'disabled'));
  end if;
end $$;

update public.wiki_internal_links
set activation_status = 'active',
    activated_at = coalesce(activated_at, created_at, now()),
    last_verified_at = coalesce(last_verified_at, now())
where activation_status = 'active';

create index if not exists wiki_internal_links_active_target_idx
  on public.wiki_internal_links (target_stable_id, source_article_id)
  where activation_status = 'active';