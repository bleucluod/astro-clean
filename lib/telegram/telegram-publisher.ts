import { getHalleusRuntimeEnv } from "@/lib/config/env";
import type { TelegramRenderedPayload } from "@/lib/telegram/telegram-content";

export type TelegramBridgeSendResult = {
  messageId: number;
};

function bridgeEndpoint(baseUrl: string) {
  return new URL("/telegram/send-message", baseUrl).toString();
}

export async function publishTelegramPayload(input: {
  queueId: string;
  payload: TelegramRenderedPayload;
}): Promise<TelegramBridgeSendResult> {
  const env = getHalleusRuntimeEnv();
  if (!env.telegramBridgeUrl || !env.telegramBridgeSecret) {
    throw new Error("Telegram bridge configuration is incomplete.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(bridgeEndpoint(env.telegramBridgeUrl), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-halleus-bridge-secret": env.telegramBridgeSecret,
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
    const body = (await response.json().catch(() => null)) as
      | { ok?: boolean; messageId?: unknown; error?: string }
      | null;
    if (
      !response.ok ||
      body?.ok !== true ||
      typeof body.messageId !== "number" ||
      !Number.isInteger(body.messageId)
    ) {
      const safeError = typeof body?.error === "string" ? body.error.slice(0, 240) : `HTTP ${response.status}`;
      throw new Error(`Telegram bridge send failed: ${safeError}`);
    }
    return { messageId: Number(body.messageId) };
  } finally {
    clearTimeout(timeout);
  }
}