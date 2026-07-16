-- Halleus Batch 3: full Wiki CMS, safe package imports, revisions, and publishing.
-- Additive migration. Apply after 0003_wiki_storage.sql.

begin;

do $$
begin
  if to_regclass('public.wiki_articles') is null
    or to_regclass('halleus_private.admin_memberships') is null then
    raise exception 'Apply 0002_secure_admin_core.sql and 0003_wiki_storage.sql first.';
  end if;
end;
$$;

alter table halleus_private.admin_memberships
  drop constraint if exists admin_memberships_role_check;
alter table halleus_private.admin_memberships
  add constraint admin_memberships_role_check
  check (role in ('owner', 'admin', 'editor', 'publisher', 'support', 'analyst'));

create table if not exists halleus_private.admin_capability_grants (
  user_id uuid not null references auth.users(id) on delete cascade,
  capability text not null check (capability in (
    'wiki.read',
    'wiki.draft.write',
    'wiki.import.write',
    'wiki.publish.write',
    'wiki.settings.write',
    'wiki.media.write'
  )),
  is_granted boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  primary key (user_id, capability)
);

alter table public.wiki_articles
  add column if not exists stable_id text,
  add column if not exists body_markdown text,
  add column if not exists tags jsonb not null default '[]'::jsonb,
  add column if not exists publication_priority integer not null default 0,
  add column if not exists content_cluster text,
  add column if not exists article_role text not null default 'support',
  add column if not exists content_version integer not null default 1,
  add column if not exists related_article_ids jsonb not null default '[]'::jsonb,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid,
  add column if not exists deleted_from_status text;

update public.wiki_articles
set stable_id = slug,
    related_article_ids = related_slugs
where stable_id is null;

alter table public.wiki_articles
  alter column stable_id set not null;

alter table public.wiki_articles
  drop constraint if exists wiki_articles_stable_id_check;
alter table public.wiki_articles
  add constraint wiki_articles_stable_id_check
  check (stable_id ~ '^[a-z0-9]+(?:[._-][a-z0-9]+)*$');

alter table public.wiki_articles
  drop constraint if exists wiki_articles_tags_check;
alter table public.wiki_articles
  add constraint wiki_articles_tags_check
  check (jsonb_typeof(tags) = 'array');

alter table public.wiki_articles
  drop constraint if exists wiki_articles_related_ids_check;
alter table public.wiki_articles
  add constraint wiki_articles_related_ids_check
  check (jsonb_typeof(related_article_ids) = 'array');

alter table public.wiki_articles
  drop constraint if exists wiki_articles_article_role_check;
alter table public.wiki_articles
  add constraint wiki_articles_article_role_check
  check (article_role in ('pillar', 'support'));

alter table public.wiki_articles
  drop constraint if exists wiki_articles_deleted_from_status_check;
alter table public.wiki_articles
  add constraint wiki_articles_deleted_from_status_check
  check (deleted_from_status is null or deleted_from_status in ('draft', 'scheduled', 'published', 'archived'));

create unique index if not exists wiki_articles_stable_id_idx
  on public.wiki_articles (stable_id);
create index if not exists wiki_articles_cms_queue_idx
  on public.wiki_articles (status, deleted_at, updated_at desc);
create index if not exists wiki_articles_cluster_idx
  on public.wiki_articles (content_cluster, article_role, publication_priority desc);

alter table public.wiki_article_revisions
  add column if not exists revision_status text not null default 'published',
  add column if not exists source_package_id uuid,
  add column if not exists published_at timestamptz,
  add column if not exists rolled_back_from_revision integer;

alter table public.wiki_article_revisions
  drop constraint if exists wiki_article_revisions_status_check;
alter table public.wiki_article_revisions
  add constraint wiki_article_revisions_status_check
  check (revision_status in ('draft', 'scheduled', 'published', 'superseded', 'quarantined'));

