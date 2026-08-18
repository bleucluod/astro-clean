import {
  asNullableString,
  asNumber,
  asRecord,
  asString,
  getAdminDatabase,
} from "@/lib/admin/admin-database";
import { getHalleusRuntimeEnv } from "@/lib/config/env";
import type { TelegramCta, TelegramPlannedContent } from "@/lib/telegram/telegram-content";
import { TELEGRAM_AUTOMATIC_SEND_MAX_LATE_MS } from "@/lib/telegram/telegram-queue";

export type TelegramAdminQueueSummary = {
  currentPackId: string | null;
  draftCount: number;
  readyCount: number;
  retryingCount: number;
  publishedCount: number;
  failedCount: number;
  uncertainCount: number;
  historicalFailedCount: number;
  historicalUncertainCount: number;
  stalePublishingCount: number;
  futureScheduledCount: number;
  futureClearableCount: number;
  todayRemaining: number;
  tomorrowRemaining: number;
  nextScheduledAt: string | null;
  coverageStart: string | null;
  coverageEnd: string | null;
  futureCoverageEnd: string | null;
  lastError: string | null;
};

export async function getTelegramAdminQueueSummary(): Promise<TelegramAdminQueueSummary> {
  const sql = getAdminDatabase();
  const activeFailureCutoff = new Date(
    Date.now() - TELEGRAM_AUTOMATIC_SEND_MAX_LATE_MS,
  ).toISOString();

  const rows = await sql`
    select
      count(*) filter (where status = 'draft')::int as draft_count,
      count(*) filter (where status = 'ready')::int as ready_count,
      count(*) filter (where status = 'ready' and attempt_count > 0)::int as retrying_count,
      count(*) filter (where status = 'published')::int as published_count,
      count(*) filter (
        where status = 'failed'
          and scheduled_for > ${activeFailureCutoff}::timestamptz
      )::int as failed_count,
      count(*) filter (
        where status = 'failed'
          and last_error like '[delivery_uncertain]%'
          and scheduled_for > ${activeFailureCutoff}::timestamptz
      )::int as uncertain_count,
      count(*) filter (
        where status = 'failed'
          and scheduled_for <= ${activeFailureCutoff}::timestamptz
      )::int as historical_failed_count,
      count(*) filter (
        where status = 'failed'
          and last_error like '[delivery_uncertain]%'
          and scheduled_for <= ${activeFailureCutoff}::timestamptz
      )::int as historical_uncertain_count,
      count(*) filter (
        where status = 'publishing'
          and last_attempt_at < now() - interval '5 minutes'
      )::int as stale_publishing_count,
      count(*) filter (
        where status = 'ready'
          and scheduled_for > now()
          and telegram_message_id is null
      )::int as future_scheduled_count,
      count(*) filter (
        where status in ('draft', 'ready')
          and scheduled_for > now()
          and telegram_message_id is null
      )::int as future_clearable_count,
      count(*) filter (
        where status in ('draft', 'ready', 'publishing')
          and scheduled_for > now()
          and (scheduled_for at time zone 'Asia/Tehran')::date =
            (now() at time zone 'Asia/Tehran')::date
      )::int as today_remaining,
      count(*) filter (
        where status in ('draft', 'ready', 'publishing')
          and (scheduled_for at time zone 'Asia/Tehran')::date =
            ((now() at time zone 'Asia/Tehran')::date + 1)
      )::int as tomorrow_remaining,
      min(scheduled_for) filter (where status = 'ready')::text as coverage_start,
      max(scheduled_for) filter (where status = 'ready')::text as coverage_end,
      max(scheduled_for) filter (
        where status = 'ready'
          and scheduled_for > now()
          and telegram_message_id is null
      )::text as future_coverage_end,
      (
        select scheduled_for::text
        from halleus_private.telegram_content_queue
        where status = 'ready'
          and scheduled_for > now()
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
          and not (
            status = 'failed'
            and scheduled_for <= ${activeFailureCutoff}::timestamptz
          )
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
    historicalFailedCount: asNumber(row.historical_failed_count),
    historicalUncertainCount: asNumber(row.historical_uncertain_count),
    stalePublishingCount: asNumber(row.stale_publishing_count),
    futureScheduledCount: asNumber(row.future_scheduled_count),
    futureClearableCount: asNumber(row.future_clearable_count),
    todayRemaining: asNumber(row.today_remaining),
    tomorrowRemaining: asNumber(row.tomorrow_remaining),
    nextScheduledAt: asNullableString(row.next_scheduled_at),
    coverageStart: asNullableString(row.coverage_start),
    coverageEnd: asNullableString(row.coverage_end),
    futureCoverageEnd: asNullableString(row.future_coverage_end),
    lastError: sanitizeTelegramAdminReason(row.last_error),
  };
}

function sanitizeTelegramAdminReason(value: unknown) {
  const raw = asNullableString(value);
  if (!raw) return null;
  if (raw.startsWith("[delivery_uncertain]")) {
    return "تحویل نامشخص است؛ ممکن است پیام ارسال شده باشد و retry برای جلوگیری از انتشار تکراری مسدود است.";
  }
  if (raw.startsWith("[expired_window]")) {
    return "زمان خودکار این پیام گذشته و برای جلوگیری از ارسال دیرهنگام/backfill عمداً ارسال نشده است.";
  }
  if (raw.startsWith("[safe_retry]")) {
    return "خطای قابل‌تلاش مجددِ امن ثبت شده؛ سیستم می‌داند پیام قبلی تحویل نشده است.";
  }
  if (raw.startsWith("[terminal]")) {
    return "خطای نهایی انتشار ثبت شده و تحویل انجام نشده است؛ تنظیمات یا پاسخ سرویس باید بررسی شود.";
  }
  if (raw.startsWith("[recovered_pre_dispatch]")) {
    return "claim قبل از شروع dispatch گیر کرده بود و بدون خطر انتشار تکراری بازیابی شد.";
  }
  if (raw.startsWith("[admin_cancelled]")) {
    return "این پیام قبل از ارسال توسط ادمین لغو شده است.";
  }
  if (raw.startsWith("[admin_retry]")) {
    return "ادمین این پیام را برای تلاش دوبارهٔ امن به صف اصلی برگردانده است.";
  }
  if (raw.startsWith("[pause_resume_skip]")) {
    return "این پیام هنگام Pause از موعدش گذشته و برای جلوگیری از ارسال ناگهانی backlog عمداً رد شده است.";
  }
  return raw
    .replace(/https?:\/\/\S+/giu, "[endpoint]")
    .replace(
      /\b(?:authorization|bearer|secret|token)\b\s*[:=]?\s*\S*/giu,
      "[redacted]",
    )
    .slice(0, 280);
}

// HALLEUS_TELEGRAM_RETIRED_HISTORY_IMPORT_R1
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
  ignoredRetiredCount: number;
  ignoredRetiredDates: string[];
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
  status: string;
  telegramMessageId: string | null;
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

function isBlockingTelegramContentPackExistingItem(
  existing: ExistingTelegramImportItem,
  nowMs: number,
) {
  if (existing.telegramMessageId) return true;
  if (
    ["draft", "ready", "publishing", "published"].includes(existing.status)
  ) {
    return true;
  }
  if (
    existing.status === "failed" &&
    Date.parse(existing.scheduledFor) > nowMs
  ) {
    return true;
  }

  // cancelled/skipped rows are intentionally retired. Failed rows whose send
  // time is already past stay available in history/Failure Center but must not
  // block a fresh future pack for the same Tehran date.
  return false;
}

function telegramExistingPackIds(items: ExistingTelegramImportItem[]) {
  return [
    ...new Set(
      items
        .map((item) => item.packId)
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort();
}

export async function inspectTelegramContentPackImport(
  items: TelegramPlannedContent[],
  now = new Date(),
): Promise<TelegramContentPackImportInspection> {
  if (!Number.isFinite(now.getTime())) {
    throw new Error("Telegram content-pack import inspection time is invalid.");
  }

  if (items.length === 0) {
    return {
      newItems: [],
      skippedDuplicateCount: 0,
      duplicateDates: [],
      conflictDates: [],
      ignoredRetiredCount: 0,
      ignoredRetiredDates: [],
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
      writer_input #>> '{sourceFacts,packId}' as pack_id,
      status,
      telegram_message_id::text
    from halleus_private.telegram_content_queue
    where (scheduled_for at time zone 'Asia/Tehran')::date
      between ${rangeStart}::date and ${rangeEnd}::date
    order by scheduled_for, created_at
  `;

  const allExistingByDate = new Map<string, ExistingTelegramImportItem[]>();
  const blockingExistingByDate = new Map<string, ExistingTelegramImportItem[]>();
  const existingByKey = new Map<string, ExistingTelegramImportItem>();
  const ignoredRetiredDates = new Set<string>();
  let ignoredRetiredCount = 0;

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
      status: asString(row.status),
      telegramMessageId: asNullableString(row.telegram_message_id),
    };

    existingByKey.set(contentKey, stored);

    const allBucket = allExistingByDate.get(localDate) ?? [];
    allBucket.push(stored);
    allExistingByDate.set(localDate, allBucket);

    if (isBlockingTelegramContentPackExistingItem(stored, now.getTime())) {
      const blockingBucket = blockingExistingByDate.get(localDate) ?? [];
      blockingBucket.push(stored);
      blockingExistingByDate.set(localDate, blockingBucket);
    } else {
      ignoredRetiredCount += 1;
      ignoredRetiredDates.add(localDate);
    }
  }

  const incomingByDate = new Map<string, TelegramPlannedContent[]>();
  for (const item of items) {
    const localDate = tehranLocalDateFromIso(item.scheduledFor);
    const bucket = incomingByDate.get(localDate) ?? [];
    bucket.push(item);
    incomingByDate.set(localDate, bucket);
  }

  const duplicateDates = new Set<string>();
  const conflictDates: TelegramContentPackImportConflict[] = [];
  const newItems: TelegramPlannedContent[] = [];
  let skippedDuplicateCount = 0;

  for (const localDate of [...incomingByDate.keys()].sort()) {
    const incoming = incomingByDate.get(localDate) ?? [];
    const existing = blockingExistingByDate.get(localDate) ?? [];
    const allExisting = allExistingByDate.get(localDate) ?? [];

    if (existing.length === 0) {
      const freshItems: TelegramPlannedContent[] = [];
      let duplicateCount = 0;
      let changedIdentityCount = 0;

      for (const item of incoming) {
        const sameKey = existingByKey.get(item.contentKey);
        if (!sameKey) {
          freshItems.push(item);
          continue;
        }

        if (sameStoredTelegramMessage(sameKey, item)) {
          duplicateCount += 1;
        } else {
          changedIdentityCount += 1;
        }
      }

      if (changedIdentityCount > 0) {
        conflictDates.push({
          localDate,
          incomingCount: incoming.length,
          existingCount: allExisting.length,
          existingPackIds: telegramExistingPackIds(allExisting),
          changedIdentityCount,
          freshCount: freshItems.length,
        });
        continue;
      }

      newItems.push(...freshItems);
      skippedDuplicateCount += duplicateCount;
      if (duplicateCount > 0) duplicateDates.add(localDate);
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
      duplicateDates.add(localDate);
      continue;
    }

    conflictDates.push({
      localDate,
      incomingCount: incoming.length,
      existingCount: existing.length,
      existingPackIds: telegramExistingPackIds(existing),
      changedIdentityCount,
      freshCount,
    });
  }

  return {
    newItems,
    skippedDuplicateCount,
    duplicateDates: [...duplicateDates].sort(),
    conflictDates,
    ignoredRetiredCount,
    ignoredRetiredDates: [...ignoredRetiredDates].sort(),
  };
}

