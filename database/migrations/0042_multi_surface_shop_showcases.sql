-- Multi-surface product showcases. Additive; apply only after a verified VPS backup.
-- No report, relationship, user, visitor, or birth identifiers are stored.
begin;

create table halleus_private.shop_showcase_placements (
  id uuid primary key default gen_random_uuid(),
  surface text not null check (surface in ('natal', 'synastry', 'sky')),
  slot text not null check (char_length(slot) between 3 and 64),
  product_id text not null check (product_id ~ '^[a-z][a-z0-9_-]{1,39}$'),
  title text not null check (char_length(title) between 1 and 160),
  description text not null check (char_length(description) between 1 and 500),
  button_label text not null check (char_length(button_label) between 1 and 80),
  enabled boolean not null default false,
  revision integer not null default 1 check (revision >= 1),
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (surface, slot)
);
create index shop_showcase_placements_enabled_idx
  on halleus_private.shop_showcase_placements (surface, slot) where enabled = true;

create table halleus_private.shop_showcase_daily_metrics (
  showcase_id uuid not null references halleus_private.shop_showcase_placements(id) on delete cascade,
  product_id text not null,
  day date not null,
  impressions bigint not null default 0 check (impressions >= 0),
  clicks bigint not null default 0 check (clicks >= 0),
  primary key (showcase_id, product_id, day)
);
create index shop_showcase_metrics_day_idx
  on halleus_private.shop_showcase_daily_metrics (day);

create table halleus_private.shop_showcase_ai_batches (
  id uuid primary key,
  product_ids jsonb not null check (jsonb_typeof(product_ids) = 'array'),
  surface_ids jsonb not null check (jsonb_typeof(surface_ids) = 'array'),
  created_by uuid,
  created_at timestamptz not null default now()
);

create table halleus_private.shop_showcase_ai_proposals (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references halleus_private.shop_showcase_ai_batches(id),
  surface text not null check (surface in ('natal', 'synastry', 'sky')),
  slot text not null,
  product_id text not null,
  title text not null check (char_length(title) between 1 and 160),
  description text not null check (char_length(description) between 1 and 500),
  button_label text not null check (char_length(button_label) between 1 and 80),
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  reviewed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, surface, slot)
);
create index shop_showcase_ai_proposals_pending_idx
  on halleus_private.shop_showcase_ai_proposals (status, created_at)
  where status = 'pending';

alter table halleus_private.shop_showcase_placements enable row level security;
alter table halleus_private.shop_showcase_daily_metrics enable row level security;
alter table halleus_private.shop_showcase_ai_batches enable row level security;
alter table halleus_private.shop_showcase_ai_proposals enable row level security;
revoke all on halleus_private.shop_showcase_placements,
  halleus_private.shop_showcase_daily_metrics,
  halleus_private.shop_showcase_ai_batches,
  halleus_private.shop_showcase_ai_proposals from public, anon, authenticated;

-- The old Wiki catalog constraint must not block future registered product IDs.
alter table halleus_private.wiki_shop_showcases
  drop constraint if exists wiki_shop_showcases_product_id_check;
alter table halleus_private.wiki_shop_showcases
  add constraint wiki_shop_showcases_product_id_check
  check (product_id ~ '^[a-z][a-z0-9_-]{1,39}$');
alter table halleus_private.wiki_shop_showcase_daily_metrics
  drop constraint if exists wiki_shop_showcase_daily_metrics_product_id_check;
alter table halleus_private.wiki_shop_showcase_daily_metrics
  add constraint wiki_shop_showcase_daily_metrics_product_id_check
  check (product_id ~ '^[a-z][a-z0-9_-]{1,39}$');
alter table halleus_private.wiki_shop_showcase_proposals
  drop constraint if exists wiki_shop_showcase_proposals_product_id_check;
alter table halleus_private.wiki_shop_showcase_proposals
  add constraint wiki_shop_showcase_proposals_product_id_check
  check (product_id is null or product_id ~ '^[a-z][a-z0-9_-]{1,39}$');

comment on table halleus_private.shop_showcase_placements is
  'Reviewed placement by public surface and content slot; no viewer identity.';
comment on table halleus_private.shop_showcase_daily_metrics is
  'UTC daily aggregate impressions and clicks without visitor identifiers.';
commit;
