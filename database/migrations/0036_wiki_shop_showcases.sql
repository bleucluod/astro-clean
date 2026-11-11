-- One curated, independently managed Wiki product showcase per article.
-- Additive private table: no changes to orders, payments or Wiki content.
begin;

create table if not exists halleus_private.wiki_shop_showcases (
  article_id uuid primary key references public.wiki_articles(id) on delete restrict,
  product_id text not null check (product_id in ('p01', 'p02', 'p03')),
  after_section_index integer not null check (after_section_index >= 0),
  section_title text not null check (char_length(section_title) between 1 and 300),
  article_version integer not null check (article_version >= 1),
  title text not null check (char_length(title) between 1 and 160),
  description text not null check (char_length(description) between 1 and 500),
  button_label text not null check (char_length(button_label) between 1 and 80),
  enabled boolean not null default false,
  revision integer not null default 1 check (revision >= 1),
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wiki_shop_showcases_enabled_idx
  on halleus_private.wiki_shop_showcases (product_id)
  where enabled = true;

alter table halleus_private.wiki_shop_showcases enable row level security;
revoke all on halleus_private.wiki_shop_showcases from public, anon, authenticated;
comment on table halleus_private.wiki_shop_showcases is
  'Server-side reviewed product placements; content remains in public.wiki_articles.';

commit;
