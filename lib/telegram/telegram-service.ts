import { getHalleusRuntimeEnv } from "@/lib/config/env";
import { deliverSkyPublicSnapshot } from "@/lib/sky-public/sky-public-delivery";
import type { SkyDailySnapshot } from "@/lib/sky-daily/sky-daily-contract";
import { createTelegramMvpContentPlan } from "@/lib/telegram/telegram-content";
import {
  claimDueTelegramQueueItem,
  claimTelegramQueueItemNow,
  enqueueTelegramContent,
  markTelegramQueueDeliveryFailure,
  markTelegramQueueDispatchStarted,
  markTelegramQueuePublished,
  recoverStaleTelegramQueueItems,
  recoverTelegramAutoPausedPublisher,
  type TelegramQueueInitialStatus,
} from "@/lib/telegram/telegram-queue";
import {
  probeTelegramBridgeTransport,
  publishTelegramPayload,
  readTelegramPublishFailure,
} from "@/lib/telegram/telegram-publisher";

function tehranLocalDate(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export async function generateTelegramMvpQueue(input: {
  initialStatus: TelegramQueueInitialStatus;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const env = getHalleusRuntimeEnv();
  let snapshot: SkyDailySnapshot | null = null;
  let localDate = tehranLocalDate(now);
  try {
    const delivery = await deliverSkyPublicSnapshot({ now });
    if (delivery.status === "ready") {
      snapshot = delivery.snapshot;
      localDate = delivery.requestedDate;
    }
  } catch {
    snapshot = null;
  }

  const plan = createTelegramMvpContentPlan({
    snapshot,
    siteUrl: env.siteUrl,
    localDate,
    now,
  });
  const queued = await enqueueTelegramContent(plan, input.initialStatus);
  return {
    engineBackedGenerated: plan.some((item) => item.contentClass === "engine_backed"),
    fallbackUsed: !plan.some((item) => item.contentClass === "engine_backed"),
    queued,
  };
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function finalizePublishedWithRetry(id: string, messageId: number) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await markTelegramQueuePublished(id, messageId);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await wait(attempt * 150);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Telegram published-message finalization failed.");
}

// HALLEUS_TELEGRAM_PHASE2_R2_SHARED_DELIVERY
async function processClaimedTelegramQueueItem(
  item: NonNullable<Awaited<ReturnType<typeof claimDueTelegramQueueItem>>>,
) {
  try {
    await markTelegramQueueDispatchStarted(item.id);
  } catch (error) {
    const outcome = await markTelegramQueueDeliveryFailure({
      id: item.id,
      attemptCount: item.attemptCount,
      failure: {
        message: error instanceof Error ? error.message : "Dispatch phase could not start.",
        retryableSafe: true,
        deliveryUncertain: false,
      },
    });
    return outcome.retried
      ? { kind: "retry_scheduled" as const, id: item.id, retryAfter: outcome.retryAfter }
      : { kind: "terminal_failed" as const, id: item.id };
  }

  let result;
  try {
    result = await publishTelegramPayload({
      queueId: item.id,
      payload: item.payload,
    });
  } catch (error) {
    const failure = readTelegramPublishFailure(error);
    const outcome = await markTelegramQueueDeliveryFailure({
      id: item.id,
      attemptCount: item.attemptCount,
      failure,
    });
    if (outcome.retried) {
      return { kind: "retry_scheduled" as const, id: item.id, retryAfter: outcome.retryAfter };
    }
    if (outcome.deliveryUncertain) {
      return {
        kind: "delivery_uncertain" as const,
        id: item.id,
        autoPaused: outcome.autoPaused,
      };
    }
    return { kind: "terminal_failed" as const, id: item.id };
  }

  try {
    await finalizePublishedWithRetry(item.id, result.messageId);
    return { kind: "published" as const, id: item.id, messageId: result.messageId };
  } catch {
    return {
      kind: "finalization_pending" as const,
      id: item.id,
      messageId: result.messageId,
    };
  }
}

export async function processDueTelegramQueue(limit = 10) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 10);
  const recovery = await recoverStaleTelegramQueueItems();
  const autoPauseRecovery = await recoverTelegramAutoPausedPublisher({
    checkBridge: probeTelegramBridgeTransport,
  });
  const published: Array<{ id: string; messageId: number }> = [];
  const retryScheduled: Array<{ id: string; retryAfter: string | null }> = [];
  const terminalFailed: string[] = [];
  const deliveryUncertain: string[] = [];
  const finalizationPending: Array<{ id: string; messageId: number }> = [];

  for (let index = 0; index < safeLimit; index += 1) {
    const item = await claimDueTelegramQueueItem();
    if (!item) break;
    const outcome = await processClaimedTelegramQueueItem(item);
    if (outcome.kind === "published") {
      published.push({ id: outcome.id, messageId: outcome.messageId });
    } else if (outcome.kind === "retry_scheduled") {
      retryScheduled.push({ id: outcome.id, retryAfter: outcome.retryAfter });
    } else if (outcome.kind === "delivery_uncertain") {
      deliveryUncertain.push(outcome.id);

      // HALLEUS_TELEGRAM_UNCERTAIN_BATCH_HALT_R2
      // The queue failure transition atomically arms global pause. Stop this
      // batch too, so one uncertain transport event can never consume the
      // remaining per-run publication budget.
      if (!outcome.autoPaused) {
        throw new Error(
          "Telegram uncertain-delivery circuit breaker did not pause publishing.",
        );
      }
      break;
    } else if (outcome.kind === "terminal_failed") {
      terminalFailed.push(outcome.id);
    } else {
      finalizationPending.push({ id: outcome.id, messageId: outcome.messageId });
    }
  }

  return {
    published,
    retryScheduled,
    terminalFailed,
    deliveryUncertain,
    finalizationPending,
    recovery,
    autoPauseRecovery,
  };
}

export async function processTelegramQueueItemNow(input: {
  id: string;
  expectedUpdatedAt: string;
}) {
  const item = await claimTelegramQueueItemNow(input);
  return processClaimedTelegramQueueItem(item);
}
