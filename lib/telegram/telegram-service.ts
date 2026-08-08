import { getHalleusRuntimeEnv } from "@/lib/config/env";
import { deliverSkyPublicSnapshot } from "@/lib/sky-public/sky-public-delivery";
import type { SkyDailySnapshot } from "@/lib/sky-daily/sky-daily-contract";
import { createTelegramMvpContentPlan } from "@/lib/telegram/telegram-content";
import {
  claimDueTelegramQueueItem,
  enqueueTelegramContent,
  markTelegramQueueFailed,
  markTelegramQueuePublished,
  type TelegramQueueInitialStatus,
} from "@/lib/telegram/telegram-queue";
import { publishTelegramPayload } from "@/lib/telegram/telegram-publisher";

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

export async function processDueTelegramQueue(limit = 3) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 5);
  const published: Array<{ id: string; messageId: number }> = [];
  const failed: string[] = [];

  for (let index = 0; index < safeLimit; index += 1) {
    const item = await claimDueTelegramQueueItem();
    if (!item) break;
    try {
      const result = await publishTelegramPayload({
        queueId: item.id,
        payload: item.payload,
      });
      await markTelegramQueuePublished(item.id, result.messageId);
      published.push({ id: item.id, messageId: result.messageId });
    } catch (error) {
      failed.push(item.id);
      await markTelegramQueueFailed(item.id, error);
    }
  }

  return { published, failed };
}