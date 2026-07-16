-- Halleus Batch 2: database-backed Wiki storage and public read foundation.
-- Additive only. Apply after 0002_secure_admin_core.sql, then run the matching seed.

begin;

create table if not exists public.wiki_categories (
  id text primary key,
  label text not null check (char_length(label) between 1 and 160),
  description text not null check (char_length(description) between 1 and 1000),
  sort_order integer not null check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wiki_categories_sort_order_idx
  on public.wiki_categories (sort_order);

create table if not exists public.wiki_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  category_id text not null references public.wiki_categories(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 300),
  short_title text not null check (char_length(short_title) between 1 and 200),
  seo_title text check (seo_title is null or char_length(seo_title) between 1 and 300),
  meta_description text
    check (meta_description is null or char_length(meta_description) between 1 and 1000),
  summary text not null check (char_length(summary) between 1 and 2000),
  intro text not null check (char_length(intro) between 1 and 5000),
  reading_minutes integer not null check (reading_minutes between 1 and 240),
  key_points jsonb not null check (jsonb_typeof(key_points) = 'array'),
  sections jsonb not null check (jsonb_typeof(sections) = 'array'),
  context_links jsonb check (context_links is null or jsonb_typeof(context_links) = 'array'),
  sources jsonb check (sources is null or jsonb_typeof(sources) = 'array'),
  call_to_action jsonb
    check (call_to_action is null or jsonb_typeof(call_to_action) = 'object'),
  related_slugs jsonb not null check (jsonb_typeof(related_slugs) = 'array'),
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'published', 'archived')),
  is_indexable boolean not null default false,
  published_at timestamptz,
  scheduled_for timestamptz,
  sort_order integer not null check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wiki_articles_publication_state_check check (
    (status = 'published' and published_at is not null and scheduled_for is null)
    or (status = 'scheduled' and published_at is null and scheduled_for is not null)
    or (status in ('draft', 'archived') and scheduled_for is null)
  )
);

create index if not exists wiki_articles_sort_order_idx
  on public.wiki_articles (sort_order);

create index if not exists wiki_articles_public_read_idx
  on public.wiki_articles (sort_order, slug)
  where status = 'published' and is_indexable = true;

create index if not exists wiki_articles_category_idx
  on public.wiki_articles (category_id, sort_order);

create table if not exists public.wiki_article_revisions (
  article_id uuid not null references public.wiki_articles(id) on delete restrict,
  revision_number integer not null check (revision_number >= 1),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  change_note text check (change_note is null or char_length(change_note) <= 1000),
  created_by uuid,
  created_at timestamptz not null default now(),
  primary key (article_id, revision_number)
);

create index if not exists wiki_article_revisions_created_idx
  on public.wiki_article_revisions (created_at desc);

create table if not exists public.wiki_redirects (
  source_slug text primary key
    check (source_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  target_article_id uuid not null references public.wiki_articles(id) on delete restrict,
  http_status smallint not null default 308 check (http_status = 308),
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wiki_redirects_target_idx
  on public.wiki_redirects (target_article_id)
  where is_active = true;

create or replace function halleus_private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists wiki_categories_set_updated_at on public.wiki_categories;
create trigger wiki_categories_set_updated_at
before update on public.wiki_categories
for each row execute function halleus_private.set_updated_at();

drop trigger if exists wiki_articles_set_updated_at on public.wiki_articles;
create trigger wiki_articles_set_updated_at
before update on public.wiki_articles
for each row execute function halleus_private.set_updated_at();

drop trigger if exists wiki_redirects_set_updated_at on public.wiki_redirects;
create trigger wiki_redirects_set_updated_at
before update on public.wiki_redirects
for each row execute function halleus_private.set_updated_at();

create or replace function halleus_private.reject_wiki_revision_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'wiki_article_revisions is append-only';
end;
$$;

drop trigger if exists wiki_article_revisions_no_update
  on public.wiki_article_revisions;
create trigger wiki_article_revisions_no_update
before update on public.wiki_article_revisions
for each row execute function halleus_private.reject_wiki_revision_mutation();

drop trigger if exists wiki_article_revisions_no_delete
  on public.wiki_article_revisions;
create trigger wiki_article_revisions_no_delete
before delete on public.wiki_article_revisions
for each row execute function halleus_private.reject_wiki_revision_mutation();

alter table public.wiki_categories enable row level security;
alter table public.wiki_articles enable row level security;
alter table public.wiki_article_revisions enable row level security;
alter table public.wiki_redirects enable row level security;

revoke all on public.wiki_categories from public, anon, authenticated;
revoke all on public.wiki_articles from public, anon, authenticated;
revoke all on public.wiki_article_revisions from public, anon, authenticated;
revoke all on public.wiki_redirects from public, anon, authenticated;

comment on table public.wiki_articles is
  'Server-read Wiki source. Public pages expose only published, indexable, already-published rows.';

comment on table public.wiki_article_revisions is
  'Append-only content snapshots reserved for the later Wiki CMS batch.';

comment on table public.wiki_redirects is
  'Permanent Wiki slug redirects resolved only when the target article is publicly readable.';

commit;

select 'HALLEUS_V01327_WIKI_STORAGE_MIGRATION=SUCCESS' as marker;