/* HALLEUS_TELEGRAM_ADMIN_PHASE2_R2_SERVER_CONTROL_CENTER */

export type TelegramAdminQueueFilter =
  | "today"
  | "tomorrow"
  | "date"
  | "all"
  | "ready"
  | "published"
  | "problems";

export class TelegramAdminMutationError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "TelegramAdminMutationError";
    this.status = status;
  }
}

const TELEGRAM_ADMIN_TIMEZONE = "Asia/Tehran";

function tehranDateFromIso(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TELEGRAM_ADMIN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function tehranLocalInputFromIso(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TELEGRAM_ADMIN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  return `${byType.get("year")}-${byType.get("month")}-${byType.get("day")}T${byType.get("hour")}:${byType.get("minute")}`;
}

function tehranLocalInputToIso(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    throw new TelegramAdminMutationError(
      400,
      "زمان جدید باید تاریخ و ساعت معتبر Asia/Tehran باشد.",
    );
  }
  const desired = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
  let instant = Date.UTC(
    desired.year,
    desired.month - 1,
    desired.day,
    desired.hour,
    desired.minute,
    0,
    0,
  );

  for (let pass = 0; pass < 3; pass += 1) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: TELEGRAM_ADMIN_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(instant));
    const byType = new Map(
      parts.map((part) => [part.type, Number(part.value)]),
    );
    const represented = Date.UTC(
      byType.get("year") ?? 0,
      (byType.get("month") ?? 1) - 1,
      byType.get("day") ?? 1,
      byType.get("hour") ?? 0,
      byType.get("minute") ?? 0,
    );
    const wanted = Date.UTC(
      desired.year,
      desired.month - 1,
      desired.day,
      desired.hour,
      desired.minute,
    );
    instant += wanted - represented;
  }

  const resolved = new Date(instant);
  if (!Number.isFinite(resolved.getTime())) {
    throw new TelegramAdminMutationError(400, "زمان جدید قابل تبدیل نیست.");
  }
  if (tehranLocalInputFromIso(resolved.toISOString()) !== value) {
    throw new TelegramAdminMutationError(
      400,
      "زمان جدید با timezone تهران سازگار نیست.",
    );
  }
  return resolved.toISOString();
}

function addLocalDateDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function parseTelegramAdminCta(value: unknown): TelegramCta | null {
  if (value == null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TelegramAdminMutationError(400, "CTA معتبر نیست.");
  }
  const record = value as Record<string, unknown>;
  const label =
    typeof record.label === "string" ? record.label.trim() : "";
  const target =
    typeof record.target === "string" ? record.target.trim() : "";
  if (!label || label.length > 120) {
    throw new TelegramAdminMutationError(
      400,
      "برچسب CTA باید بین ۱ تا ۱۲۰ نویسه باشد.",
    );
  }
  if (!["sky", "chart", "compare", "wiki"].includes(target)) {
    throw new TelegramAdminMutationError(400, "مقصد CTA معتبر نیست.");
  }
  const wikiSlug =
    typeof record.wikiSlug === "string" && record.wikiSlug.trim()
      ? record.wikiSlug.trim()
      : undefined;
  if (
    target === "wiki" &&
    (!wikiSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(wikiSlug))
  ) {
    throw new TelegramAdminMutationError(
      400,
      "برای CTA ویکی slug معتبر لازم است.",
    );
  }
  return {
    label,
    target: target as TelegramCta["target"],
    ...(wikiSlug ? { wikiSlug } : {}),
  };
}

