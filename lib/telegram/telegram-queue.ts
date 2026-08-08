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

export const TELEGRAM_MVP_MAX_ATTEMPTS = 1;
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
  if (![
    "engine_backed",
    "evergreen",
    "shareable",
  ].includes(contentClass)) {
    throw new Error("Stored Telegram content class is invalid.");
  }
  if (!["sky_moon_position", "evergreen_taurus_boundary", "shareable_virgo_start"].includes(contentType)) {
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

export async function claimDueTelegramQueueItem() {
  const sql = getAdminDatabase();
  return sql.begin(async (tx) => {
    const rows = await tx`
      select id::text
      from halleus_private.telegram_content_queue
      where status = 'ready'
        and scheduled_for <= now()
        and attempt_count < ${TELEGRAM_MVP_MAX_ATTEMPTS}
      order by scheduled_for, created_at
      for update skip locked
      limit 1
    `;
    if (!rows[0]) return null;
    const id = asString(rows[0].id);
    const claimed = await tx`
      update halleus_private.telegram_content_queue
      set status = 'publishing', attempt_count = attempt_count + 1,
          last_attempt_at = now(), updated_at = now(), last_error = null
      where id = ${id}::uuid
        and status = 'ready'
        and attempt_count < ${TELEGRAM_MVP_MAX_ATTEMPTS}
      returning id::text, content_key, content_class, content_type,
                rendered_payload, scheduled_for, status, attempt_count,
                telegram_message_id::text
    `;
    return claimed[0] ? readQueueItem(claimed[0]) : null;
  });
}

export async function markTelegramQueuePublished(
  id: string,
  telegramMessageId: number,
) {
  const sql = getAdminDatabase();
  const rows = await sql`
    update halleus_private.telegram_content_queue
    set status = 'published', telegram_message_id = ${telegramMessageId},
        published_at = now(), updated_at = now(), last_error = null
    where id = ${id}::uuid and status = 'publishing'
    returning id::text
  `;
  if (!rows[0]) {
    throw new Error("Telegram queue item could not be marked published.");
  }
}

export async function markTelegramQueueFailed(id: string, error: unknown) {
  const sql = getAdminDatabase();
  const message = error instanceof Error ? error.message.slice(0, 1200) : "Unknown Telegram publish failure";
  await sql`
    update halleus_private.telegram_content_queue
    set status = 'failed', last_error = ${message}, updated_at = now()
    where id = ${id}::uuid and status = 'publishing'
  `;
}