create table if not exists public.wiki_article_drafts (
  article_id uuid primary key references public.wiki_articles(id) on delete restrict,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  base_revision integer not null default 0 check (base_revision >= 0),
  updated_by uuid,
  autosaved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wiki_assets (
  id uuid primary key default gen_random_uuid(),
  content_hash text not null unique check (content_hash ~ '^[0-9a-f]{64}$'),
  storage_bucket text not null default 'wiki-media',
  storage_path text not null unique,
  original_name text not null check (char_length(original_name) between 1 and 300),
  mime_type text not null check (mime_type in ('image/png', 'image/jpeg', 'image/webp')),
  byte_size integer not null check (byte_size between 1 and 5242880),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  alt_text text not null check (char_length(alt_text) between 1 and 500),
  created_by uuid,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.wiki_internal_links (
  source_article_id uuid not null references public.wiki_articles(id) on delete restrict,
  target_stable_id text not null,
  link_kind text not null check (link_kind in ('inline', 'related')),
  source_token text not null,
  created_at timestamptz not null default now(),
  primary key (source_article_id, target_stable_id, link_kind, source_token)
);

create index if not exists wiki_internal_links_target_idx
  on public.wiki_internal_links (target_stable_id, source_article_id);

create table if not exists halleus_private.wiki_import_packages (
  id uuid primary key default gen_random_uuid(),
  package_name text not null check (char_length(package_name) between 1 and 300),
  package_hash text not null unique check (package_hash ~ '^[0-9a-f]{64}$'),
  schema_version integer not null check (schema_version = 1),
  import_mode text not null check (import_mode in ('auto_schedule', 'review_first')),
  status text not null default 'validating'
    check (status in ('validating', 'imported', 'partially_imported', 'rejected', 'failed')),
  article_count integer not null default 0 check (article_count >= 0),
  imported_count integer not null default 0 check (imported_count >= 0),
  quarantined_count integer not null default 0 check (quarantined_count >= 0),
  validation_summary jsonb not null default '{}'::jsonb
    check (jsonb_typeof(validation_summary) = 'object'),
  uploaded_by uuid not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists halleus_private.wiki_import_items (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references halleus_private.wiki_import_packages(id) on delete restrict,
  stable_id text not null,
  article_id uuid references public.wiki_articles(id) on delete restrict,
  requested_slug text,
  status text not null check (status in ('imported', 'drafted', 'scheduled', 'quarantined', 'failed')),
  errors jsonb not null default '[]'::jsonb check (jsonb_typeof(errors) = 'array'),
  scheduled_for timestamptz,
  created_at timestamptz not null default now(),
  unique (package_id, stable_id)
);

create table if not exists halleus_private.wiki_publish_jobs (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.wiki_articles(id) on delete restrict,
  revision_number integer not null,
  run_at timestamptz not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'retry', 'published', 'failed', 'canceled')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 3),
  last_error text check (last_error is null or char_length(last_error) <= 2000),
  locked_at timestamptz,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (article_id, revision_number)
    references public.wiki_article_revisions(article_id, revision_number) on delete restrict,
  unique (article_id, revision_number)
);

create index if not exists wiki_publish_jobs_due_idx
  on halleus_private.wiki_publish_jobs (run_at, created_at)
  where status in ('queued', 'retry');

create table if not exists halleus_private.wiki_schedule_settings (
  singleton boolean primary key default true check (singleton),
  articles_per_week integer not null default 3 check (articles_per_week between 1 and 14),
  allowed_weekdays jsonb not null default '[0,2,4]'::jsonb
    check (jsonb_typeof(allowed_weekdays) = 'array'),
  publish_time time not null default '10:00',
  timezone text not null default 'Asia/Tehran',
  minimum_interval_hours integer not null default 20 check (minimum_interval_hours between 1 and 168),
  blackout_dates jsonb not null default '[]'::jsonb check (jsonb_typeof(blackout_dates) = 'array'),
  one_per_day boolean not null default true,
  pillar_before_support boolean not null default true,
  max_horizon_days integer not null default 180 check (max_horizon_days between 7 and 730),
  publishing_paused boolean not null default false,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

insert into halleus_private.wiki_schedule_settings (singleton)
values (true)
on conflict (singleton) do nothing;

create index if not exists wiki_import_packages_created_idx
  on halleus_private.wiki_import_packages (created_at desc);
create index if not exists wiki_import_items_package_idx
  on halleus_private.wiki_import_items (package_id, status, created_at);

drop trigger if exists wiki_article_drafts_set_updated_at on public.wiki_article_drafts;
create trigger wiki_article_drafts_set_updated_at
before update on public.wiki_article_drafts
for each row execute function halleus_private.set_updated_at();

drop trigger if exists wiki_publish_jobs_set_updated_at on halleus_private.wiki_publish_jobs;
create trigger wiki_publish_jobs_set_updated_at
before update on halleus_private.wiki_publish_jobs
for each row execute function halleus_private.set_updated_at();

drop trigger if exists wiki_schedule_settings_set_updated_at on halleus_private.wiki_schedule_settings;
create trigger wiki_schedule_settings_set_updated_at
before update on halleus_private.wiki_schedule_settings
for each row execute function halleus_private.set_updated_at();

alter table halleus_private.admin_capability_grants enable row level security;
alter table halleus_private.wiki_import_packages enable row level security;
alter table halleus_private.wiki_import_items enable row level security;
alter table halleus_private.wiki_publish_jobs enable row level security;
alter table halleus_private.wiki_schedule_settings enable row level security;
alter table public.wiki_article_drafts enable row level security;
alter table public.wiki_assets enable row level security;
alter table public.wiki_internal_links enable row level security;

revoke all on halleus_private.admin_capability_grants from public, anon, authenticated;
revoke all on halleus_private.wiki_import_packages from public, anon, authenticated;
revoke all on halleus_private.wiki_import_items from public, anon, authenticated;
revoke all on halleus_private.wiki_publish_jobs from public, anon, authenticated;
revoke all on halleus_private.wiki_schedule_settings from public, anon, authenticated;
revoke all on public.wiki_article_drafts from public, anon, authenticated;
revoke all on public.wiki_assets from public, anon, authenticated;
revoke all on public.wiki_internal_links from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wiki-media',
  'wiki-media',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on table public.wiki_article_drafts is
  'Mutable autosave workspace; published article rows are never silently overwritten.';
comment on table halleus_private.wiki_publish_jobs is
  'Server-only bounded publication queue processed by the authenticated Wiki publisher.';
comment on table halleus_private.wiki_import_packages is
  'Audit-friendly result of a validated standard Halleus Wiki ZIP import.';

commit;

select 'HALLEUS_V01328_FULL_WIKI_CMS_MIGRATION=SUCCESS' as marker;