function readStoredCta(value: unknown): TelegramCta | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    return parseTelegramAdminCta(value);
  } catch {
    return null;
  }
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function escapeTelegramAdminHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function decodeTelegramAdminHtml(value: string) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&");
}

function telegramAdminCtaUrl(cta: TelegramCta) {
  const base = getHalleusRuntimeEnv().siteUrl;
  if (cta.target === "sky") return new URL("/sky", base).toString();
  if (cta.target === "chart") return new URL("/chart", base).toString();
  if (cta.target === "compare") return new URL("/compare", base).toString();
  return new URL(`/wiki/${cta.wikiSlug}`, base).toString();
}

function renderTelegramAdminPayload(input: {
  text: string;
  hashtags: string[];
  cta: TelegramCta | null;
}) {
  const body = input.text.trim();
  if (!body) {
    throw new TelegramAdminMutationError(
      400,
      "متن پیام نمی‌تواند خالی باشد.",
    );
  }
  if (body.length > 3_700) {
    throw new TelegramAdminMutationError(
      400,
      "متن پیام از سقف Content Pack طولانی‌تر است.",
    );
  }
  if (/https?:\/\//iu.test(body)) {
    throw new TelegramAdminMutationError(
      400,
      "URL خام داخل متن مجاز نیست؛ از CTA استفاده کن.",
    );
  }
  const parts = [escapeTelegramAdminHtml(body)];
  if (input.cta) {
    const href = escapeTelegramAdminHtml(
      telegramAdminCtaUrl(input.cta),
    );
    parts.push(
      `<a href="${href}">${escapeTelegramAdminHtml(input.cta.label)}</a>`,
    );
  }
  if (input.hashtags.length > 0) {
    parts.push(input.hashtags.join(" "));
  }
  const text = parts.join("\n\n");
  if (text.length > 4096) {
    throw new TelegramAdminMutationError(
      400,
      "payload نهایی از محدودیت ۴۰۹۶ نویسهٔ تلگرام بیشتر است.",
    );
  }
  return {
    text,
    parseMode: "HTML" as const,
    disableWebPagePreview: true as const,
  };
}

function editableTelegramText(input: {
  payloadText: string;
  hashtags: string[];
  cta: TelegramCta | null;
}) {
  let body = input.payloadText;
  if (input.hashtags.length > 0) {
    const suffix = `\n\n${input.hashtags.join(" ")}`;
    if (body.endsWith(suffix)) body = body.slice(0, -suffix.length);
  }
  if (input.cta) {
    body = body.replace(
      /\n\n<a href="[^"]+">[\s\S]*?<\/a>$/u,
      "",
    );
  }
  return decodeTelegramAdminHtml(body);
}

function queueSummaryFromRow(raw: unknown) {
  const row = asRecord(raw);
  const writer = asRecord(row.writer_input);
  const sourceFacts = asRecord(writer.sourceFacts);
  return {
    id: asString(row.id),
    contentKey: asString(row.content_key),
    contentClass: asString(row.content_class),
    contentType: asString(row.content_type),
    status: asString(row.status),
    scheduledFor: new Date(asString(row.scheduled_for)).toISOString(),
    updatedAt: new Date(asString(row.updated_at)).toISOString(),
    publishedAt: asNullableString(row.published_at),
    retryAfter: asNullableString(row.retry_after),
    attemptCount: asNumber(row.attempt_count),
    packId: asNullableString(sourceFacts.packId),
    reason: sanitizeTelegramAdminReason(row.last_error),
    previewText: asNullableString(row.preview_text),
  };
}

export async function listTelegramAdminQueuePage(input: {
  filter: TelegramAdminQueueFilter;
  date: string | null;
  page: number;
  pageSize: number;
}) {
  const sql = getAdminDatabase();
  const now = new Date();
  const today = tehranDateFromIso(now.toISOString());
  const tomorrow = addLocalDateDays(today, 1);
  const filterDate =
    input.filter === "today"
      ? today
      : input.filter === "tomorrow"
        ? tomorrow
        : input.filter === "date"
          ? input.date
          : null;
  const offset = (input.page - 1) * input.pageSize;

  const countRows = await sql`
    select count(*)::int as total
    from halleus_private.telegram_content_queue as queue
    where (
      ${input.filter} = 'all'
      or (
        ${input.filter} = 'ready'
        and queue.status in ('draft', 'ready', 'publishing')
      )
      or (
        ${input.filter} = 'published'
        and queue.status = 'published'
      )
      or (
        ${input.filter} = 'problems'
        and (
          queue.status = 'failed'
          or (
            queue.status = 'publishing'
            and queue.last_attempt_at < now() - interval '5 minutes'
          )
        )
      )
      or (
        ${input.filter} in ('today', 'tomorrow', 'date')
        and (queue.scheduled_for at time zone 'Asia/Tehran')::date =
          ${filterDate}::date
      )
    )
  `;
  const total = asNumber(asRecord(countRows[0]).total);

  const rows = await sql`
    select
      queue.id::text,
      queue.content_key,
      queue.content_class,
      queue.content_type,
      queue.status,
      queue.scheduled_for::text,
      queue.updated_at::text,
      queue.published_at::text,
      queue.retry_after::text,
      queue.attempt_count,
      queue.last_error,
      queue.writer_input,
      left(queue.rendered_payload ->> 'text', 220) as preview_text
    from halleus_private.telegram_content_queue as queue
    where (
      ${input.filter} = 'all'
      or (
        ${input.filter} = 'ready'
        and queue.status in ('draft', 'ready', 'publishing')
      )
      or (
        ${input.filter} = 'published'
        and queue.status = 'published'
      )
      or (
        ${input.filter} = 'problems'
        and (
          queue.status = 'failed'
          or (
            queue.status = 'publishing'
            and queue.last_attempt_at < now() - interval '5 minutes'
          )
        )
      )
      or (
        ${input.filter} in ('today', 'tomorrow', 'date')
        and (queue.scheduled_for at time zone 'Asia/Tehran')::date =
          ${filterDate}::date
      )
    )
    order by
      case
        when ${input.filter} = 'published'
          then coalesce(queue.published_at, queue.updated_at)
      end desc nulls last,
      case
        when ${input.filter} <> 'published'
          and queue.status in ('draft', 'ready', 'publishing')
          then queue.scheduled_for
      end asc nulls last,
      coalesce(queue.published_at, queue.updated_at) desc,
      queue.created_at desc
    limit ${input.pageSize}
    offset ${offset}
  `;

  return {
    filter: input.filter,
    date: filterDate,
    page: input.page,
    pageSize: input.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
    items: rows.map(queueSummaryFromRow),
  };
}


export async function listTelegramAdminUpcomingItems(limit = 5) {
  const sql = getAdminDatabase();
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 20);
  const rows = await sql`
    select
      queue.id::text,
      queue.content_key,
      queue.content_class,
      queue.content_type,
      queue.status,
      queue.scheduled_for::text,
      queue.updated_at::text,
      queue.published_at::text,
      queue.retry_after::text,
      queue.attempt_count,
      queue.last_error,
      queue.writer_input,
      left(queue.rendered_payload ->> 'text', 220) as preview_text
    from halleus_private.telegram_content_queue as queue
    where queue.status = 'ready'
      and queue.scheduled_for > now()
      and queue.telegram_message_id is null
    order by queue.scheduled_for asc, queue.created_at asc
    limit ${safeLimit}
  `;
  return rows.map(queueSummaryFromRow);
}

