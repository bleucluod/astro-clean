-- First-party public traffic analytics. Private temporary sessions, durable aggregates.
-- Apply manually only after production backup, never as part of code deployment.
-- No user IDs, IP addresses, raw referrers, birth details or report content.
begin;

create table if not exists halleus_private.analytics_live_sessions (
  session_id uuid primary key,
  source text not null check (source in ('direct','google','bing','search','instagram','telegram','social','external')),
  area text not null check (area in ('home','wiki','shop','chart','sky','compare','other')),
  page_path text not null check (char_length(page_path) between 1 and 160),
  last_seen timestamptz not null default now()
);

create index if not exists analytics_live_sessions_seen_idx
  on halleus_private.analytics_live_sessions (last_seen);

create table if not exists halleus_private.analytics_daily (
  day date not null,
  page_path text not null check (char_length(page_path) between 1 and 160),
  source text not null check (source in ('direct','google','bing','search','instagram','telegram','social','external')),
  views bigint not null default 0 check (views >= 0),
  sessions bigint not null default 0 check (sessions >= 0),
  product_clicks bigint not null default 0 check (product_clicks >= 0),
  chart_starts bigint not null default 0 check (chart_starts >= 0),
  checkout_starts bigint not null default 0 check (checkout_starts >= 0),
  primary key (day, page_path, source)
);

create index if not exists analytics_daily_page_idx
  on halleus_private.analytics_daily (page_path, day);

create table if not exists halleus_private.analytics_seen_daily (
  day date not null,
  session_id uuid not null,
  page_path text not null check (char_length(page_path) between 1 and 160),
  primary key (day, session_id, page_path)
);

create index if not exists analytics_seen_daily_day_idx
  on halleus_private.analytics_seen_daily (day);

alter table halleus_private.analytics_live_sessions enable row level security;
alter table halleus_private.analytics_daily enable row level security;
alter table halleus_private.analytics_seen_daily enable row level security;

revoke all on halleus_private.analytics_live_sessions from public, anon, authenticated;
revoke all on halleus_private.analytics_daily from public, anon, authenticated;
revoke all on halleus_private.analytics_seen_daily from public, anon, authenticated;

comment on table halleus_private.analytics_live_sessions is
  'Temporary anonymous presence, purged opportunistically after 48 hours. No account linkage.';
comment on table halleus_private.analytics_daily is
  'Durable daily public-page and interaction totals with no session identifiers.';
comment on table halleus_private.analytics_seen_daily is
  'Short-lived deduplication only; purged opportunistically after two calendar days.';

commit;
