import {
  asNullableString,
  asNumber,
  asRecord,
  asString,
  getAdminDatabase,
} from "@/lib/admin/admin-database";
import type {
  TelegramPlannedContent,
  TelegramRenderedPayload,
} from "@/lib/telegram/telegram-content";
import {
  TELEGRAM_PUBLISH_MAX_ATTEMPTS,
  TELEGRAM_STALE_PUBLISHING_MS,
  getTelegramSafeRetryDelayMs,
  shouldAutoRetryTelegramFailure,
  telegramFailureTag,
  type TelegramDeliveryFailure,
} from "@/lib/telegram/telegram-publishing-hardening";

export type TelegramQueueInitialStatus = "draft" | "ready";

export type TelegramQueueItem = {
  id: string;
  contentKey: string;
  contentClass: TelegramPlannedContent["contentClass"];
  contentType: TelegramPlannedContent["contentType"];
  payload: TelegramRenderedPayload;
  scheduledFor: string;
  status: "draft" | "ready" | "publishing" | "published" | "failed" | "skipped";
  attemptCount: number;
  telegramMessageId: string | null;
};

export type TelegramQueueFailureOutcome = {
  retried: boolean;
  terminal: boolean;
  deliveryUncertain: boolean;
  retryAfter: string | null;
};

export type TelegramQueueRecoveryResult = {
  recoveredBeforeDispatch: number;
  quarantinedUncertain: number;
};

function readPayload(value: unknown): TelegramRenderedPayload {
  const record = asRecord(value);
  if (
    typeof record.text !== "string" ||
    record.parseMode !== "HTML" ||
    record.disableWebPagePreview !== true
  ) {
    throw new Error("Stored Telegram payload is invalid.");
  }
  return {
    text: record.text,
    parseMode: "HTML",
    disableWebPagePreview: true,
  };
}

function readQueueItem(value: unknown): TelegramQueueItem {
  const row = asRecord(value);
  const contentClass = asString(row.content_class);
  const contentType = asString(row.content_type);
  const status = asString(row.status);
  if (!["engine_backed", "evergreen", "shareable"].includes(contentClass)) {
    throw new Error("Stored Telegram content class is invalid.");
  }
  if (![
    "sky_moon_position",
    "sky_moon_phase",
    "sky_planetary_state",
    "sky_priority_aspect",
    "sky_ingress",
    "sky_station",
    "evergreen_taurus_boundary",
    "evergreen_sign_boundary",
    "evergreen_relationship_pattern",
    "evergreen_planet_sign_lesson",
    "shareable_virgo_start",
    "shareable_sign_prompt",
    "shareable_relationship_prompt",
    "shareable_micro_reflection",
    "educational_retrograde",
    "educational_aspect",
  ].includes(contentType)) {
    throw new Error("Stored Telegram content type is invalid.");
  }
  if (!["draft", "ready", "publishing", "published", "failed", "skipped"].includes(status)) {
    throw new Error("Stored Telegram queue status is invalid.");
  }
  return {
    id: asString(row.id),
    contentKey: asString(row.content_key),
    contentClass: contentClass as TelegramQueueItem["contentClass"],
    contentType: contentType as TelegramQueueItem["contentType"],
    payload: readPayload(row.rendered_payload),
    scheduledFor: new Date(asString(row.scheduled_for)).toISOString(),
    status: status as TelegramQueueItem["status"],
    attemptCount: asNumber(row.attempt_count),
    telegramMessageId: asNullableString(row.telegram_message_id),
  };
}

export async function enqueueTelegramContent(
  items: TelegramPlannedContent[],
  initialStatus: TelegramQueueInitialStatus,
) {
  const sql = getAdminDatabase();
  const queued: TelegramQueueItem[] = [];

  for (const item of items) {
    const rows = await sql`
      insert into halleus_private.telegram_content_queue as queue (
        content_key, content_class, content_type, writer_input,
        rendered_payload, source_provenance, cta, scheduled_for,
        status, generated_at
      ) values (
        ${item.contentKey}, ${item.contentClass}, ${item.contentType},
        ${sql.json(item.writerInput)}, ${sql.json(item.payload)},
        ${item.provenance ? sql.json(item.provenance) : null},
        ${item.cta ? sql.json(item.cta) : null}, ${item.scheduledFor}::timestamptz,
        ${initialStatus}, ${item.generatedAt}::timestamptz
      )
      on conflict (content_key) do update set
        status = case
          when queue.status = 'draft'
            and excluded.status = 'ready' then 'ready'
          else queue.status
        end,
        updated_at = now()
      returning id::text, content_key, content_class, content_type,
                rendered_payload, scheduled_for, status, attempt_count,
                telegram_message_id::text
    `;
    if (!rows[0]) {
      throw new Error("Telegram queue insert did not return a row.");
    }
    queued.push(readQueueItem(rows[0]));
  }

  return queued;
}

export async function enqueueTelegramContentPack(items: TelegramPlannedContent[]) {
  if (items.length === 0) return [];
  const sql = getAdminDatabase();
  const records = items.map((item) => ({
    content_key: item.contentKey,
    content_class: item.contentClass,
    content_type: item.contentType,
    writer_input: item.writerInput,
    rendered_payload: item.payload,
    source_provenance: item.provenance,
    cta: item.cta,
    scheduled_for: item.scheduledFor,
    generated_at: item.generatedAt,
  }));
  const rows = await sql`
    insert into halleus_private.telegram_content_queue as queue (
      content_key, content_class, content_type, writer_input,
      rendered_payload, source_provenance, cta, scheduled_for,
      status, generated_at
    )
    select
      incoming.content_key, incoming.content_class, incoming.content_type,
      incoming.writer_input, incoming.rendered_payload,
      incoming.source_provenance, incoming.cta, incoming.scheduled_for,
      'ready', incoming.generated_at
    from jsonb_to_recordset(${sql.json(records)}::jsonb) as incoming(
      content_key text, content_class text, content_type text,
      writer_input jsonb, rendered_payload jsonb, source_provenance jsonb,
      cta jsonb, scheduled_for timestamptz, generated_at timestamptz
    )
    on conflict (content_key) do update set
      status = case
        when queue.status = 'draft' then 'ready'
        else queue.status
      end,
      updated_at = now()
    returning id::text, content_key, content_class, content_type,
              rendered_payload, scheduled_for, status, attempt_count,
              telegram_message_id::text
  `;
  return rows.map(readQueueItem);
}