export async function listTelegramAdminFutureDays(limit = 120) {
  const sql = getAdminDatabase();
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 180);
  const rows = await sql`
    select
      (scheduled_for at time zone 'Asia/Tehran')::date::text as local_date,
      count(*)::int as total,
      count(*) filter (
        where status in ('draft', 'ready')
          and telegram_message_id is null
      )::int as manageable_count,
      min(scheduled_for)::text as first_scheduled_at,
      max(scheduled_for)::text as last_scheduled_at
    from halleus_private.telegram_content_queue
    where scheduled_for > now()
      and status in ('draft', 'ready', 'publishing')
    group by (scheduled_for at time zone 'Asia/Tehran')::date
    order by (scheduled_for at time zone 'Asia/Tehran')::date
    limit ${safeLimit}
  `;

  return rows.map((raw) => {
    const row = asRecord(raw);
    return {
      localDate: asString(row.local_date),
      total: asNumber(row.total),
      manageableCount: asNumber(row.manageable_count),
      firstScheduledAt: asNullableString(row.first_scheduled_at),
      lastScheduledAt: asNullableString(row.last_scheduled_at),
    };
  });
}

export async function getTelegramAdminQueueDetail(id: string) {
  const sql = getAdminDatabase();
  const rows = await sql`
    select
      queue.id::text,
      queue.content_key,
      queue.content_class,
      queue.content_type,
      queue.status,
      queue.writer_input,
      queue.rendered_payload,
      queue.source_provenance,
      queue.cta,
      queue.scheduled_for::text,
      queue.updated_at::text,
      queue.last_attempt_at::text,
      queue.dispatch_started_at::text,
      queue.retry_after::text,
      queue.published_at::text,
      queue.attempt_count,
      queue.telegram_message_id::text,
      queue.last_error,
      left(queue.rendered_payload ->> 'text', 220) as preview_text
    from halleus_private.telegram_content_queue as queue
    where queue.id = ${id}::uuid
    limit 1
  `;
  if (!rows[0]) return null;

  const row = asRecord(rows[0]);
  const summary = queueSummaryFromRow(row);
  const writer = asRecord(row.writer_input);
  const sourceFacts = asRecord(writer.sourceFacts);
  const payload = asRecord(row.rendered_payload);
  const cta = readStoredCta(row.cta);
  const hashtags = readStringArray(writer.hashtags);
  const status = summary.status;
  const lastError = asNullableString(row.last_error);
  const telegramMessageId = asNullableString(row.telegram_message_id);

  return {
    ...summary,
    telegramMessageId,
    dispatchStartedAt: asNullableString(row.dispatch_started_at),
    lastAttemptAt: asNullableString(row.last_attempt_at),
    editableText: editableTelegramText({
      payloadText: asString(payload.text),
      hashtags,
      cta,
    }),
    renderedPayload: {
      text: asString(payload.text),
      parseMode: "HTML" as const,
      disableWebPagePreview: true as const,
    },
    cta,
    sourceRef: asNullableString(sourceFacts.sourceRef),
    itemId: asNullableString(sourceFacts.itemId),
    timingMode: asNullableString(sourceFacts.timingMode),
    eventAt: asNullableString(sourceFacts.eventAt),
    sourceProvenance:
      row.source_provenance &&
      typeof row.source_provenance === "object" &&
      !Array.isArray(row.source_provenance)
        ? (row.source_provenance as Record<string, unknown>)
        : null,
    canEdit:
      (status === "draft" || status === "ready") &&
      telegramMessageId === null,
    canReschedule:
      (status === "draft" || status === "ready") &&
      telegramMessageId === null,
    canCancel:
      (status === "draft" || status === "ready") &&
      telegramMessageId === null,
    canRetry:
      status === "failed" &&
      telegramMessageId === null &&
      (lastError?.startsWith("[safe_retry]") ?? false),
    canSendNow:
      status === "ready" &&
      telegramMessageId === null &&
      !(lastError?.startsWith("[delivery_uncertain]") ?? false) &&
      !(
        summary.retryAfter &&
        summary.attemptCount > 0 &&
        Date.parse(summary.retryAfter) > Date.now()
      ),
    scheduledLocal: tehranLocalInputFromIso(summary.scheduledFor),
  };
}

function ensureExpectedUpdatedAt(actual: string, expected: string) {
  if (
    !expected ||
    new Date(actual).toISOString() !== new Date(expected).toISOString()
  ) {
    throw new TelegramAdminMutationError(
      409,
      "این پیام بعد از بازشدن جزئیات تغییر کرده؛ اول تازه‌سازی کن.",
    );
  }
}

type TelegramAdminTransaction = Parameters<
  Parameters<ReturnType<typeof getAdminDatabase>["begin"]>[1]
>[0];

async function loadMutableTelegramRow(
  tx: TelegramAdminTransaction,
  id: string,
) {
  const rows = await tx`
    select
      id::text,
      status,
      writer_input,
      rendered_payload,
      source_provenance,
      cta,
      scheduled_for::text,
      updated_at::text,
      attempt_count,
      telegram_message_id::text,
      last_error
    from halleus_private.telegram_content_queue
    where id = ${id}::uuid
    for update
    limit 1
  `;
  if (!rows[0]) {
    throw new TelegramAdminMutationError(404, "پیام تلگرام پیدا نشد.");
  }
  return asRecord(rows[0]);
}

function assertUnsentMutable(row: Record<string, unknown>) {
  const status = asString(row.status);
  if (!["draft", "ready"].includes(status)) {
    throw new TelegramAdminMutationError(
      409,
      "فقط پیام پیش‌نویس یا آماده‌ای که وارد dispatch نشده قابل ویرایش است.",
    );
  }
  if (asNullableString(row.telegram_message_id)) {
    throw new TelegramAdminMutationError(
      409,
      "پیام ارسال‌شده قابل ویرایش نیست.",
    );
  }
}

export async function editTelegramAdminQueueItem(input: {
  id: string;
  expectedUpdatedAt: string;
  text: string;
  cta: unknown;
}) {
  const sql = getAdminDatabase();
  return sql.begin(async (tx) => {
    const row = await loadMutableTelegramRow(tx, input.id);
    assertUnsentMutable(row);
    const beforeStatus = asString(row.status);
    ensureExpectedUpdatedAt(asString(row.updated_at), input.expectedUpdatedAt);

    const writer = asRecord(row.writer_input);
    const hashtags = readStringArray(writer.hashtags);
    const cta = parseTelegramAdminCta(input.cta);
    const payload = renderTelegramAdminPayload({
      text: input.text,
      hashtags,
      cta,
    });
    const nextWriter = {
      ...writer,
      cta,
    };

    const updated = await tx`
      update halleus_private.telegram_content_queue
      set writer_input = ${tx.json(nextWriter)},
          rendered_payload = ${tx.json(payload)},
          cta = ${cta ? tx.json(cta) : null},
          updated_at = now()
      where id = ${input.id}::uuid
        and status in ('draft', 'ready')
        and updated_at = ${input.expectedUpdatedAt}::timestamptz
        and telegram_message_id is null
      returning id::text, updated_at::text
    `;
    if (!updated[0]) {
      throw new TelegramAdminMutationError(
        409,
        "وضعیت پیام هم‌زمان تغییر کرد؛ اول تازه‌سازی کن.",
      );
    }

    await tx`
      insert into halleus_private.telegram_queue_events (
        queue_id, event_type, status_before, status_after,
        reason, attempt_count
      )
      values (
        ${input.id}::uuid,
        'edited',
        ${beforeStatus},
        ${beforeStatus},
        'Message body and/or CTA edited by admin.',
        ${asNumber(row.attempt_count)}
      )
    `;

    return {
      id: input.id,
      status: beforeStatus,
      updatedAt: new Date(asString(updated[0].updated_at)).toISOString(),
    };
  });
}

