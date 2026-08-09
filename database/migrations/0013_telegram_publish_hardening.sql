-- Telegram auto-publish hardening: safe retry scheduling and fail-closed dispatch recovery.
-- Forward-only. Apply only during the final Telegram release after 0011.
begin;

alter table halleus_private.telegram_content_queue
  add column if not exists dispatch_started_at timestamptz,
  add column if not exists retry_after timestamptz;

create index if not exists telegram_content_queue_retry_due_idx
  on halleus_private.telegram_content_queue (status, retry_after, scheduled_for, created_at);

create index if not exists telegram_content_queue_stale_publish_idx
  on halleus_private.telegram_content_queue (status, last_attempt_at, dispatch_started_at)
  where status = 'publishing';

comment on column halleus_private.telegram_content_queue.dispatch_started_at is
  'Set immediately before the external Cloudflare/Telegram dispatch. Stale rows with this timestamp are quarantined instead of auto-retried to prevent duplicate posts.';

comment on column halleus_private.telegram_content_queue.retry_after is
  'Earliest time for a known-safe automatic retry. Null for first delivery and terminal/uncertain failures.';

commit;

select 'HALLEUS_TELEGRAM_PUBLISH_HARDENING=SUCCESS' as marker;