-- Halleus Batch 4 Slice B: Wiki Image Pipeline.
-- Additive, server-admin-only image workflow. Apply after 0004 and 0019.

begin;

do $$
begin
  if to_regclass('public.wiki_articles') is null
     or to_regclass('public.wiki_assets') is null
     or to_regclass('halleus_private.admin_audit_events') is null then
    raise exception 'Apply Wiki/Admin foundation migrations before 0020_wiki_image_pipeline.sql.';
  end if;
end;
$$;

create table if not exists halleus_private.wiki_image_style_snapshots (
  version text primary key check (version ~ '^[a-z0-9][a-z0-9._-]{5,120}$'),
  source_routes jsonb not null check (source_routes = '["/", "/chart"]'::jsonb),
  contract jsonb not null check (jsonb_typeof(contract) = 'object'),
  created_at timestamptz not null default now(),
  created_by uuid
);

create table if not exists halleus_private.wiki_image_batches (
  id uuid primary key default gen_random_uuid(),
  batch_number bigint generated always as identity unique,
  style_snapshot_version text not null references halleus_private.wiki_image_style_snapshots(version) on delete restrict,
  status text not null default 'exported' check (status in ('exported','returned','completed','needs_retry')),
  article_count integer not null check (article_count between 1 and 5),
  attempt_count integer not null default 0 check (attempt_count between 0 and 10),
  manifest jsonb not null check (jsonb_typeof(manifest) = 'object'),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists halleus_private.wiki_image_batch_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references halleus_private.wiki_image_batches(id) on delete restrict,
  article_id uuid not null references public.wiki_articles(id) on delete restrict,
  stable_id text not null,
  slug text not null,
  brief_version integer not null default 1 check (brief_version >= 1),
  status text not null default 'exported' check (status in ('exported','ready','needs_retry','imported')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 2),
  result_asset_id uuid references public.wiki_assets(id) on delete restrict,
  validation jsonb not null default '{}'::jsonb check (jsonb_typeof(validation) = 'object'),
  unique (batch_id, article_id),
  unique (batch_id, stable_id)
);

create table if not exists halleus_private.wiki_article_images (
  article_id uuid primary key references public.wiki_articles(id) on delete restrict,
  asset_id uuid not null references public.wiki_assets(id) on delete restrict,
  state text not null check (state in ('DRAFT_IMAGE','READY','NEEDS_RETRY','REJECTED')),
  revision integer not null default 1 check (revision >= 1),
  alt_fa text not null check (char_length(alt_fa) between 3 and 500),
  alt_state text not null default 'draft' check (alt_state in ('draft','reviewed')),
  caption text check (caption is null or char_length(caption) <= 1000),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  focal_x numeric(5,4) not null default 0.5000 check (focal_x between 0 and 1),
  focal_y numeric(5,4) not null default 0.5000 check (focal_y between 0 and 1),
  warnings jsonb not null default '[]'::jsonb check (jsonb_typeof(warnings) = 'array'),
  brief_version integer not null default 1 check (brief_version >= 1),
  batch_item_id uuid references halleus_private.wiki_image_batch_items(id) on delete restrict,
  reviewed_by uuid,
  reviewed_at timestamptz,
  updated_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists halleus_private.wiki_asset_variants (
  asset_id uuid not null references public.wiki_assets(id) on delete restrict,
  width integer not null check (width in (480,768,1200)),
  height integer not null,
  storage_path text not null unique,
  mime_type text not null check (mime_type = 'image/webp'),
  byte_size integer not null check (byte_size between 1 and 50000),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  perceptual_hash text not null check (perceptual_hash ~ '^[0-9a-f]{16}$'),
  created_at timestamptz not null default now(),
  primary key (asset_id, width),
  check (
    (width = 480 and height = 270 and byte_size <= 15000) or
    (width = 768 and height = 432 and byte_size <= 30000) or
    (width = 1200 and height = 675 and byte_size <= 50000)
  )
);

create table if not exists halleus_private.wiki_article_image_history (
  id bigint generated always as identity primary key,
  article_id uuid not null references public.wiki_articles(id) on delete restrict,
  action text not null check (action in ('stage','metadata','approve','reject','retry','replace','detach')),
  revision integer not null check (revision >= 1),
  before_snapshot jsonb,
  after_snapshot jsonb,
  actor_user_id uuid not null,
  reason text not null check (char_length(reason) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists wiki_image_batches_status_idx on halleus_private.wiki_image_batches(status, created_at desc);
create index if not exists wiki_image_batch_items_article_idx on halleus_private.wiki_image_batch_items(article_id, batch_id);
create index if not exists wiki_article_images_state_idx on halleus_private.wiki_article_images(state, updated_at desc);
create index if not exists wiki_article_image_history_article_idx on halleus_private.wiki_article_image_history(article_id, created_at desc);
create index if not exists wiki_asset_variants_phash_idx on halleus_private.wiki_asset_variants(perceptual_hash);

drop trigger if exists wiki_image_batches_set_updated_at on halleus_private.wiki_image_batches;
create trigger wiki_image_batches_set_updated_at before update on halleus_private.wiki_image_batches
for each row execute function halleus_private.set_updated_at();

drop trigger if exists wiki_article_images_set_updated_at on halleus_private.wiki_article_images;
create trigger wiki_article_images_set_updated_at before update on halleus_private.wiki_article_images
for each row execute function halleus_private.set_updated_at();

insert into halleus_private.wiki_image_style_snapshots (version, source_routes, contract)
values (
  'halleus-home-chart-live-2026-08-15-v1',
  '["/", "/chart"]'::jsonb,
  '{"language":"dark editorial minimal premium","backgrounds":["#020305","#050609","#08090c","#0b0d11","#101216"],"text":["#ffffff","#f4f6f8","#edf2f7"],"accents":["#dceeff","#7dd3fc","#c4b5fd"],"rules":["one main concept","vector-like forms","controlled gradients","no unintended text","no heavy grain or star clutter","no fake astronomical measurement"]}'::jsonb
)
on conflict (version) do nothing;

alter table halleus_private.wiki_image_style_snapshots enable row level security;
alter table halleus_private.wiki_image_batches enable row level security;
alter table halleus_private.wiki_image_batch_items enable row level security;
alter table halleus_private.wiki_article_images enable row level security;
alter table halleus_private.wiki_asset_variants enable row level security;
alter table halleus_private.wiki_article_image_history enable row level security;

revoke all on halleus_private.wiki_image_style_snapshots from public, anon, authenticated;
revoke all on halleus_private.wiki_image_batches from public, anon, authenticated;
revoke all on halleus_private.wiki_image_batch_items from public, anon, authenticated;
revoke all on halleus_private.wiki_article_images from public, anon, authenticated;
revoke all on halleus_private.wiki_asset_variants from public, anon, authenticated;
revoke all on halleus_private.wiki_article_image_history from public, anon, authenticated;

comment on table halleus_private.wiki_article_images is
  'Dedicated Wiki cover assignment. Absence means NO_IMAGE; only READY may render publicly.';
comment on table halleus_private.wiki_article_image_history is
  'Immutable Wiki image assignment/version audit history, separate from article content and link history.';

commit;

select 'HALLEUS_BATCH4_SLICE_B_WIKI_IMAGE_PIPELINE_MIGRATION=SUCCESS' as marker;