function dayDifference(left: string, right: string) {
  return Math.round(
    (
      Date.parse(`${right}T00:00:00.000Z`) -
      Date.parse(`${left}T00:00:00.000Z`)
    ) / 86_400_000,
  );
}

function validateAdminReschedule(
  row: Record<string, unknown>,
  scheduledFor: string,
) {
  if (Date.parse(scheduledFor) <= Date.now() + 30_000) {
    throw new TelegramAdminMutationError(
      409,
      "برای زمان گذشته از Reschedule استفاده نکن؛ زمان آینده انتخاب کن یا Send Now را صریحاً تأیید کن.",
    );
  }

  const writer = asRecord(row.writer_input);
  const sourceFacts = asRecord(writer.sourceFacts);
  const timingMode = asNullableString(sourceFacts.timingMode) ?? "same_day";
  const eventAt = asNullableString(sourceFacts.eventAt);
  const provenance = asRecord(row.source_provenance);
  const snapshotLocalDate = asNullableString(provenance.snapshotLocalDate);
  const scheduledLocalDate = tehranDateFromIso(scheduledFor);

  if (timingMode === "pre_event") {
    if (!eventAt || Date.parse(scheduledFor) >= Date.parse(eventAt)) {
      throw new TelegramAdminMutationError(
        409,
        "پیام pre_event باید قبل از زمان واقعی event بماند.",
      );
    }
    if (snapshotLocalDate && snapshotLocalDate !== scheduledLocalDate) {
      const days = dayDifference(scheduledLocalDate, snapshotLocalDate);
      if (days < 1 || days > 3) {
        throw new TelegramAdminMutationError(
          409,
          "پیام pre_event فقط در lookahead یک تا سه روزهٔ provenance خودش قابل جابه‌جایی است.",
        );
      }
    }
    return;
  }

  if (timingMode === "at_or_after_event") {
    if (!eventAt || Date.parse(scheduledFor) < Date.parse(eventAt)) {
      throw new TelegramAdminMutationError(
        409,
        "این پیام نباید قبل از event واقعی زمان‌بندی شود.",
      );
    }
    if (snapshotLocalDate && snapshotLocalDate !== scheduledLocalDate) {
      throw new TelegramAdminMutationError(
        409,
        "پیام post-event باید در همان تاریخ تهرانِ provenance خودش بماند.",
      );
    }
    return;
  }

  if (snapshotLocalDate && snapshotLocalDate !== scheduledLocalDate) {
    throw new TelegramAdminMutationError(
      409,
      "پیام same_day باید در همان تاریخ تهرانِ provenance خودش بماند.",
    );
  }
}

export async function rescheduleTelegramAdminQueueItem(input: {
  id: string;
  expectedUpdatedAt: string;
  scheduledLocal: string;
}) {
  const scheduledFor = tehranLocalInputToIso(input.scheduledLocal);
  const sql = getAdminDatabase();

  return sql.begin(async (tx) => {
    const row = await loadMutableTelegramRow(tx, input.id);
    assertUnsentMutable(row);
    ensureExpectedUpdatedAt(asString(row.updated_at), input.expectedUpdatedAt);
    validateAdminReschedule(row, scheduledFor);

    const writer = asRecord(row.writer_input);
    const previousWindow = asRecord(writer.scheduledWindow);
    const nextWriter = {
      ...writer,
      scheduledWindow: {
        ...previousWindow,
        startAt: scheduledFor,
        endAt: new Date(
          Date.parse(scheduledFor) + 10 * 60_000,
        ).toISOString(),
      },
    };
    const beforeStatus = asString(row.status);

    const updated = await tx`
      update halleus_private.telegram_content_queue
      set scheduled_for = ${scheduledFor}::timestamptz,
          writer_input = ${tx.json(nextWriter)},
          retry_after = null,
          updated_at = now()
      where id = ${input.id}::uuid
        and status in ('draft', 'ready')
        and updated_at = ${input.expectedUpdatedAt}::timestamptz
        and telegram_message_id is null
      returning id::text, scheduled_for::text, updated_at::text
    `;
    if (!updated[0]) {
      throw new TelegramAdminMutationError(
        409,
        "وضعیت پیام هم‌زمان تغییر کرد؛ اول تازه‌سازی کن.",
      );
    }

    await tx`
      insert into halleus_private.telegram_queue_events (
        queue_id, event_type, status_before, status_after,
        reason, attempt_count
      )
      values (
        ${input.id}::uuid,
        'rescheduled',
        ${beforeStatus},
        ${beforeStatus},
        ${`Rescheduled to ${scheduledFor}`},
        ${asNumber(row.attempt_count)}
      )
    `;

    return {
      id: input.id,
      status: beforeStatus,
      scheduledFor,
      updatedAt: new Date(asString(updated[0].updated_at)).toISOString(),
    };
  });
}

export async function cancelTelegramAdminQueueItem(input: {
  id: string;
  expectedUpdatedAt: string;
  reason: string;
}) {
  const sql = getAdminDatabase();

  return sql.begin(async (tx) => {
    const row = await loadMutableTelegramRow(tx, input.id);
    assertUnsentMutable(row);
    ensureExpectedUpdatedAt(asString(row.updated_at), input.expectedUpdatedAt);
    const beforeStatus = asString(row.status);
    const reason =
      input.reason.trim().slice(0, 240) || "لغو دستی از پنل ادمین";

    const updated = await tx`
      update halleus_private.telegram_content_queue
      set status = 'cancelled',
          retry_after = null,
          last_error = ${`[admin_cancelled] ${reason}`},
          updated_at = now()
      where id = ${input.id}::uuid
        and status in ('draft', 'ready')
        and updated_at = ${input.expectedUpdatedAt}::timestamptz
        and telegram_message_id is null
      returning id::text, updated_at::text
    `;
    if (!updated[0]) {
      throw new TelegramAdminMutationError(
        409,
        "وضعیت پیام هم‌زمان تغییر کرد؛ اول تازه‌سازی کن.",
      );
    }

    await tx`
      insert into halleus_private.telegram_queue_events (
        queue_id, event_type, status_before, status_after,
        reason, attempt_count
      )
      values (
        ${input.id}::uuid,
        'cancelled',
        ${beforeStatus},
        'cancelled',
        ${reason},
        ${asNumber(row.attempt_count)}
      )
    `;

    return {
      id: input.id,
      beforeStatus,
      status: "cancelled" as const,
      updatedAt: new Date(asString(updated[0].updated_at)).toISOString(),
    };
  });
}

