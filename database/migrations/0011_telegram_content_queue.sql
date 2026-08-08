-- Telegram content queue for reviewed and due publishing. Forward-only; no rows are created by this migration.
begin;

create table if not exists halleus_private.telegram_content_queue (
  id uuid primary key default gen_random_uuid(),
  content_key text not null unique,
  content_class text not null
    check (content_class in ('engine_backed', 'evergreen', 'shareable')),
  content_type text not null,
  writer_input jsonb not null check (jsonb_typeof(writer_input) = 'object'),
  rendered_payload jsonb not null check (jsonb_typeof(rendered_payload) = 'object'),
  source_provenance jsonb,
  cta jsonb,
  scheduled_for timestamptz not null,
  status text not null default 'draft'
    check (status in ('draft', 'ready', 'publishing', 'published', 'failed', 'skipped')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 3),
  telegram_message_id bigint unique,
  last_error text,
  generated_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  published_at timestamptz,
  constraint telegram_engine_provenance_required check (
    content_class <> 'engine_backed'
    or (source_provenance is not null and jsonb_typeof(source_provenance) = 'object')
  ),
  constraint telegram_published_message_required check (
    status <> 'published'
    or (telegram_message_id is not null and published_at is not null)
  )
);

create index if not exists telegram_content_queue_due_idx
  on halleus_private.telegram_content_queue (status, scheduled_for, created_at);

create index if not exists telegram_content_queue_generated_idx
  on halleus_private.telegram_content_queue (generated_at desc);

commit;

select 'HALLEUS_TELEGRAM_CONTENT_QUEUE=SUCCESS' as marker;