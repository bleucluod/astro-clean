-- EW-01: stable placement anchors and independently reviewed AI suggestions.
-- Run after 0036 with a verified backup and explicit production approval.
begin;

alter table halleus_private.wiki_shop_showcases
  add column if not exists section_anchor text;

create table if not exists halleus_private.wiki_shop_showcase_proposals (
  id uuid primary key,
  article_id uuid not null references public.wiki_articles(id) on delete restrict,
  source_batch_id text not null,
  product_id text check (product_id in ('p01', 'p02', 'p03')),
  article_version integer not null check (article_version > 0),
  after_section_index integer check (after_section_index >= 0),
  section_anchor text,
  section_title text,
  title text,
  description text,
  button_label text,
  skip_reason text,
  status text not null default 'pending'
    check (status in ('pending', 'rejected', 'published', 'skipped')),
  reviewed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_batch_id, article_id)
);

create table if not exists halleus_private.wiki_shop_showcase_exports (
  batch_id text not null,
  article_id uuid not null references public.wiki_articles(id) on delete restrict,
  product_ids jsonb not null,
  created_at timestamptz not null default now(),
  primary key (batch_id, article_id)
);
create index if not exists wiki_shop_showcase_exports_article_idx
  on halleus_private.wiki_shop_showcase_exports (article_id, created_at desc);
alter table halleus_private.wiki_shop_showcase_exports enable row level security;
revoke all on halleus_private.wiki_shop_showcase_exports from public, anon, authenticated;

create index if not exists wiki_shop_showcase_proposals_article_state_idx
  on halleus_private.wiki_shop_showcase_proposals (article_id, status, created_at desc);

alter table halleus_private.wiki_shop_showcase_proposals enable row level security;
revoke all on halleus_private.wiki_shop_showcase_proposals from public, anon, authenticated;
comment on table halleus_private.wiki_shop_showcase_proposals is
  'Private AI suggestions. Only explicit owner-reviewed publication changes the live Wiki.';

commit;
