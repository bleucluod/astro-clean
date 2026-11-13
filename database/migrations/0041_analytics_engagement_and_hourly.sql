-- Halleus analytics: additive active-engagement, hourly trends and temporary presence.
-- Apply only after an approved production backup, independently from code release.
-- All long-lived metrics are counts or sums; per-session rows expire within two days.
begin;

alter table halleus_private.analytics_live_sessions
  add column if not exists last_engagement_at timestamptz not null default now(),
  add column if not exists visitor_kind text not null default 'unknown'
    check (visitor_kind in ('new','returning','unknown')),
  add column if not exists campaign boolean not null default false;

alter table halleus_private.analytics_daily
  add column if not exists active_seconds bigint not null default 0 check (active_seconds >= 0),
  add column if not exists entrances bigint not null default 0 check (entrances >= 0),
  add column if not exists new_visits bigint not null default 0 check (new_visits >= 0),
  add column if not exists returning_visits bigint not null default 0 check (returning_visits >= 0),
  add column if not exists campaign_visits bigint not null default 0 check (campaign_visits >= 0),
  add column if not exists scroll_50 bigint not null default 0 check (scroll_50 >= 0),
  add column if not exists scroll_90 bigint not null default 0 check (scroll_90 >= 0),
  add column if not exists internal_clicks bigint not null default 0 check (internal_clicks >= 0),
  add column if not exists chart_completions bigint not null default 0 check (chart_completions >= 0),
  add column if not exists compare_starts bigint not null default 0 check (compare_starts >= 0),
  add column if not exists compare_completions bigint not null default 0 check (compare_completions >= 0);

create table if not exists halleus_private.analytics_minute_presence (
  minute timestamptz not null,
  session_id uuid not null,
  area text not null check (area in ('home','wiki','shop','chart','sky','compare','other')),
  primary key (minute, session_id)
);
create index if not exists analytics_minute_presence_minute_idx
  on halleus_private.analytics_minute_presence (minute);

create table if not exists halleus_private.analytics_page_progress (
  day date not null,
  session_id uuid not null,
  page_path text not null check (char_length(page_path) between 1 and 160),
  max_scroll smallint not null default 0 check (max_scroll between 0 and 100),
  primary key (day, session_id, page_path)
);
create index if not exists analytics_page_progress_day_idx
  on halleus_private.analytics_page_progress (day);

create table if not exists halleus_private.analytics_hourly (
  hour timestamptz not null,
  area text not null check (area in ('home','wiki','shop','chart','sky','compare','other')),
  views bigint not null default 0 check (views >= 0),
  active_seconds bigint not null default 0 check (active_seconds >= 0),
  product_clicks bigint not null default 0 check (product_clicks >= 0),
  primary key (hour, area)
);

alter table halleus_private.analytics_minute_presence enable row level security;
alter table halleus_private.analytics_page_progress enable row level security;
alter table halleus_private.analytics_hourly enable row level security;

revoke all on halleus_private.analytics_minute_presence from public, anon, authenticated;
revoke all on halleus_private.analytics_page_progress from public, anon, authenticated;
revoke all on halleus_private.analytics_hourly from public, anon, authenticated;

comment on table halleus_private.analytics_minute_presence is
  'Temporary anonymous minute buckets for approximate recent presence; delete after two days.';
comment on table halleus_private.analytics_page_progress is
  'Temporary anonymous per-page scroll deduplication; delete after two days.';
comment on table halleus_private.analytics_hourly is
  'Permanent anonymous site-area hour totals, without visitor or page-level identifiers.';

commit;
