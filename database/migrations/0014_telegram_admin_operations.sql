-- Telegram Admin Phase 2: visibility, safe controls, pause state, and append-only delivery history.
-- Forward-only. This migration does not publish, retry, cancel, or otherwise mutate existing queue rows.
begin;

alter table halleus_private.telegram_content_queue
  drop constraint if exists telegram_content_queue_status_check;

alter table halleus_private.telegram_content_queue
  add constraint telegram_content_queue_status_check
  check (status in ('draft', 'ready', 'publishing', 'published', 'failed', 'skipped', 'cancelled'));

create table if not exists halleus_private.telegram_queue_events (
  id bigserial primary key,
  queue_id uuid not null references halleus_private.telegram_content_queue(id) on delete cascade,
  event_type text not null,
  status_before text,
  status_after text,
  reason text,
  attempt_count integer,
  telegram_message_id bigint,
  created_at timestamptz not null default now()
);

create index if not exists telegram_queue_events_recent_idx
  on halleus_private.telegram_queue_events (created_at desc, id desc);
create index if not exists telegram_queue_events_queue_idx
  on halleus_private.telegram_queue_events (queue_id, created_at desc, id desc);

create or replace function halleus_private.reject_telegram_queue_event_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'telegram_queue_events is append-only';
end;
$$;

drop trigger if exists telegram_queue_events_append_only on halleus_private.telegram_queue_events;
create trigger telegram_queue_events_append_only
before update or delete on halleus_private.telegram_queue_events
for each row execute function halleus_private.reject_telegram_queue_event_mutation();

create table if not exists halleus_private.telegram_publish_control (
  singleton boolean primary key default true check (singleton),
  global_paused boolean not null default false,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

insert into halleus_private.telegram_publish_control (singleton)
values (true)
on conflict (singleton) do nothing;

create table if not exists halleus_private.telegram_paused_days (
  local_date date primary key,
  reason text not null check (char_length(reason) between 1 and 500),
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists telegram_paused_days_recent_idx
  on halleus_private.telegram_paused_days (local_date desc);


create table if not exists halleus_private.telegram_ai_content_config (
  singleton boolean primary key default true check (singleton),
  config_version integer not null default 1 check (config_version >= 1),
  raw_prompt text not null check (char_length(raw_prompt) between 40 and 12000),
  settings jsonb not null default '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

insert into halleus_private.telegram_ai_content_config (
  singleton,
  config_version,
  raw_prompt,
  settings
)
values (
  true,
  1,
  'برای دادهٔ موتور هالیوس پیام‌های تلگرام فارسی بساز. لحن، تعداد، تنوع و فرم پیام‌ها از تنظیمات این دستور می‌آید؛ اما هیچ دادهٔ نجومی، زمان event، sourceRef، provenance، safety rule یا محدودیت فنی موتور را تغییر نده و چیزی خارج از facts بسته اختراع نکن.',
  jsonb_build_object(
    'messagesPerDayMin', 50,
    'messagesPerDayMax', 100,
    'tone', 'فارسی محاوره‌ای، جوان، زنده و shareable؛ شوخی و toxic-lite فقط وقتی واضحاً شوخی است.',
    'messageLength', 'mixed',
    'emojiPolicy', 'ایموجی طبیعی و متنوع؛ نه در همه پیام‌ها و نه با الگوی تکراری.',
    'ctaStyle', 'اکثریت پیام‌ها بدون CTA؛ CTA فقط وقتی ادامه طبیعی همان پیام است.',
    'contentMix', 'خبر رویداد، آموزش کوتاه، کوئیز یا میم، sign-impact، spotlight و recap بدون filler نامرتبط.',
    'repetitionRule', 'opening، ریتم، سناریو و CTA تکراری نشوند.',
    'messageTypes', jsonb_build_array(
      'event_news',
      'same_day_education',
      'quiz_or_meme',
      'sign_impact',
      'natal_spotlight',
      'recap',
      'future_teaser'
    )
  )
)
on conflict (singleton) do nothing;

alter table halleus_private.telegram_ai_content_config enable row level security;

revoke all on halleus_private.telegram_ai_content_config from public, anon, authenticated;

alter table halleus_private.telegram_queue_events enable row level security;
alter table halleus_private.telegram_publish_control enable row level security;
alter table halleus_private.telegram_paused_days enable row level security;

revoke all on halleus_private.telegram_queue_events from public, anon, authenticated;
revoke all on halleus_private.telegram_publish_control from public, anon, authenticated;
revoke all on halleus_private.telegram_paused_days from public, anon, authenticated;

commit;

select 'HALLEUS_TELEGRAM_ADMIN_CONTROL_CENTER=SUCCESS' as marker;
