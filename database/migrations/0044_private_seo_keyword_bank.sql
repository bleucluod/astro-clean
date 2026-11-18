-- Private SEO keyword ownership and manually imported GSC queries.
-- Additive only; no public pages, orders, profiles or authentication changes.
-- Apply to a local/dev database for preview first. Production needs separate approval.
begin;

create table halleus_private.seo_keyword_targets (
  page_key text not null check (char_length(page_key) between 5 and 250),
  phrase_key text not null check (char_length(phrase_key) between 2 and 200),
  phrase text not null check (char_length(phrase) between 2 and 200),
  kind text not null check (kind in ('primary', 'secondary', 'long_tail')),
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (page_key, phrase_key)
);
create unique index seo_keyword_one_primary_per_page_idx
  on halleus_private.seo_keyword_targets (page_key) where kind = 'primary';
create index seo_keyword_phrase_lookup_idx
  on halleus_private.seo_keyword_targets (phrase_key);

create table halleus_private.seo_gsc_queries (
  page_key text not null check (char_length(page_key) between 5 and 250),
  query_key text not null check (char_length(query_key) between 2 and 200),
  query text not null check (char_length(query) between 2 and 200),
  period_start date not null,
  period_end date not null,
  clicks integer not null check (clicks >= 0),
  impressions integer not null check (impressions >= 0),
  ctr numeric(8,6) not null check (ctr between 0 and 1),
  position numeric(9,3) not null check (position between 0 and 10000),
  source_name text not null check (char_length(source_name) between 1 and 180),
  imported_by uuid,
  imported_at timestamptz not null default now(),
  primary key (page_key, period_start, period_end, query_key),
  check (period_start <= period_end),
  check (clicks <= impressions)
);
create index seo_gsc_queries_page_latest_idx
  on halleus_private.seo_gsc_queries (page_key, imported_at desc);

alter table halleus_private.seo_keyword_targets enable row level security;
alter table halleus_private.seo_gsc_queries enable row level security;
revoke all on halleus_private.seo_keyword_targets, halleus_private.seo_gsc_queries
  from public, anon, authenticated;
comment on table halleus_private.seo_keyword_targets is
  'Private editable SEO keyword assignments; not public meta keywords.';
comment on table halleus_private.seo_gsc_queries is
  'Owner-uploaded page-filtered Search Console query CSV metrics, not an API feed.';
commit;
