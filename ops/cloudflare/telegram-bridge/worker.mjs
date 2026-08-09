const SEND_PATH = "/telegram/send-message";
const CHECK_MEMBER_PATH = "/telegram/check-member";
const WEBHOOK_PATH = "/telegram/webhook";
const CONFIGURE_WEBHOOK_PATH = "/telegram/configure-webhook";
const MAX_TEXT_LENGTH = 4096;
const REQUEST_TIMEOUT_MS = 12_000;
const REWARD_START_PREFIX = "reward_";

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
    "TELEGRAM_WEBHOOK_SECRET",
    "HALLEUS_BRIDGE_SECRET",
    "HALLEUS_PUBLISHER_SECRET",
    "HALLEUS_PUBLISH_DUE_URL",
    "HALLEUS_REWARD_LINK_URL",
  ]) {
    if (typeof env[key] !== "string" || env[key].trim().length === 0) {
      throw new Error(`Missing Worker binding: ${key}`);
    }
  }
}

function bridgeAuthorized(request, env) {
  const supplied = request.headers.get("x-halleus-bridge-secret") ?? "";
  return safeEqual(env.HALLEUS_BRIDGE_SECRET, supplied);
}

async function telegramRequest(env, method, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const telegram = await response.json().catch(() => null);
    if (!response.ok || telegram?.ok !== true) {
      const code = Number.isInteger(telegram?.error_code) ? telegram.error_code : response.status;
      const description = typeof telegram?.description === "string"
        ? telegram.description.slice(0, 240)
        : "Telegram request failed.";
      return { ok: false, code, description, deliveryUncertain: false };
    }
    return { ok: true, result: telegram.result, deliveryUncertain: false };
  } catch (error) {
    return {
      ok: false,
      code: 502,
      description: error?.name === "AbortError" ? "Telegram request timed out." : "Telegram transport failed.",
      deliveryUncertain: true,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function sendMessage(request, env) {
  if (!bridgeAuthorized(request, env)) {
    return json({ ok: false, error: "Bridge authorization failed." }, 401);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON payload." }, 400);
  }
  if (
    !body || typeof body !== "object" ||
    typeof body.clientRequestId !== "string" || body.clientRequestId.length < 1 || body.clientRequestId.length > 200 ||
    typeof body.text !== "string" || body.text.length < 1 || body.text.length > MAX_TEXT_LENGTH ||
    body.parseMode !== "HTML" || body.disableWebPagePreview !== true
  ) {
    return json({ ok: false, error: "Unsupported Telegram sendMessage payload." }, 400);
  }

  const telegram = await telegramRequest(env, "sendMessage", {
    chat_id: env.TELEGRAM_CHANNEL_ID,
    text: body.text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
  });
  const messageId = telegram.ok ? telegram.result?.message_id : null;
  if (!telegram.ok || !Number.isInteger(messageId)) {
    const retryableSafe =
      telegram.deliveryUncertain !== true &&
      (telegram.code === 429 || (Number.isInteger(telegram.code) && telegram.code >= 500));
    return json({
      ok: false,
      error: telegram.description ?? "Telegram send failed.",
      telegramErrorCode: telegram.code,
      retryableSafe,
      deliveryUncertain: telegram.deliveryUncertain === true,
    }, 502);
  }
  return json({ ok: true, messageId, clientRequestId: body.clientRequestId });
}

function normalizeMember(result) {
  const status = typeof result?.status === "string" ? result.status : "unknown";
  const isMember =
    status === "creator" ||
    status === "administrator" ||
    status === "member" ||
    (status === "restricted" && result?.is_member === true);
  return { status, isMember };
}

async function checkMember(request, env) {
  if (!bridgeAuthorized(request, env)) {
    return json({ ok: false, error: "Bridge authorization failed." }, 401);
  }
  const body = await request.json().catch(() => null);
  const telegramUserId = typeof body?.telegramUserId === "string" ? body.telegramUserId : "";
  if (!/^\d{1,19}$/u.test(telegramUserId)) {
    return json({ ok: false, error: "Telegram user id is invalid." }, 400);
  }
  const telegram = await telegramRequest(env, "getChatMember", {
    chat_id: env.TELEGRAM_CHANNEL_ID,
    user_id: telegramUserId,
  });
  if (!telegram.ok) {
    return json({ ok: false, error: telegram.description, telegramErrorCode: telegram.code }, 502);
  }
  return json({ ok: true, ...normalizeMember(telegram.result) });
}

function extractRewardStart(update) {
  const message = update?.message;
  if (!message || message.chat?.type !== "private" || !message.from?.id || typeof message.text !== "string") {
    return null;
  }
  const match = message.text.trim().match(/^\/start(?:@\w+)?\s+reward_([A-Za-z0-9_-]{20,64})$/u);
  if (!match) return null;
  return { token: match[1], telegramUserId: String(message.from.id) };
}

async function rewardWebhook(request, env) {
  const supplied = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!safeEqual(env.TELEGRAM_WEBHOOK_SECRET, supplied)) {
    return json({ ok: false, error: "Telegram webhook authorization failed." }, 401);
  }
  const update = await request.json().catch(() => null);
  const reward = extractRewardStart(update);
  if (!reward) return json({ ok: true, ignored: true });

  const response = await fetch(env.HALLEUS_REWARD_LINK_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-halleus-telegram-publisher-secret": env.HALLEUS_PUBLISHER_SECRET,
    },
    body: JSON.stringify(reward),
  });
  if (!response.ok) {
    return json({ ok: false, error: `Halleus reward link returned HTTP ${response.status}.` }, 502);
  }
  return json({ ok: true, linked: true });
}

async function configureWebhook(request, env) {
  if (!bridgeAuthorized(request, env)) {
    return json({ ok: false, error: "Bridge authorization failed." }, 401);
  }
  const origin = new URL(request.url).origin;
  const telegram = await telegramRequest(env, "setWebhook", {
    url: `${origin}${WEBHOOK_PATH}`,
    secret_token: env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ["message"],
    drop_pending_updates: false,
  });
  if (!telegram.ok) {
    return json({ ok: false, error: telegram.description, telegramErrorCode: telegram.code }, 502);
  }
  return json({ ok: true, configured: telegram.result === true });
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

const worker = {
  async fetch(request, env) {
    try {
      requireConfig(env);
    } catch {
      return json({ ok: false, error: "Telegram bridge is not configured." }, 503);
    }
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === SEND_PATH) return sendMessage(request, env);
    if (request.method === "POST" && url.pathname === CHECK_MEMBER_PATH) return checkMember(request, env);
    if (request.method === "POST" && url.pathname === WEBHOOK_PATH) return rewardWebhook(request, env);
    if (request.method === "POST" && url.pathname === CONFIGURE_WEBHOOK_PATH) return configureWebhook(request, env);
    return json({ ok: false, error: "Not found." }, 404);
  },

  async scheduled(controller, env, ctx) {
    requireConfig(env);
    controller.noRetry();
    ctx.waitUntil(triggerDuePublisher(env));
  },
};

export default worker;