export async function recoverStaleTelegramQueueItems(
  now = new Date(),
): Promise<TelegramQueueRecoveryResult> {
  const cutoff = new Date(now.getTime() - TELEGRAM_STALE_PUBLISHING_MS).toISOString();
  const sql = getAdminDatabase();
  return sql.begin(async (tx) => {
    const recovered = await tx`
      update halleus_private.telegram_content_queue
      set status = 'ready',
          attempt_count = greatest(attempt_count - 1, 0),
          retry_after = ${now.toISOString()}::timestamptz,
          last_error = '[recovered_pre_dispatch] stale claim recovered before external dispatch',
          updated_at = now()
      where status = 'publishing'
        and last_attempt_at < ${cutoff}::timestamptz
        and dispatch_started_at is null
      returning id
    `;
    const uncertain = await tx`
      update halleus_private.telegram_content_queue
      set status = 'failed',
          retry_after = null,
          last_error = '[delivery_uncertain] stale publishing item had already started external dispatch; automatic retry blocked',
          updated_at = now()
      where status = 'publishing'
        and last_attempt_at < ${cutoff}::timestamptz
        and dispatch_started_at is not null
      returning id
    `;
    return {
      recoveredBeforeDispatch: recovered.length,
      quarantinedUncertain: uncertain.length,
    };
  });
}

export async function claimDueTelegramQueueItem() {
  const sql = getAdminDatabase();
  return sql.begin(async (tx) => {
    const rows = await tx`
      select id::text
      from halleus_private.telegram_content_queue
      where status = 'ready'
        and scheduled_for <= now()
        and (retry_after is null or retry_after <= now())
        and attempt_count < ${TELEGRAM_PUBLISH_MAX_ATTEMPTS}
      order by scheduled_for, created_at
      for update skip locked
      limit 1
    `;
    if (!rows[0]) return null;
    const id = asString(rows[0].id);
    const claimed = await tx`
      update halleus_private.telegram_content_queue
      set status = 'publishing',
          attempt_count = attempt_count + 1,
          last_attempt_at = now(),
          dispatch_started_at = null,
          retry_after = null,
          updated_at = now(),
          last_error = null
      where id = ${id}::uuid
        and status = 'ready'
        and attempt_count < ${TELEGRAM_PUBLISH_MAX_ATTEMPTS}
      returning id::text, content_key, content_class, content_type,
                rendered_payload, scheduled_for, status, attempt_count,
                telegram_message_id::text
    `;
    return claimed[0] ? readQueueItem(claimed[0]) : null;
  });
}

export async function markTelegramQueueDispatchStarted(id: string) {
  const sql = getAdminDatabase();
  const rows = await sql`
    update halleus_private.telegram_content_queue
    set dispatch_started_at = now(), updated_at = now()
    where id = ${id}::uuid
      and status = 'publishing'
      and dispatch_started_at is null
    returning id::text
  `;
  if (!rows[0]) {
    throw new Error("Telegram queue item could not enter dispatch phase.");
  }
}

export async function markTelegramQueuePublished(
  id: string,
  telegramMessageId: number,
) {
  const sql = getAdminDatabase();
  const rows = await sql`
    update halleus_private.telegram_content_queue
    set status = 'published',
        telegram_message_id = ${telegramMessageId},
        published_at = now(),
        retry_after = null,
        updated_at = now(),
        last_error = null
    where id = ${id}::uuid
      and (
        status = 'publishing'
        or (status = 'published' and telegram_message_id = ${telegramMessageId})
      )
    returning id::text
  `;
  if (!rows[0]) {
    throw new Error("Telegram queue item could not be marked published.");
  }
}

export async function markTelegramQueueDeliveryFailure(input: {
  id: string;
  attemptCount: number;
  failure: TelegramDeliveryFailure;
}): Promise<TelegramQueueFailureOutcome> {
  const sql = getAdminDatabase();
  const retry = shouldAutoRetryTelegramFailure({
    attemptCount: input.attemptCount,
    failure: input.failure,
  });
  const delayMs = retry ? getTelegramSafeRetryDelayMs(input.attemptCount) : null;
  const retryAfter = delayMs === null ? null : new Date(Date.now() + delayMs).toISOString();
  const tag = telegramFailureTag(input.failure);
  const message = `[${tag}] ${input.failure.message}`.slice(0, 1200);
  const rows = await sql`
    update halleus_private.telegram_content_queue
    set status = ${retry ? "ready" : "failed"},
        retry_after = ${retryAfter}::timestamptz,
        dispatch_started_at = case when ${retry} then null else dispatch_started_at end,
        last_error = ${message},
        updated_at = now()
    where id = ${input.id}::uuid and status = 'publishing'
    returning id::text
  `;
  if (!rows[0]) {
    throw new Error("Telegram queue failure outcome could not be persisted.");
  }
  return {
    retried: retry,
    terminal: !retry,
    deliveryUncertain: input.failure.deliveryUncertain,
    retryAfter,
  };
}