export async function retryTelegramAdminQueueItem(input: {
  id: string;
  expectedUpdatedAt: string;
}) {
  const sql = getAdminDatabase();

  return sql.begin(async (tx) => {
    const row = await loadMutableTelegramRow(tx, input.id);
    const status = asString(row.status);
    const lastError = asNullableString(row.last_error);
    const scheduledForMs = Date.parse(asString(row.scheduled_for));
    const automaticExpiryCutoffMs =
      Date.now() - TELEGRAM_AUTOMATIC_SEND_MAX_LATE_MS;
    ensureExpectedUpdatedAt(asString(row.updated_at), input.expectedUpdatedAt);

    if (status !== "failed") {
      throw new TelegramAdminMutationError(
        409,
        "Retry دستی فقط برای status=failed مجاز است.",
      );
    }
    if (asNullableString(row.telegram_message_id)) {
      throw new TelegramAdminMutationError(
        409,
        "پیامی که Telegram message ID دارد دوباره ارسال نمی‌شود.",
      );
    }
    if (lastError?.startsWith("[delivery_uncertain]")) {
      throw new TelegramAdminMutationError(
        409,
        "delivery_uncertain هرگز Retry معمولی نمی‌گیرد؛ ممکن است پیام قبلاً ارسال شده باشد.",
      );
    }
    if (
      !Number.isFinite(scheduledForMs) ||
      scheduledForMs <= automaticExpiryCutoffMs
    ) {
      throw new TelegramAdminMutationError(
        409,
        "زمان این پیام گذشته است و Retry خودکار/دستی برای جلوگیری از backfill دیرهنگام مسدود است؛ نسخهٔ تازه را در Content Pack آینده بساز.",
      );
    }
    if (!lastError?.startsWith("[safe_retry]")) {
      throw new TelegramAdminMutationError(
        409,
        "وضعیت canonical این خطا Retry امن را تأیید نمی‌کند؛ ابتدا علت خطای نهایی را بررسی کن.",
      );
    }

    const updated = await tx`
      update halleus_private.telegram_content_queue
      set status = 'ready',
          attempt_count = 0,
          retry_after = now(),
          dispatch_started_at = null,
          last_error = '[admin_retry] manual safe retry queued by admin',
          updated_at = now()
      where id = ${input.id}::uuid
        and status = 'failed'
        and updated_at = ${input.expectedUpdatedAt}::timestamptz
        and telegram_message_id is null
        and scheduled_for > ${new Date(automaticExpiryCutoffMs).toISOString()}::timestamptz
      returning id::text, updated_at::text
    `;

    if (!updated[0]) {
      throw new TelegramAdminMutationError(
        409,
        "وضعیت پیام هم‌زمان تغییر کرد یا زمان امن Retry گذشته است؛ اول تازه‌سازی کن.",
      );
    }

    await tx`
      insert into halleus_private.telegram_queue_events (
        queue_id, event_type, status_before, status_after,
        reason, attempt_count
      )
      values (
        ${input.id}::uuid,
        'manual_retry',
        'failed',
        'ready',
        'Manual safe retry accepted inside the automatic freshness window; canonical due-publisher owns the next delivery attempt.',
        0
      )
    `;

    return {
      id: input.id,
      status: "ready" as const,
      attemptCount: 0,
      updatedAt: new Date(asString(updated[0].updated_at)).toISOString(),
    };
  });
}

export async function setTelegramAdminGlobalPause(input: {
  paused: boolean;
  expectedUpdatedAt: string;
  actorUserId: string;
  reason: string;
}) {
  const sql = getAdminDatabase();

  return sql.begin(async (tx) => {
    const controlRows = await tx`
      select global_paused, updated_at::text
      from halleus_private.telegram_publish_control
      where singleton = true
      for update
      limit 1
    `;
    if (!controlRows[0]) {
      throw new TelegramAdminMutationError(
        500,
        "Telegram publish control row is missing.",
      );
    }

    const control = asRecord(controlRows[0]);
    ensureExpectedUpdatedAt(
      asString(control.updated_at),
      input.expectedUpdatedAt,
    );

    let backlogSkipped = 0;
    if (!input.paused) {
      const skippedRows = await tx`
        with moved as (
          update halleus_private.telegram_content_queue
          set status = 'skipped',
              retry_after = null,
              last_error = '[pause_resume_skip] missed while global publishing was paused; not backfilled',
              updated_at = now()
          where status = 'ready'
            and scheduled_for <= now()
          returning id, attempt_count
        ),
        events as (
          insert into halleus_private.telegram_queue_events (
            queue_id, event_type, status_before, status_after,
            reason, attempt_count
          )
          select
            id,
            'pause_resume_backlog_skipped',
            'ready',
            'skipped',
            'Missed while global pause was active; deliberately not burst-sent on resume.',
            attempt_count
          from moved
          returning queue_id
        )
        select count(*)::int as skipped_count
        from events
      `;
      backlogSkipped = asNumber(
        asRecord(skippedRows[0]).skipped_count,
      );
    }

    const updated = await tx`
      update halleus_private.telegram_publish_control
      set global_paused = ${input.paused},
          updated_by = ${input.actorUserId}::uuid,
          updated_at = now()
      where singleton = true
        and updated_at = ${input.expectedUpdatedAt}::timestamptz
      returning global_paused, updated_at::text
    `;
    if (!updated[0]) {
      throw new TelegramAdminMutationError(
        409,
        "وضعیت Pause هم‌زمان تغییر کرد؛ اول تازه‌سازی کن.",
      );
    }

    return {
      globalPaused: input.paused,
      backlogSkipped,
      updatedAt: new Date(asString(updated[0].updated_at)).toISOString(),
      reason: input.reason.trim().slice(0, 240),
    };
  });
}

function validatePauseLocalDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TelegramAdminMutationError(400, "تاریخ Pause معتبر نیست.");
  }
  const today = tehranDateFromIso(new Date().toISOString());
  if (value < today) {
    throw new TelegramAdminMutationError(
      409,
      "برای روز گذشته Pause جدید ساخته نمی‌شود.",
    );
  }
  return value;
}

export async function pauseTelegramAdminDay(input: {
  localDate: string;
  actorUserId: string;
  reason: string;
}) {
  const localDate = validatePauseLocalDate(input.localDate);
  const reason =
    input.reason.trim().slice(0, 240) || "Pause یک‌روزه از پنل ادمین";
  const sql = getAdminDatabase();

  await sql`
    insert into halleus_private.telegram_paused_days (
      local_date, reason, created_by
    )
    values (
      ${localDate}::date,
      ${reason},
      ${input.actorUserId}::uuid
    )
    on conflict (local_date) do update set
      reason = excluded.reason,
      created_by = excluded.created_by
  `;

  return {
    localDate,
    paused: true,
  };
}

export async function resumeTelegramAdminDay(input: {
  localDate: string;
  reason: string;
}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.localDate)) {
    throw new TelegramAdminMutationError(400, "تاریخ Resume معتبر نیست.");
  }
  const sql = getAdminDatabase();

  return sql.begin(async (tx) => {
    const pausedRows = await tx`
      select local_date::text
      from halleus_private.telegram_paused_days
      where local_date = ${input.localDate}::date
      for update
      limit 1
    `;
    if (!pausedRows[0]) {
      return {
        localDate: input.localDate,
        paused: false,
        backlogSkipped: 0,
        reason: input.reason.trim().slice(0, 240),
      };
    }

    const skippedRows = await tx`
      with moved as (
        update halleus_private.telegram_content_queue
        set status = 'skipped',
            retry_after = null,
            last_error = '[pause_resume_skip] missed while this Tehran day was paused; not backfilled',
            updated_at = now()
        where status = 'ready'
          and scheduled_for <= now()
          and (scheduled_for at time zone 'Asia/Tehran')::date =
            ${input.localDate}::date
        returning id, attempt_count
      ),
      events as (
        insert into halleus_private.telegram_queue_events (
          queue_id, event_type, status_before, status_after,
          reason, attempt_count
        )
        select
          id,
          'day_pause_backlog_skipped',
          'ready',
          'skipped',
          'Missed during a one-day pause; deliberately not burst-sent on resume.',
          attempt_count
        from moved
        returning queue_id
      )
      select count(*)::int as skipped_count
      from events
    `;

    await tx`
      delete from halleus_private.telegram_paused_days
      where local_date = ${input.localDate}::date
    `;

    return {
      localDate: input.localDate,
      paused: false,
      backlogSkipped: asNumber(
        asRecord(skippedRows[0]).skipped_count,
      ),
      reason: input.reason.trim().slice(0, 240),
    };
  });
}

