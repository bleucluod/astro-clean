-- Privacy-preserving aggregate performance for published Wiki shop showcases.
-- Apply explicitly after a verified production database backup; never on code deploy.
-- No visitor IDs, IP addresses, cookies, or event-level activity are stored.
begin;

create table if not exists halleus_private.wiki_shop_showcase_daily_metrics (
  showcase_id uuid not null references halleus_private.wiki_shop_showcases(id) on delete cascade,
  product_id text not null check (product_id in ('p01','p02','p03')),
  day date not null,
  impressions bigint not null default 0 check (impressions >= 0),
  clicks bigint not null default 0 check (clicks >= 0),
  primary key (showcase_id, product_id, day)
);

create index if not exists wiki_showcase_daily_metrics_day_idx
  on halleus_private.wiki_shop_showcase_daily_metrics (day);

alter table halleus_private.wiki_shop_showcase_daily_metrics enable row level security;
revoke all on halleus_private.wiki_shop_showcase_daily_metrics from public, anon, authenticated;

comment on table halleus_private.wiki_shop_showcase_daily_metrics is
  'Aggregate impression and click counts by UTC date and reviewed showcase, with no visitor identifiers.';

commit;
