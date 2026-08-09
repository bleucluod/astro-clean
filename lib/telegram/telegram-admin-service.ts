import {
  asNullableString,
  asNumber,
  asRecord,
  asString,
  getAdminDatabase,
} from "@/lib/admin/admin-database";
import type { TelegramPlannedContent } from "@/lib/telegram/telegram-content";

export type TelegramAdminQueueSummary = {
  currentPackId: string | null;
  draftCount: number;
  readyCount: number;
  retryingCount: number;
  publishedCount: number;
  failedCount: number;
  uncertainCount: number;
  stalePublishingCount: number;
  nextScheduledAt: string | null;
  coverageStart: string | null;
  coverageEnd: string | null;
  lastError: string | null;
};

export async function getTelegramAdminQueueSummary(): Promise<TelegramAdminQueueSummary> {
  const sql = getAdminDatabase();
  const rows = await sql`
    select
      count(*) filter (where status = 'draft')::int as draft_count,
      count(*) filter (where status = 'ready')::int as ready_count,
      count(*) filter (where status = 'ready' and attempt_count > 0)::int as retrying_count,
      count(*) filter (where status = 'published')::int as published_count,
      count(*) filter (where status = 'failed')::int as failed_count,
      count(*) filter (
        where status = 'failed' and last_error like '[delivery_uncertain]%'
      )::int as uncertain_count,
      count(*) filter (
        where status = 'publishing'
          and last_attempt_at < now() - interval '5 minutes'
      )::int as stale_publishing_count,
      min(scheduled_for) filter (where status = 'ready')::text as coverage_start,
      max(scheduled_for) filter (where status = 'ready')::text as coverage_end,
      (
        select scheduled_for::text
        from halleus_private.telegram_content_queue
        where status = 'ready'
        order by greatest(scheduled_for, coalesce(retry_after, scheduled_for)), created_at
        limit 1
      ) as next_scheduled_at,
      (
        select writer_input #>> '{sourceFacts,packId}'
        from halleus_private.telegram_content_queue
        where writer_input #> '{sourceFacts}' ? 'packId'
        order by generated_at desc, created_at desc
        limit 1
      ) as current_pack_id,
      (
        select last_error
        from halleus_private.telegram_content_queue
        where last_error is not null
        order by updated_at desc
        limit 1
      ) as last_error
    from halleus_private.telegram_content_queue
  `;
  const row = asRecord(rows[0]);
  return {
    currentPackId: asNullableString(row.current_pack_id),
    draftCount: asNumber(row.draft_count),
    readyCount: asNumber(row.ready_count),
    retryingCount: asNumber(row.retrying_count),
    publishedCount: asNumber(row.published_count),
    failedCount: asNumber(row.failed_count),
    uncertainCount: asNumber(row.uncertain_count),
    stalePublishingCount: asNumber(row.stale_publishing_count),
    nextScheduledAt: asNullableString(row.next_scheduled_at),
    coverageStart: asNullableString(row.coverage_start),
    coverageEnd: asNullableString(row.coverage_end),
    lastError: asNullableString(row.last_error),
  };
}

export type TelegramContentPackImportConflict = {
  localDate: string;
  incomingCount: number;
  existingCount: number;
  existingPackIds: string[];
  changedIdentityCount: number;
  freshCount: number;
};

export type TelegramContentPackImportInspection = {
  newItems: TelegramPlannedContent[];
  skippedDuplicateCount: number;
  duplicateDates: string[];
  conflictDates: TelegramContentPackImportConflict[];
};

