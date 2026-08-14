import {
  AdminAccessError,
  assertAdminMutationRequest,
  requireAdminCapability,
} from "@/lib/admin/admin-auth";
import { adminErrorResponse, noStoreJsonResponse } from "@/lib/admin/admin-http";
import { recordAdminAuditEvent } from "@/lib/admin/admin-service";
import {
  cancelTelegramAdminFutureDays,
  cancelTelegramAdminQueueItem,
  clearTelegramAdminFutureQueue,
  editTelegramAdminQueueItem,
  getTelegramAdminControlSnapshot,
  pauseTelegramAdminDay,
  rescheduleTelegramAdminQueueItem,
  resumeTelegramAdminDay,
  retryTelegramAdminQueueItem,
  setTelegramAdminGlobalPause,
  TelegramAdminMutationError,
} from "@/lib/telegram/telegram-admin-service";
import { TelegramQueueOperationError } from "@/lib/telegram/telegram-queue";
import { processTelegramQueueItemNow } from "@/lib/telegram/telegram-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OperationBody = {
  action?: unknown;
  queueId?: unknown;
  expectedUpdatedAt?: unknown;
  text?: unknown;
  cta?: unknown;
  scheduledLocal?: unknown;
  localDate?: unknown;
  localDates?: unknown;
  reason?: unknown;
  controlUpdatedAt?: unknown;
  confirm?: unknown;
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readQueueId(value: unknown) {
  const id = stringValue(value);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new AdminAccessError(400, "شناسهٔ پیام تلگرام معتبر نیست.");
  }
  return id;
}

function readLocalDates(value: unknown) {
  if (!Array.isArray(value)) {
    throw new AdminAccessError(400, "روزهای انتخاب‌شده معتبر نیستند.");
  }
  const localDates = [
    ...new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item)),
    ),
  ];
  if (localDates.length === 0 || localDates.length > 31) {
    throw new AdminAccessError(400, "بین ۱ تا ۳۱ روز معتبر انتخاب کن.");
  }
  return localDates;
}

function normalizeOperationError(error: unknown) {
  if (
    error instanceof TelegramAdminMutationError ||
    error instanceof TelegramQueueOperationError
  ) {
    return new AdminAccessError(error.status, error.message);
  }
  return error;
}

function auditAction(action: string) {
  const map: Record<string, string> = {
    edit: "admin.telegram.queue_edited",
    reschedule: "admin.telegram.queue_rescheduled",
    cancel: "admin.telegram.queue_cancelled",
    retry: "admin.telegram.queue_retry_requested",
    pause_global: "admin.telegram.global_paused",
    resume_global: "admin.telegram.global_resumed",
    pause_day: "admin.telegram.day_paused",
    resume_day: "admin.telegram.day_resumed",
    send_now: "admin.telegram.send_now",
    clear_future: "admin.telegram.future_queue_cleared",
    cancel_days: "admin.telegram.future_days_cancelled",
  };
  return map[action] ?? `admin.telegram.${action}`;
}

export async function GET(request: Request) {
  try {
    await requireAdminCapability(request, "telegram.read");
    const snapshot = await getTelegramAdminControlSnapshot();
    return noStoreJsonResponse({ ok: true, snapshot });
  } catch (error) {
    return adminErrorResponse(error, "وضعیت کنترل تلگرام دریافت نشد.");
  }
}

