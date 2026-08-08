const SEND_PATH = "/telegram/send-message";
const MAX_TEXT_LENGTH = 4096;
const REQUEST_TIMEOUT_MS = 12_000;

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store",
    },
  });
}

function safeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function requireConfig(env) {
  for (const key of [
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_CHANNEL_ID",
    "HALLEUS_BRIDGE_SECRET",
    "HALLEUS_PUBLISHER_SECRET",
    "HALLEUS_PUBLISH_DUE_URL",
  ]) {
    if (typeof env[key] !== "string" || env[key].trim().length === 0) {
      throw new Error(`Missing Worker binding: ${key}`);
    }
  }
}

async function sendMessage(request, env) {
  const supplied = request.headers.get("x-halleus-bridge-secret") ?? "";
  if (!safeEqual(env.HALLEUS_BRIDGE_SECRET, supplied)) {
    return json({ ok: false, error: "Bridge authorization failed." }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON payload." }, 400);
  }
  if (
    !body ||
    typeof body !== "object" ||
    typeof body.clientRequestId !== "string" ||
    body.clientRequestId.length < 1 ||
    body.clientRequestId.length > 200 ||
    typeof body.text !== "string" ||
    body.text.length < 1 ||
    body.text.length > MAX_TEXT_LENGTH ||
    body.parseMode !== "HTML" ||
    body.disableWebPagePreview !== true
  ) {
    return json({ ok: false, error: "Unsupported Telegram sendMessage payload." }, 400);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHANNEL_ID,
          text: body.text,
          parse_mode: "HTML",
          link_preview_options: { is_disabled: true },
        }),
        signal: controller.signal,
      },
    );
    const telegram = await response.json().catch(() => null);
    const messageId = telegram?.result?.message_id;
    if (!response.ok || telegram?.ok !== true || !Number.isInteger(messageId)) {
      const code = Number.isInteger(telegram?.error_code) ? telegram.error_code : response.status;
      const description = typeof telegram?.description === "string"
        ? telegram.description.slice(0, 240)
        : "Telegram request failed.";
      return json({ ok: false, error: description, telegramErrorCode: code }, 502);
    }
    return json({ ok: true, messageId, clientRequestId: body.clientRequestId });
  } catch (error) {
    const reason = error?.name === "AbortError" ? "Telegram request timed out." : "Telegram transport failed.";
    return json({ ok: false, error: reason }, 502);
  } finally {
    clearTimeout(timeout);
  }
}

async function triggerDuePublisher(env) {
  const response = await fetch(env.HALLEUS_PUBLISH_DUE_URL, {
    method: "POST",
    headers: {
      "x-halleus-telegram-publisher-secret": env.HALLEUS_PUBLISHER_SECRET,
    },
  });
  if (!response.ok) {
    throw new Error(`Halleus Telegram publish-due returned HTTP ${response.status}.`);
  }
}

export default {
  async fetch(request, env) {
    try {
      requireConfig(env);
    } catch {
      return json({ ok: false, error: "Telegram bridge is not configured." }, 503);
    }
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === SEND_PATH) {
      return sendMessage(request, env);
    }
    return json({ ok: false, error: "Not found." }, 404);
  },

  async scheduled(controller, env, ctx) {
    requireConfig(env);
    controller.noRetry();
    ctx.waitUntil(triggerDuePublisher(env));
  },
};