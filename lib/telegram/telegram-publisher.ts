import { getHalleusRuntimeEnv } from "@/lib/config/env";
import type { TelegramRenderedPayload } from "@/lib/telegram/telegram-content";
import type { TelegramMemberStatus } from "@/lib/telegram/telegram-reward-contract";
import type { TelegramDeliveryFailure } from "@/lib/telegram/telegram-publishing-hardening";

export type TelegramBridgeSendResult = {
  messageId: number;
};

class TelegramPublishError extends Error {
  readonly retryableSafe: boolean;
  readonly deliveryUncertain: boolean;

  constructor(message: string, input: { retryableSafe: boolean; deliveryUncertain: boolean }) {
    super(message);
    this.name = "TelegramPublishError";
    this.retryableSafe = input.retryableSafe;
    this.deliveryUncertain = input.deliveryUncertain;
  }
}

function bridgeEndpoint(baseUrl: string, path: string) {
  return new URL(path, baseUrl).toString();
}

function bridgeConfig() {
  const env = getHalleusRuntimeEnv();
  if (!env.telegramBridgeUrl || !env.telegramBridgeSecret) {
    throw new TelegramPublishError("Telegram bridge configuration is incomplete.", {
      retryableSafe: false,
      deliveryUncertain: false,
    });
  }
  return { baseUrl: env.telegramBridgeUrl, secret: env.telegramBridgeSecret };
}

export function readTelegramPublishFailure(error: unknown): TelegramDeliveryFailure {
  if (error instanceof TelegramPublishError) {
    return {
      message: error.message.slice(0, 1000),
      retryableSafe: error.retryableSafe,
      deliveryUncertain: error.deliveryUncertain,
    };
  }
  return {
    message: error instanceof Error ? error.message.slice(0, 1000) : "Unknown Telegram publish failure",
    retryableSafe: false,
    deliveryUncertain: true,
  };
}

export async function publishTelegramPayload(input: {
  queueId: string;
  payload: TelegramRenderedPayload;
}): Promise<TelegramBridgeSendResult> {
  const bridge = bridgeConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    let response: Response;
    try {
      response = await fetch(bridgeEndpoint(bridge.baseUrl, "/telegram/send-message"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-halleus-bridge-secret": bridge.secret,
        },
        body: JSON.stringify({
          clientRequestId: input.queueId,
          text: input.payload.text,
          parseMode: input.payload.parseMode,
          disableWebPagePreview: input.payload.disableWebPagePreview,
        }),
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (error) {
      throw new TelegramPublishError(
        error instanceof Error && error.name === "AbortError"
          ? "Telegram bridge request timed out after dispatch started."
          : "Telegram bridge transport failed after dispatch started.",
        { retryableSafe: false, deliveryUncertain: true },
      );
    }

    const body = (await response.json().catch(() => null)) as
      | {
          ok?: boolean;
          messageId?: unknown;
          error?: string;
          retryableSafe?: unknown;
          deliveryUncertain?: unknown;
        }
      | null;
    if (!response.ok || body?.ok !== true || typeof body.messageId !== "number" || !Number.isInteger(body.messageId)) {
      const safeError = typeof body?.error === "string" ? body.error.slice(0, 240) : `HTTP ${response.status}`;
      const deliveryUncertain =
        body?.deliveryUncertain === true ||
        (body === null && response.status >= 500);
      throw new TelegramPublishError(`Telegram bridge send failed: ${safeError}`, {
        retryableSafe:
          !deliveryUncertain &&
          (body?.retryableSafe === true || response.status === 503),
        deliveryUncertain,
      });
    }
    return { messageId: Number(body.messageId) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkTelegramChannelMembership(telegramUserId: string): Promise<{
  isMember: boolean;
  status: TelegramMemberStatus;
}> {
  const bridge = bridgeConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(bridgeEndpoint(bridge.baseUrl, "/telegram/check-member"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-halleus-bridge-secret": bridge.secret,
      },
      body: JSON.stringify({ telegramUserId }),
      cache: "no-store",
      signal: controller.signal,
    });
    const body = (await response.json().catch(() => null)) as
      | { ok?: boolean; isMember?: unknown; status?: unknown; error?: string }
      | null;
    if (!response.ok || body?.ok !== true || typeof body.isMember !== "boolean") {
      const safeError = typeof body?.error === "string" ? body.error.slice(0, 240) : `HTTP ${response.status}`;
      throw new Error(`Telegram membership check failed: ${safeError}`);
    }
    const allowed: TelegramMemberStatus[] = [
      "creator",
      "administrator",
      "member",
      "restricted",
      "left",
      "kicked",
      "unknown",
    ];
    const status = typeof body.status === "string" && allowed.includes(body.status as TelegramMemberStatus)
      ? body.status as TelegramMemberStatus
      : "unknown";
    return { isMember: body.isMember, status };
  } finally {
    clearTimeout(timeout);
  }
}