export async function POST(request: Request) {
  let actor: Awaited<ReturnType<typeof requireAdminCapability>> | null = null;
  let action = "unknown";
  let targetId: string | null = null;

  try {
    assertAdminMutationRequest(request);
    actor = await requireAdminCapability(request, "telegram.operations.write");
    const body = (await request.json().catch(() => ({}))) as OperationBody;
    action = stringValue(body.action);
    const reason =
      stringValue(body.reason).slice(0, 240) || "عملیات دستی از پنل تلگرام";

    let result: unknown;

    if (action === "edit") {
      targetId = readQueueId(body.queueId);
      result = await editTelegramAdminQueueItem({
        id: targetId,
        expectedUpdatedAt: stringValue(body.expectedUpdatedAt),
        text: typeof body.text === "string" ? body.text : "",
        cta: body.cta,
      });
    } else if (action === "reschedule") {
      targetId = readQueueId(body.queueId);
      result = await rescheduleTelegramAdminQueueItem({
        id: targetId,
        expectedUpdatedAt: stringValue(body.expectedUpdatedAt),
        scheduledLocal: stringValue(body.scheduledLocal),
      });
    } else if (action === "cancel") {
      targetId = readQueueId(body.queueId);
      result = await cancelTelegramAdminQueueItem({
        id: targetId,
        expectedUpdatedAt: stringValue(body.expectedUpdatedAt),
        reason,
      });
    } else if (action === "retry") {
      targetId = readQueueId(body.queueId);
      result = await retryTelegramAdminQueueItem({
        id: targetId,
        expectedUpdatedAt: stringValue(body.expectedUpdatedAt),
      });
    } else if (action === "pause_global" || action === "resume_global") {
      result = await setTelegramAdminGlobalPause({
        paused: action === "pause_global",
        expectedUpdatedAt: stringValue(body.controlUpdatedAt),
        actorUserId: actor.userId,
        reason,
      });
    } else if (action === "pause_day") {
      targetId = stringValue(body.localDate);
      result = await pauseTelegramAdminDay({
        localDate: targetId,
        actorUserId: actor.userId,
        reason,
      });
    } else if (action === "resume_day") {
      targetId = stringValue(body.localDate);
      result = await resumeTelegramAdminDay({
        localDate: targetId,
        reason,
      });
    } else if (action === "send_now") {
      targetId = readQueueId(body.queueId);
      if (body.confirm !== "SEND_NOW") {
        throw new AdminAccessError(409, "ارسال فوری باید صریحاً تأیید شود.");
      }
      result = await processTelegramQueueItemNow({
        id: targetId,
        expectedUpdatedAt: stringValue(body.expectedUpdatedAt),
      });
    } else if (action === "clear_future") {
      if (body.confirm !== "CLEAR_FUTURE_QUEUE") {
        throw new AdminAccessError(
          409,
          "پاک‌کردن صف آینده باید با شمارش و تأیید صریح انجام شود.",
        );
      }
      result = await clearTelegramAdminFutureQueue({
        actorUserId: actor.userId,
        reason,
      });
    } else if (action === "cancel_days") {
      if (body.confirm !== "CANCEL_SELECTED_DAYS") {
        throw new AdminAccessError(
          409,
          "لغو گروهی روزها باید با شمارش و تأیید صریح انجام شود.",
        );
      }
      const localDates = readLocalDates(body.localDates);
      targetId = localDates.join(",");
      result = await cancelTelegramAdminFutureDays({
        localDates,
        actorUserId: actor.userId,
        reason,
      });
    } else {
      throw new AdminAccessError(400, "عملیات تلگرام شناخته‌شده نیست.");
    }

    await recordAdminAuditEvent({
      actor,
      action: auditAction(action),
      targetType:
        action === "clear_future"
          ? "telegram_future_queue"
          : action === "cancel_days"
            ? "telegram_future_days"
            : action.includes("global")
            ? "telegram_publish_control"
            : action.includes("day")
              ? "telegram_paused_day"
              : "telegram_queue_item",
      targetId,
      afterSummary: {
        action,
        result:
          result && typeof result === "object"
            ? (result as Record<string, unknown>)
            : { completed: true },
      },
      reason,
      success: true,
    });

    return noStoreJsonResponse({ ok: true, action, result });
  } catch (error) {
    const normalized = normalizeOperationError(error);
    if (actor) {
      try {
        await recordAdminAuditEvent({
          actor,
          action: `${auditAction(action)}.failed`,
          targetType: targetId ? "telegram_queue_item" : "telegram_operation",
          targetId,
          afterSummary: {
            error:
              normalized instanceof Error
                ? normalized.message.slice(0, 360)
                : "Unknown Telegram admin operation failure.",
          },
          reason: "Telegram admin operation failed.",
          success: false,
        });
      } catch {
        // Preserve the primary operation failure.
      }
    }
    return adminErrorResponse(normalized, "عملیات تلگرام انجام نشد.");
  }
}
