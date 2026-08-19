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

// HALLEUS_TELEGRAM_EXPIRED_BACKLOG_NO_BACKFILL_R1
// Automatic publishing gets a bounded freshness window. Older ready items are
// retired as skipped history instead of being burst-sent after downtime.
export const TELEGRAM_AUTOMATIC_SEND_MAX_LATE_MS = 30 * 60_000;

export type TelegramQueueInitialStatus = "draft" | "ready";

export type TelegramQueueItem = {
  id: string;
  contentKey: string;
  contentClass: TelegramPlannedContent["contentClass"];
  contentType: TelegramPlannedContent["contentType"];
  payload: TelegramRenderedPayload;
  scheduledFor: string;
  status: "draft" | "ready" | "publishing" | "published" | "failed" | "skipped" | "cancelled";
  attemptCount: number;
  telegramMessageId: string | null;
};

export type TelegramQueueFailureOutcome = {
  retried: boolean;
  terminal: boolean;
  deliveryUncertain: boolean;
  autoPaused: boolean;
  retryAfter: string | null;
};

export type TelegramQueueRecoveryResult = {
  expiredBeforeDispatch: number;
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
  if (![
    "draft",
    "ready",
    "publishing",
    "published",
    "failed",
    "skipped",
    "cancelled",
  ].includes(status)) {
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
  const staleCutoff = new Date(
    now.getTime() - TELEGRAM_STALE_PUBLISHING_MS,
  ).toISOString();
  const automaticExpiryCutoff = new Date(
    now.getTime() - TELEGRAM_AUTOMATIC_SEND_MAX_LATE_MS,
  ).toISOString();
  const sql = getAdminDatabase();

  return sql.begin(async (tx) => {
    const expiredRows = await tx`
      with moved as (
        update halleus_private.telegram_content_queue
        set status = 'skipped',
            retry_after = null,
            last_error = '[expired_window] stale pre-dispatch claim exceeded automatic send freshness; not backfilled',
            updated_at = now()
        where status = 'publishing'
          and last_attempt_at < ${staleCutoff}::timestamptz
          and dispatch_started_at is null
          and scheduled_for <= ${automaticExpiryCutoff}::timestamptz
          and telegram_message_id is null
        returning id, attempt_count
      ),
      events as (
        insert into halleus_private.telegram_queue_events (
          queue_id, event_type, status_before, status_after,
          reason, attempt_count
        )
        select
          id,
          'expired_without_backfill',
          'publishing',
          'skipped',
          'Automatic send freshness expired before external dispatch; message intentionally not backfilled.',
          attempt_count
        from moved
        returning queue_id
      )
      select count(*)::int as expired_count
      from events
    `;

    const recovered = await tx`
      update halleus_private.telegram_content_queue
      set status = 'ready',
          attempt_count = greatest(attempt_count - 1, 0),
          retry_after = ${now.toISOString()}::timestamptz,
          last_error = '[recovered_pre_dispatch] stale claim recovered before external dispatch',
          updated_at = now()
      where status = 'publishing'
        and last_attempt_at < ${staleCutoff}::timestamptz
        and dispatch_started_at is null
        and scheduled_for > ${automaticExpiryCutoff}::timestamptz
        and telegram_message_id is null
      returning id
    `;

    const uncertain = await tx`
      update halleus_private.telegram_content_queue
      set status = 'failed',
          retry_after = null,
          last_error = '[delivery_uncertain] stale publishing item had already started external dispatch; automatic retry blocked',
          updated_at = now()
      where status = 'publishing'
        and last_attempt_at < ${staleCutoff}::timestamptz
        and dispatch_started_at is not null
      returning id
    `;

    return {
      expiredBeforeDispatch: asNumber(
        asRecord(expiredRows[0]).expired_count,
      ),
      recoveredBeforeDispatch: recovered.length,
      quarantinedUncertain: uncertain.length,
    };
  });
}

// HALLEUS_TELEGRAM_AUTO_PAUSE_RECOVERY_R3
export const TELEGRAM_AUTO_PAUSE_RECOVERY_COOLDOWN_MS = 5 * 60_000;

export type TelegramAutoPauseRecoveryResult = {
  eligible: boolean;
  bridgeHealthy: boolean | null;
  resumed: boolean;
  expiredSkipped: number;
  reason:
    | "not_paused"
    | "manual_pause"
    | "cooldown"
    | "missing_circuit_event"
    | "bridge_unhealthy"
    | "state_changed"
    | "resumed";
};

export async function recoverTelegramAutoPausedPublisher(input: {
  checkBridge: () => Promise<boolean>;
  now?: Date;
}): Promise<TelegramAutoPauseRecoveryResult> {
  const now = input.now ?? new Date();
  const cooldownCutoff = new Date(
    now.getTime() - TELEGRAM_AUTO_PAUSE_RECOVERY_COOLDOWN_MS,
  ).toISOString();
  const automaticExpiryCutoff = new Date(
    now.getTime() - TELEGRAM_AUTOMATIC_SEND_MAX_LATE_MS,
  ).toISOString();
  const sql = getAdminDatabase();

  const controlRows = await sql`
    select global_paused, updated_by::text, updated_at::text
    from halleus_private.telegram_publish_control
    where singleton = true
    limit 1
  `;
  if (!controlRows[0]) {
    throw new Error("Telegram publish control row is missing.");
  }

  const control = asRecord(controlRows[0]);
  if (control.global_paused !== true) {
    return {
      eligible: false,
      bridgeHealthy: null,
      resumed: false,
      expiredSkipped: 0,
      reason: "not_paused",
    };
  }
  if (asNullableString(control.updated_by)) {
    return {
      eligible: false,
      bridgeHealthy: null,
      resumed: false,
      expiredSkipped: 0,
      reason: "manual_pause",
    };
  }

  const controlUpdatedAt = new Date(asString(control.updated_at)).toISOString();
  if (Date.parse(controlUpdatedAt) > Date.parse(cooldownCutoff)) {
    return {
      eligible: false,
      bridgeHealthy: null,
      resumed: false,
      expiredSkipped: 0,
      reason: "cooldown",
    };
  }

  const causalRows = await sql`
    select queue_id::text
    from halleus_private.telegram_queue_events
    where event_type = 'auto_pause_delivery_uncertain'
      and created_at >= ${
        new Date(Date.parse(controlUpdatedAt) - 15_000).toISOString()
      }::timestamptz
      and created_at <= ${
        new Date(Date.parse(controlUpdatedAt) + 30_000).toISOString()
      }::timestamptz
    order by created_at asc
    limit 1
  `;
  if (!causalRows[0]) {
    return {
      eligible: false,
      bridgeHealthy: null,
      resumed: false,
      expiredSkipped: 0,
      reason: "missing_circuit_event",
    };
  }
  const causalQueueId = asString(causalRows[0].queue_id);

  let bridgeHealthy = false;
  try {
    bridgeHealthy = await input.checkBridge();
  } catch {
    bridgeHealthy = false;
  }
  if (!bridgeHealthy) {
    return {
      eligible: true,
      bridgeHealthy: false,
      resumed: false,
      expiredSkipped: 0,
      reason: "bridge_unhealthy",
    };
  }

  return sql.begin(async (tx) => {
    const lockedRows = await tx`
      select global_paused, updated_by::text, updated_at::text
      from halleus_private.telegram_publish_control
      where singleton = true
      for update
      limit 1
    `;
    if (!lockedRows[0]) {
      throw new Error("Telegram publish control row is missing.");
    }

    const locked = asRecord(lockedRows[0]);
    const lockedUpdatedAt = new Date(asString(locked.updated_at)).toISOString();
    if (
      locked.global_paused !== true ||
      asNullableString(locked.updated_by) ||
      lockedUpdatedAt !== controlUpdatedAt
    ) {
      return {
        eligible: true,
        bridgeHealthy: true,
        resumed: false,
        expiredSkipped: 0,
        reason: "state_changed" as const,
      };
    }

    const updatedRows = await tx`
      update halleus_private.telegram_publish_control
      set global_paused = false,
          updated_by = null,
          updated_at = now()
      where singleton = true
        and global_paused = true
        and updated_by is null
        and updated_at = ${controlUpdatedAt}::timestamptz
      returning global_paused
    `;
    if (!updatedRows[0]) {
      return {
        eligible: true,
        bridgeHealthy: true,
        resumed: false,
        expiredSkipped: 0,
        reason: "state_changed" as const,
      };
    }

    const skippedRows = await tx`
      with moved as (
        update halleus_private.telegram_content_queue
        set status = 'skipped',
            retry_after = null,
            last_error = '[pause_resume_skip] expired while automatic publishing was paused; not backfilled',
            updated_at = now()
        where status = 'ready'
          and telegram_message_id is null
          and (
            scheduled_for <= ${automaticExpiryCutoff}::timestamptz
            or (scheduled_for at time zone 'Asia/Tehran')::date <
              (now() at time zone 'Asia/Tehran')::date
          )
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
          'Expired while automatic circuit-breaker pause was active; not backfilled.',
          attempt_count
        from moved
        returning queue_id
      )
      select count(*)::int as skipped_count
      from events
    `;
    const expiredSkipped = asNumber(asRecord(skippedRows[0]).skipped_count);

    await tx`
      insert into halleus_private.telegram_queue_events (
        queue_id, event_type, status_before, status_after,
        reason, attempt_count
      )
      select
        id,
        'auto_resume_delivery_uncertain',
        'failed',
        'failed',
        'Automatic circuit-breaker pause recovered after cooldown and healthy authenticated bridge transport probe.',
        attempt_count
      from halleus_private.telegram_content_queue
      where id = ${causalQueueId}::uuid
      limit 1
    `;

    return {
      eligible: true,
      bridgeHealthy: true,
      resumed: true,
      expiredSkipped,
      reason: "resumed" as const,
    };
  });
}

// HALLEUS_TELEGRAM_PHASE2_R2_CANONICAL_CLAIM
export async function claimDueTelegramQueueItem() {
  const automaticExpiryCutoff = new Date(
    Date.now() - TELEGRAM_AUTOMATIC_SEND_MAX_LATE_MS,
  ).toISOString();
  const sql = getAdminDatabase();

  return sql.begin(async (tx) => {
    await tx`
      with moved as (
        update halleus_private.telegram_content_queue
        set status = 'skipped',
            retry_after = null,
            last_error = '[expired_window] automatic publisher skipped stale ready item; not backfilled',
            updated_at = now()
        where status = 'ready'
          and scheduled_for <= ${automaticExpiryCutoff}::timestamptz
          and telegram_message_id is null
        returning id, attempt_count
      ),
      events as (
        insert into halleus_private.telegram_queue_events (
          queue_id, event_type, status_before, status_after,
          reason, attempt_count
        )
        select
          id,
          'expired_without_backfill',
          'ready',
          'skipped',
          'Automatic send freshness expired; message intentionally not backfilled.',
          attempt_count
        from moved
        returning queue_id
      )
      select count(*)::int as expired_count
      from events
    `;

    const rows = await tx`
      select queue.id::text
      from halleus_private.telegram_content_queue as queue
      where queue.status = 'ready'
        and queue.scheduled_for <= now()
        and queue.scheduled_for > ${automaticExpiryCutoff}::timestamptz
        and queue.telegram_message_id is null
        and (retry_after is null or retry_after <= now())
        and queue.attempt_count < ${TELEGRAM_PUBLISH_MAX_ATTEMPTS}
        and not exists (
          select 1
          from halleus_private.telegram_publish_control as control
          where control.singleton = true and control.global_paused = true
        )
        and not exists (
          select 1
          from halleus_private.telegram_paused_days as paused
          where paused.local_date =
            (queue.scheduled_for at time zone 'Asia/Tehran')::date
        )
      order by queue.scheduled_for, queue.created_at
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
        and scheduled_for > ${automaticExpiryCutoff}::timestamptz
        and telegram_message_id is null
        and attempt_count < ${TELEGRAM_PUBLISH_MAX_ATTEMPTS}
      returning id::text, content_key, content_class, content_type,
                rendered_payload, scheduled_for, status, attempt_count,
                telegram_message_id::text
    `;

    return claimed[0] ? readQueueItem(claimed[0]) : null;
  });
}

export async function claimTelegramQueueItemNow(input: {
  id: string;
  expectedUpdatedAt: string;
}) {
  const sql = getAdminDatabase();
  return sql.begin(async (tx) => {
    const rows = await tx`
      select
        queue.id::text,
        queue.status,
        queue.attempt_count,
        queue.updated_at::text,
        queue.retry_after::text,
        queue.telegram_message_id::text,
        queue.scheduled_for::text,
        exists (
          select 1
          from halleus_private.telegram_publish_control as control
          where control.singleton = true and control.global_paused = true
        ) as global_paused,
        exists (
          select 1
          from halleus_private.telegram_paused_days as paused
          where paused.local_date =
            (queue.scheduled_for at time zone 'Asia/Tehran')::date
        ) as day_paused
      from halleus_private.telegram_content_queue as queue
      where queue.id = ${input.id}::uuid
      for update
      limit 1
    `;
    if (!rows[0]) {
      throw new TelegramQueueOperationError(404, "پیام تلگرام پیدا نشد.");
    }

    const row = asRecord(rows[0]);
    const status = asString(row.status);
    const updatedAt = new Date(asString(row.updated_at)).toISOString();
    const expectedUpdatedAt = new Date(input.expectedUpdatedAt).toISOString();
    const attemptCount = asNumber(row.attempt_count);
    const retryAfter = asNullableString(row.retry_after);

    if (updatedAt !== expectedUpdatedAt) {
      throw new TelegramQueueOperationError(
        409,
        "این پیام بعد از بازشدن جزئیات تغییر کرده؛ اول تازه‌سازی کن.",
      );
    }
    if (status !== "ready") {
      throw new TelegramQueueOperationError(
        409,
        "Send Now فقط برای پیام آماده‌ای که هنوز ارسال نشده مجاز است.",
      );
    }
    if (asNullableString(row.telegram_message_id)) {
      throw new TelegramQueueOperationError(409, "این پیام قبلاً شناسهٔ ارسال تلگرام گرفته است.");
    }
    if (row.global_paused === true || row.day_paused === true) {
      throw new TelegramQueueOperationError(
        409,
        "انتشار برای این پیام در حالت Pause است؛ اول Pause را آگاهانه بردار.",
      );
    }
    if (retryAfter && attemptCount > 0 && Date.parse(retryAfter) > Date.now()) {
      throw new TelegramQueueOperationError(
        409,
        "این پیام در backoff امن است؛ Send Now نباید زمان retry ایمن را دور بزند.",
      );
    }
    if (attemptCount >= TELEGRAM_PUBLISH_MAX_ATTEMPTS) {
      throw new TelegramQueueOperationError(409, "بودجهٔ تلاش انتشار این پیام تمام شده است.");
    }

    const claimed = await tx`
      update halleus_private.telegram_content_queue
      set status = 'publishing',
          attempt_count = attempt_count + 1,
          last_attempt_at = now(),
          dispatch_started_at = null,
          retry_after = null,
          updated_at = now(),
          last_error = null
      where id = ${input.id}::uuid
        and status = 'ready'
        and updated_at = ${input.expectedUpdatedAt}::timestamptz
        and attempt_count < ${TELEGRAM_PUBLISH_MAX_ATTEMPTS}
      returning id::text, content_key, content_class, content_type,
                rendered_payload, scheduled_for, status, attempt_count,
                telegram_message_id::text
    `;
    if (!claimed[0]) {
      throw new TelegramQueueOperationError(
        409,
        "وضعیت پیام هم‌زمان تغییر کرد؛ اول تازه‌سازی کن.",
      );
    }

    await tx`
      insert into halleus_private.telegram_queue_events (
        queue_id, event_type, status_before, status_after, reason, attempt_count
      )
      values (
        ${input.id}::uuid,
        'send_now_claimed',
        'ready',
        'publishing',
        'Explicit Send Now accepted; canonical delivery lifecycle owns the send.',
        ${attemptCount + 1}
      )
    `;

    return readQueueItem(claimed[0]);
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
    returning id::text, attempt_count
  `;
  if (!rows[0]) {
    throw new Error("Telegram queue item could not be marked published.");
  }
  await recordTelegramQueueEventBestEffort({
    queueId: id,
    eventType: "published",
    statusBefore: "publishing",
    statusAfter: "published",
    attemptCount: asNumber(rows[0].attempt_count),
    telegramMessageId,
  });
}

// HALLEUS_TELEGRAM_UNCERTAIN_CIRCUIT_BREAKER_R2
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
  const retryAfter =
    delayMs === null ? null : new Date(Date.now() + delayMs).toISOString();
  const tag = telegramFailureTag(input.failure);
  const message = `[${tag}] ${input.failure.message}`.slice(0, 1200);

  const persisted = await sql.begin(async (tx) => {
    const rows = await tx`
      update halleus_private.telegram_content_queue
      set status = ${retry ? "ready" : "failed"},
          retry_after = ${retryAfter}::timestamptz,
          dispatch_started_at =
            case when ${retry} then null else dispatch_started_at end,
          last_error = ${message},
          updated_at = now()
      where id = ${input.id}::uuid
        and status = 'publishing'
      returning id::text
    `;

    if (!rows[0]) {
      throw new Error(
        "Telegram queue failure outcome could not be persisted.",
      );
    }

    let autoPaused = false;
    if (input.failure.deliveryUncertain) {
      const changedControl = await tx`
        update halleus_private.telegram_publish_control
        set global_paused = true,
            updated_by = null,
            updated_at = now()
        where singleton = true
          and global_paused = false
        returning global_paused
      `;

      if (changedControl[0]) {
        autoPaused = changedControl[0].global_paused === true;
      } else {
        const currentControl = await tx`
          select global_paused
          from halleus_private.telegram_publish_control
          where singleton = true
          limit 1
        `;
        autoPaused = currentControl[0]?.global_paused === true;
      }

      if (!autoPaused) {
        throw new Error(
          "Delivery-uncertain failure could not arm the Telegram global pause circuit breaker.",
        );
      }
    }

    return { autoPaused };
  });

  await recordTelegramQueueEventBestEffort({
    queueId: input.id,
    eventType: retry
      ? "retry_scheduled"
      : input.failure.deliveryUncertain
        ? "delivery_uncertain"
        : "failed",
    statusBefore: "publishing",
    statusAfter: retry ? "ready" : "failed",
    reason: message,
    attemptCount: input.attemptCount,
  });

  if (input.failure.deliveryUncertain && persisted.autoPaused) {
    await recordTelegramQueueEventBestEffort({
      queueId: input.id,
      eventType: "auto_pause_delivery_uncertain",
      statusBefore: "failed",
      statusAfter: "failed",
      reason:
        "Global Telegram publishing paused automatically after uncertain external delivery.",
      attemptCount: input.attemptCount,
    });
  }

  return {
    retried: retry,
    terminal: !retry,
    deliveryUncertain: input.failure.deliveryUncertain,
    autoPaused: persisted.autoPaused,
    retryAfter,
  };
}

export class TelegramQueueOperationError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "TelegramQueueOperationError";
    this.status = status;
  }
}

async function recordTelegramQueueEventBestEffort(input: {
  queueId: string;
  eventType: string;
  statusBefore: string | null;
  statusAfter: string | null;
  reason?: string | null;
  attemptCount?: number | null;
  telegramMessageId?: number | null;
}) {
  try {
    const sql = getAdminDatabase();
    await sql`
      insert into halleus_private.telegram_queue_events (
        queue_id, event_type, status_before, status_after,
        reason, attempt_count, telegram_message_id
      )
      values (
        ${input.queueId}::uuid,
        ${input.eventType},
        ${input.statusBefore},
        ${input.statusAfter},
        ${input.reason ?? null},
        ${input.attemptCount ?? null},
        ${input.telegramMessageId ?? null}
      )
    `;
  } catch {
    // Observability must never become a second publishing gate.
  }
}