function tehranLocalDateFromIso(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

type ExistingTelegramImportItem = {
  contentKey: string;
  packId: string | null;
  contentType: string;
  scheduledFor: string;
  renderedText: string;
};

function sameStoredTelegramMessage(
  existing: ExistingTelegramImportItem,
  incoming: TelegramPlannedContent,
) {
  return (
    existing.contentType === incoming.contentType &&
    existing.scheduledFor === new Date(incoming.scheduledFor).toISOString() &&
    existing.renderedText === incoming.payload.text
  );
}

export async function inspectTelegramContentPackImport(
  items: TelegramPlannedContent[],
): Promise<TelegramContentPackImportInspection> {
  if (items.length === 0) {
    return {
      newItems: [],
      skippedDuplicateCount: 0,
      duplicateDates: [],
      conflictDates: [],
    };
  }

  const localDates = [
    ...new Set(items.map((item) => tehranLocalDateFromIso(item.scheduledFor))),
  ].sort();
  const rangeStart = localDates[0];
  const rangeEnd = localDates[localDates.length - 1];
  if (!rangeStart || !rangeEnd) {
    throw new Error("Telegram content-pack import inspection has no Tehran dates.");
  }

  const sql = getAdminDatabase();
  const rows = await sql`
    select
      content_key,
      content_type,
      rendered_payload ->> 'text' as rendered_text,
      scheduled_for::text as scheduled_for,
      (scheduled_for at time zone 'Asia/Tehran')::date::text as local_date,
      writer_input #>> '{sourceFacts,packId}' as pack_id
    from halleus_private.telegram_content_queue
    where (scheduled_for at time zone 'Asia/Tehran')::date
      between ${rangeStart}::date and ${rangeEnd}::date
    order by scheduled_for, created_at
  `;

  const existingByDate = new Map<string, ExistingTelegramImportItem[]>();
  const existingByKey = new Map<string, ExistingTelegramImportItem>();
  for (const raw of rows) {
    const row = asRecord(raw);
    const contentKey = asString(row.content_key);
    const localDate = asString(row.local_date);
    const stored: ExistingTelegramImportItem = {
      contentKey,
      packId: asNullableString(row.pack_id),
      contentType: asString(row.content_type),
      scheduledFor: new Date(asString(row.scheduled_for)).toISOString(),
      renderedText: asString(row.rendered_text),
    };
    existingByKey.set(contentKey, stored);
    const bucket = existingByDate.get(localDate) ?? [];
    bucket.push(stored);
    existingByDate.set(localDate, bucket);
  }

  const incomingByDate = new Map<string, TelegramPlannedContent[]>();
  for (const item of items) {
    const localDate = tehranLocalDateFromIso(item.scheduledFor);
    const bucket = incomingByDate.get(localDate) ?? [];
    bucket.push(item);
    incomingByDate.set(localDate, bucket);
  }

  const duplicateDates: string[] = [];
  const conflictDates: TelegramContentPackImportConflict[] = [];
  const newItems: TelegramPlannedContent[] = [];
  let skippedDuplicateCount = 0;

  for (const localDate of [...incomingByDate.keys()].sort()) {
    const incoming = incomingByDate.get(localDate) ?? [];
    const existing = existingByDate.get(localDate) ?? [];
    if (existing.length === 0) {
      newItems.push(...incoming);
      continue;
    }

    let duplicateCount = 0;
    let changedIdentityCount = 0;
    let freshCount = 0;

    for (const item of incoming) {
      const sameKey = existingByKey.get(item.contentKey);
      if (!sameKey) {
        freshCount += 1;
        continue;
      }
      if (sameStoredTelegramMessage(sameKey, item)) {
        duplicateCount += 1;
      } else {
        changedIdentityCount += 1;
      }
    }

    if (
      duplicateCount === incoming.length &&
      changedIdentityCount === 0 &&
      freshCount === 0
    ) {
      skippedDuplicateCount += duplicateCount;
      duplicateDates.push(localDate);
      continue;
    }

    conflictDates.push({
      localDate,
      incomingCount: incoming.length,
      existingCount: existing.length,
      existingPackIds: [
        ...new Set(
          existing
            .map((item) => item.packId)
            .filter((value): value is string => Boolean(value)),
        ),
      ].sort(),
      changedIdentityCount,
      freshCount,
    });
  }

  return {
    newItems,
    skippedDuplicateCount,
    duplicateDates,
    conflictDates,
  };
}