export async function getTelegramAdminControlSnapshot() {
  const sql = getAdminDatabase();
  const today = tehranDateFromIso(new Date().toISOString());
  const tomorrow = addLocalDateDays(today, 1);
  const activeFailureCutoff = new Date(
    Date.now() - TELEGRAM_AUTOMATIC_SEND_MAX_LATE_MS,
  ).toISOString();

  const controlRows = await sql`
    select global_paused, updated_at::text
    from halleus_private.telegram_publish_control
    where singleton = true
    limit 1
  `;
  if (!controlRows[0]) {
    throw new Error("Telegram publish control row is missing.");
  }
  const control = asRecord(controlRows[0]);

  const counterRows = await sql`
    select
      count(*) filter (
        where status = 'ready'
          and scheduled_for <= now()
          and scheduled_for > ${activeFailureCutoff}::timestamptz
          and (retry_after is null or retry_after <= now())
      )::int as due_now,
      count(*) filter (
        where status = 'ready'
          and scheduled_for > now()
      )::int as scheduled,
      count(*) filter (
        where status = 'published'
      )::int as sent,
      count(*) filter (
        where status = 'failed'
          and scheduled_for > ${activeFailureCutoff}::timestamptz
      )::int as failed,
      count(*) filter (
        where status = 'failed'
          and scheduled_for <= ${activeFailureCutoff}::timestamptz
      )::int as historical_failed,
      count(*) filter (
        where status = 'skipped'
      )::int as skipped,
      count(*) filter (
        where status = 'cancelled'
      )::int as cancelled,
      count(*) filter (
        where status = 'failed'
          and last_error like '[delivery_uncertain]%'
          and scheduled_for > ${activeFailureCutoff}::timestamptz
      )::int as uncertain,
      count(*) filter (
        where status = 'failed'
          and last_error like '[delivery_uncertain]%'
          and scheduled_for <= ${activeFailureCutoff}::timestamptz
      )::int as historical_uncertain,
      count(*) filter (
        where status = 'ready'
          and attempt_count > 0
      )::int as retrying,
      count(*) filter (
        where status = 'publishing'
          and last_attempt_at < now() - interval '5 minutes'
      )::int as stale_publishing,
      count(*) filter (
        where status = 'ready'
          and (scheduled_for at time zone 'Asia/Tehran')::date =
            ${today}::date
      )::int as today_remaining,
      count(*) filter (
        where status = 'published'
          and (scheduled_for at time zone 'Asia/Tehran')::date =
            ${today}::date
      )::int as today_published,
      count(*) filter (
        where status in ('draft', 'ready', 'publishing')
          and (scheduled_for at time zone 'Asia/Tehran')::date =
            ${tomorrow}::date
      )::int as tomorrow_remaining,
      count(*) filter (
        where status in ('draft', 'ready')
          and scheduled_for > now()
          and telegram_message_id is null
      )::int as future_clearable
    from halleus_private.telegram_content_queue
  `;
  const counters = asRecord(counterRows[0]);

  const upcomingRows = await sql`
    select
      id::text,
      content_key,
      content_class,
      content_type,
      status,
      scheduled_for::text,
      updated_at::text,
      published_at::text,
      retry_after::text,
      attempt_count,
      last_error,
      writer_input,
      left(rendered_payload ->> 'text', 220) as preview_text
    from halleus_private.telegram_content_queue
    where status = 'ready'
      and scheduled_for > now()
    order by greatest(
      scheduled_for,
      coalesce(retry_after, scheduled_for)
    ), created_at
    limit 5
  `;

  const coverageRows = await sql`
    select max(scheduled_for)::text as coverage_through
    from halleus_private.telegram_content_queue
    where status in ('draft', 'ready', 'publishing')
      and scheduled_for > now()
  `;

  const timelineRows = await sql`
    select
      id::text,
      content_key,
      content_class,
      content_type,
      status,
      scheduled_for::text,
      updated_at::text,
      published_at::text,
      retry_after::text,
      attempt_count,
      last_error,
      writer_input,
      left(rendered_payload ->> 'text', 220) as preview_text
    from halleus_private.telegram_content_queue
    where (scheduled_for at time zone 'Asia/Tehran')::date =
      ${today}::date
    order by scheduled_for, created_at
    limit 200
  `;

  const pausedRows = await sql`
    select local_date::text, reason, created_at::text
    from halleus_private.telegram_paused_days
    where local_date >= ${today}::date
    order by local_date
    limit 60
  `;

  const packRows = await sql`
    select
      writer_input #>> '{sourceFacts,packId}' as pack_id,
      count(*)::int as total,
      count(*) filter (where status = 'published')::int as published,
      count(*) filter (where status = 'ready')::int as ready,
      count(*) filter (where status = 'failed')::int as failed,
      count(*) filter (where status = 'skipped')::int as skipped,
      count(*) filter (where status = 'cancelled')::int as cancelled,
      min(scheduled_for)::text as range_start,
      max(scheduled_for)::text as range_end,
      max(
        case
          when writer_input #>> '{sourceFacts,aiContentConfigVersion}' ~ '^\d+$'
            then (writer_input #>> '{sourceFacts,aiContentConfigVersion}')::int
          else null
        end
      )::int as ai_content_config_version
    from halleus_private.telegram_content_queue
    where writer_input #>> '{sourceFacts,packId}' is not null
    group by writer_input #>> '{sourceFacts,packId}'
    order by max(generated_at) desc
    limit 8
  `;

  const policyRows = await sql`
    select
      id::text,
      target_id as pack_id,
      coalesce(
        (after_summary ->> 'skippedPastCount')::int,
        0
      ) as skipped_past_count,
      coalesce(
        (after_summary ->> 'skippedDuplicateCount')::int,
        0
      ) as skipped_duplicate_count,
      created_at::text
    from halleus_private.admin_audit_events
    where action = 'admin.telegram.content_pack_imported'
      and (
        coalesce(
          (after_summary ->> 'skippedPastCount')::int,
          0
        ) > 0
        or coalesce(
          (after_summary ->> 'skippedDuplicateCount')::int,
          0
        ) > 0
      )
    order by created_at desc
    limit 12
  `;

  const globalPaused = control.global_paused === true;
  const dueNow = asNumber(counters.due_now);
  const failed = asNumber(counters.failed);
  const uncertain = asNumber(counters.uncertain);
  const historicalFailed = asNumber(counters.historical_failed);
  const historicalUncertain = asNumber(counters.historical_uncertain);
  const stalePublishing = asNumber(counters.stale_publishing);
  const pausedDays = pausedRows.map((raw) => {
    const row = asRecord(raw);
    return {
      localDate: asString(row.local_date),
      reason: asString(row.reason),
      createdAt: new Date(
        asString(row.created_at),
      ).toISOString(),
    };
  });

  const alerts: Array<{
    level: "info" | "warning" | "critical";
    code: string;
    message: string;
  }> = [];

  if (globalPaused) {
    alerts.push({
      level: "warning",
      code: "global_paused",
      message:
        "انتشار سراسری تلگرام Pause است؛ Cron چیزی از صف claim نمی‌کند.",
    });
  }
  if (pausedDays.some((item) => item.localDate === today)) {
    alerts.push({
      level: "warning",
      code: "today_paused",
      message:
        "امروز در Asia/Tehran متوقف شده و پیام‌های این روز خودکار ارسال نمی‌شوند.",
    });
  }
  if (uncertain > 0) {
    alerts.push({
      level: "critical",
      code: "delivery_uncertain",
      message:
        `${uncertain} پیام delivery_uncertain است؛ Retry معمولی برای آن‌ها عمداً مسدود است.`,
    });
  }
  if (historicalFailed > 0) {
    alerts.push({
      level: "info",
      code: "expired_failure_history",
      message:
        `${historicalFailed} پیام ناموفق منقضی فقط در تاریخچه مانده است؛ publisher آن‌ها را خودکار backfill/Retry نمی‌کند.${historicalUncertain > 0 ? ` ${historicalUncertain} مورد delivery_uncertain تاریخی است.` : ""}`,
    });
  }
  if (stalePublishing > 0) {
    alerts.push({
      level: "critical",
      code: "stale_publishing",
      message:
        `${stalePublishing} claim انتشار بیش از پنج دقیقه در publishing مانده است.`,
    });
  }
  if (failed > 0) {
    alerts.push({
      level: "warning",
      code: "failed",
      message:
        `${failed} پیام status=failed دارد و باید Failure Center بررسی شود.`,
    });
  }
  if (dueNow > 0 && !globalPaused) {
    alerts.push({
      level: "info",
      code: "due_now",
      message:
        `${dueNow} پیام اکنون due است و publisher در اجرای بعدی آن‌ها را به ترتیب می‌گیرد.`,
    });
  }
  if (!upcomingRows[0]) {
    alerts.push({
      level: "warning",
      code: "no_upcoming",
      message:
        "هیچ پیام ready آینده‌ای در صف دیده نمی‌شود؛ پوشش Content Pack را بررسی کن.",
    });
  }

  return {
    timezone: TELEGRAM_ADMIN_TIMEZONE,
    globalPaused,
    controlUpdatedAt: new Date(
      asString(control.updated_at),
    ).toISOString(),
    pausedDays,
    counters: {
      dueNow,
      scheduled: asNumber(counters.scheduled),
      sent: asNumber(counters.sent),
      failed,
      historicalFailedCount: historicalFailed,
      skipped: asNumber(counters.skipped),
      cancelled: asNumber(counters.cancelled),
      retryingCount: asNumber(counters.retrying),
      uncertainCount: uncertain,
      historicalUncertainCount: historicalUncertain,
      stalePublishingCount: stalePublishing,
      todayRemaining: asNumber(counters.today_remaining),
      todayPublished: asNumber(counters.today_published),
      tomorrowRemaining: asNumber(counters.tomorrow_remaining),
      futureClearableCount: asNumber(counters.future_clearable),
    },
    coverageThrough: asNullableString(asRecord(coverageRows[0]).coverage_through),
    nextItem: upcomingRows[0]
      ? queueSummaryFromRow(upcomingRows[0])
      : null,
    upcomingItems: upcomingRows.map(queueSummaryFromRow),
    todayTimeline: timelineRows.map(queueSummaryFromRow),
    packs: packRows.map((raw) => {
      const row = asRecord(raw);
      return {
        packId: asString(row.pack_id),
        total: asNumber(row.total),
        published: asNumber(row.published),
        ready: asNumber(row.ready),
        failed: asNumber(row.failed),
        skipped: asNumber(row.skipped),
        cancelled: asNumber(row.cancelled),
        rangeStart: asNullableString(row.range_start),
        rangeEnd: asNullableString(row.range_end),
        aiContentConfigVersion:
          row.ai_content_config_version == null
            ? null
            : asNumber(row.ai_content_config_version),
      };
    }),
    alerts,
    policySkips: policyRows.map((raw) => {
      const row = asRecord(raw);
      return {
        id: asString(row.id),
        packId: asNullableString(row.pack_id),
        skippedPastCount: asNumber(row.skipped_past_count),
        skippedDuplicateCount: asNumber(
          row.skipped_duplicate_count,
        ),
        createdAt: new Date(
          asString(row.created_at),
        ).toISOString(),
      };
    }),
  };
}

