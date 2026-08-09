import { getHalleusRuntimeEnv } from "@/lib/config/env";
import { deliverSkyPublicSnapshot } from "@/lib/sky-public/sky-public-delivery";
import type { SkyDailySnapshot } from "@/lib/sky-daily/sky-daily-contract";
import { createTelegramMvpContentPlan } from "@/lib/telegram/telegram-content";
import {
  claimDueTelegramQueueItem,
  enqueueTelegramContent,
  markTelegramQueueDeliveryFailure,
  markTelegramQueueDispatchStarted,
  markTelegramQueuePublished,
  recoverStaleTelegramQueueItems,
  type TelegramQueueInitialStatus,
} from "@/lib/telegram/telegram-queue";
import {
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

export async function processDueTelegramQueue(limit = 10) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 10);
  const recovery = await recoverStaleTelegramQueueItems();
  const published: Array<{ id: string; messageId: number }> = [];
  const retryScheduled: Array<{ id: string; retryAfter: string | null }> = [];
  const terminalFailed: string[] = [];
  const deliveryUncertain: string[] = [];
  const finalizationPending: Array<{ id: string; messageId: number }> = [];

  for (let index = 0; index < safeLimit; index += 1) {
    const item = await claimDueTelegramQueueItem();
    if (!item) break;

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
      if (outcome.retried) {
        retryScheduled.push({ id: item.id, retryAfter: outcome.retryAfter });
      } else {
        terminalFailed.push(item.id);
      }
      continue;
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
        retryScheduled.push({ id: item.id, retryAfter: outcome.retryAfter });
      } else if (outcome.deliveryUncertain) {
        deliveryUncertain.push(item.id);
      } else {
        terminalFailed.push(item.id);
      }
      continue;
    }

    try {
      await finalizePublishedWithRetry(item.id, result.messageId);
      published.push({ id: item.id, messageId: result.messageId });
    } catch {
      // The external send succeeded and returned a Telegram message id.
      // Never send again automatically; stale recovery will quarantine this row
      // if database finalization cannot be completed in this request.
      finalizationPending.push({ id: item.id, messageId: result.messageId });
    }
  }

  return {
    published,
    retryScheduled,
    terminalFailed,
    deliveryUncertain,
    finalizationPending,
    recovery,
  };
}