-- Safe queue-wide reflow snapshots. Forward-only; no production queue mutation.
begin;

alter table halleus_private.wiki_schedule_settings
  add column if not exists last_reflow_daily_capacity integer;

update halleus_private.wiki_schedule_settings
set last_reflow_daily_capacity = max_articles_per_day
where last_reflow_daily_capacity is null;

alter table halleus_private.wiki_schedule_settings
  drop constraint if exists wiki_schedule_settings_last_reflow_capacity_check;
alter table halleus_private.wiki_schedule_settings
  add constraint wiki_schedule_settings_last_reflow_capacity_check
  check (last_reflow_daily_capacity between 1 and 12);

create table if not exists halleus_private.wiki_queue_schedule_snapshots (
  id uuid primary key default gen_random_uuid(),
  plan_token text not null unique,
  policy text not null check (policy in ('preserve', 'priority', 'balanced_clusters')),
  previous_daily_capacity integer not null check (previous_daily_capacity between 1 and 12),
  next_daily_capacity integer not null check (next_daily_capacity between 1 and 12),
  queue_snapshot jsonb not null check (jsonb_typeof(queue_snapshot) = 'array'),
  created_by uuid,
  reason text not null,
  created_at timestamptz not null default now(),
  reverted_at timestamptz,
  reverted_by uuid,
  revert_plan_token text
);

create index if not exists wiki_queue_schedule_snapshots_created_at_idx
  on halleus_private.wiki_queue_schedule_snapshots (created_at desc);

commit;

select 'HALLEUS_WIKI_QUEUE_REFLOW_SNAPSHOTS=SUCCESS' as marker;