// HALLEUS_TELEGRAM_CLEAR_FUTURE_QUEUE_R1
export async function clearTelegramAdminFutureQueue(input: {
  actorUserId: string;
  reason: string;
}) {
  const reason =
    input.reason.trim().slice(0, 240) ||
    "پاک‌کردن صف آینده از پنل ادمین";
  const sql = getAdminDatabase();

  return sql.begin(async (tx) => {
    const rows = await tx`
      with candidates as (
        select id, status, attempt_count
        from halleus_private.telegram_content_queue
        where status in ('draft', 'ready')
          and scheduled_for > now()
          and telegram_message_id is null
        for update
      ),
      moved as (
        update halleus_private.telegram_content_queue as queue
        set status = 'cancelled',
            retry_after = null,
            last_error = ${`[admin_bulk_cancelled_future] ${reason}`},
            updated_at = now()
        from candidates
        where queue.id = candidates.id
        returning
          queue.id,
          candidates.status as status_before,
          queue.attempt_count
      ),
      events as (
        insert into halleus_private.telegram_queue_events (
          queue_id,
          event_type,
          status_before,
          status_after,
          reason,
          attempt_count
        )
        select
          id,
          'bulk_cancelled_future',
          status_before,
          'cancelled',
          ${reason},
          attempt_count
        from moved
        returning queue_id
      )
      select count(*)::int as cancelled_count
      from events
    `;

    return {
      cancelledCount: asNumber(asRecord(rows[0]).cancelled_count),
      actorUserId: input.actorUserId,
    };
  });
}

// HALLEUS_TELEGRAM_CANCEL_SELECTED_FUTURE_DAYS_R1
export async function cancelTelegramAdminFutureDays(input: {
  localDates: string[];
  actorUserId: string;
  reason: string;
}) {
  const localDates = [...new Set(input.localDates)].filter((value) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value),
  );
  if (localDates.length === 0 || localDates.length > 31) {
    throw new TelegramAdminMutationError(
      400,
      "بین ۱ تا ۳۱ روز معتبر برای لغو گروهی انتخاب کن.",
    );
  }

  const reason =
    input.reason.trim().slice(0, 240) ||
    "لغو گروهی روزهای آینده از پنل ادمین";
  const sql = getAdminDatabase();

  return sql.begin(async (tx) => {
    const rows = await tx`
      with candidates as (
        select id, status, attempt_count
        from halleus_private.telegram_content_queue
        where status in ('draft', 'ready')
          and scheduled_for > now()
          and telegram_message_id is null
          and (scheduled_for at time zone 'Asia/Tehran')::date::text =
            any(${localDates}::text[])
        for update
      ),
      moved as (
        update halleus_private.telegram_content_queue as queue
        set status = 'cancelled',
            retry_after = null,
            last_error = ${`[admin_bulk_cancelled_days] ${reason}`},
            updated_at = now()
        from candidates
        where queue.id = candidates.id
        returning
          queue.id,
          candidates.status as status_before,
          queue.attempt_count
      ),
      events as (
        insert into halleus_private.telegram_queue_events (
          queue_id,
          event_type,
          status_before,
          status_after,
          reason,
          attempt_count
        )
        select
          id,
          'bulk_cancelled_future',
          status_before,
          'cancelled',
          ${reason},
          attempt_count
        from moved
        returning queue_id
      )
      select count(*)::int as cancelled_count
      from events
    `;

    return {
      cancelledCount: asNumber(asRecord(rows[0]).cancelled_count),
      localDates,
      actorUserId: input.actorUserId,
    };
  });
}
