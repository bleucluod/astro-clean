import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as ts from "typescript";

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const read = (relativePath) => readFileSync(path.join(root, relativePath), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const contentSource = read("lib/telegram/telegram-content.ts");
const serviceSource = read("lib/telegram/telegram-service.ts");
const queueSource = read("lib/telegram/telegram-queue.ts");
const publisherSource = read("lib/telegram/telegram-publisher.ts");
const adminServiceSource = read("lib/telegram/telegram-admin-service.ts");
const bridgeSource = read("ops/cloudflare/telegram-bridge/worker.mjs");
const wranglerSource = read("ops/cloudflare/telegram-bridge/wrangler.toml");
const migrationSource = read("database/migrations/0011_telegram_content_queue.sql");
const generateRoute = read("app/api/internal/telegram/generate/route.ts");
const publishRoute = read("app/api/internal/telegram/publish-due/route.ts");

const tempRoot = mkdtempSync(path.join(tmpdir(), "halleus-telegram-content-"));
try {
  const transpiled = ts.transpileModule(contentSource, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const modulePath = path.join(tempRoot, "telegram-content.mjs");
  writeFileSync(modulePath, transpiled, "utf8");
  const content = await import(pathToFileURL(modulePath).href);

  const snapshot = {
    id: "fixture-snapshot-2026-08-08",
    input: {
      localDate: "2026-08-08",
      timezone: "Asia/Tehran",
      location: { latitude: 35.6892, longitude: 51.389, label: "تهران" },
    },
    window: {
      localDate: "2026-08-08",
      timezone: "Asia/Tehran",
      startUtc: "2026-08-07T20:30:00.000Z",
      endUtc: "2026-08-08T20:30:00.000Z",
    },
    generatedAt: "2026-08-08T08:30:00.000Z",
    source: "astronomy-engine",
    calculationVersion: "sky-daily-v1",
    planetaryStates: [
      {
        body: "moon",
        longitude: 44.2,
        sign: "taurus",
        degreeInSign: 14.2,
        apparentSpeedDegreesPerDay: 13.1,
        motion: "direct",
        nearStation: false,
      },
    ],
    moonPhase: {
      phaseAngle: 182,
      illuminationFraction: 0.99,
      phase: "full",
    },
    aspects: [],
    timeline: [],
    qualityFlags: [],
    errors: [],
  };
  const plan = content.createTelegramMvpContentPlan({
    snapshot,
    siteUrl: "https://halleus.ir",
    localDate: "2026-08-08",
    now: new Date("2026-08-08T08:30:00.000Z"),
  });
  assert(plan.length === 2, "MVP plan must contain one engine-backed and one evergreen item.");
  const engine = plan.find((item) => item.contentClass === "engine_backed");
  const evergreen = plan.find((item) => item.contentClass === "evergreen");
  assert(engine && evergreen, "MVP content classes are incomplete.");
  assert(engine.provenance?.snapshotId === snapshot.id, "Engine claim provenance lost snapshot identity.");
  assert(engine.provenance?.relatedBodies?.join(",") === "moon", "Engine provenance body is wrong.");
  assert(engine.payload.text.includes("ثور"), "Engine payload did not render the factual Moon sign.");
  assert(engine.payload.text.includes("۱۴٫۲"), "Engine payload did not render the factual Moon degree.");
  assert(engine.payload.text.includes('<a href="https://halleus.ir/sky">'), "Engine CTA is not a linked Telegram label.");
  assert(evergreen.payload.text.includes('<a href="https://halleus.ir/chart">'), "Evergreen CTA is not linked.");
  const stripHtml = (text) => text.replace(/<[^>]+>/gu, "");
  assert(!/https?:\/\//u.test(stripHtml(engine.payload.text)), "Raw CTA URL is visible in engine post text.");
  assert(!/https?:\/\//u.test(stripHtml(evergreen.payload.text)), "Raw CTA URL is visible in evergreen post text.");


  // HALLEUS_TELEGRAM_HIDDEN_LINK_TARGETS_V1 runtime checks
  const comparePayload = content.renderTelegramPayload(
    {
      contentType: "shareable_virgo_start",
      sourceFacts: {},
      allowedClaims: ["evergreen.reflection_only"],
      signTargets: ["virgo"],
      tone: "young_conversational",
      length: "short",
      cta: { label: "تحلیل رابطه‌تون رو ببین", target: "compare" },
      hashtags: [],
      scheduledWindow: {
        startAt: "2026-08-08T08:30:00.000Z",
        endAt: "2026-08-08T08:50:00.000Z",
      },
    },
    "https://halleus.ir",
  );
  assert(
    comparePayload.text.includes('<a href="https://halleus.ir/compare">تحلیل رابطه‌تون رو ببین</a>'),
    "Compare CTA is not rendered as a hidden Persian Telegram link.",
  );
  assert(
    !/https?:\/\//u.test(stripHtml(comparePayload.text)),
    "Raw compare URL is visible in Telegram text.",
  );

  const wikiPayload = content.renderTelegramPayload(
    {
      contentType: "shareable_virgo_start",
      sourceFacts: {},
      allowedClaims: ["evergreen.reflection_only"],
      signTargets: ["virgo"],
      tone: "young_conversational",
      length: "short",
      cta: {
        label: "چارت تولد چیست؟",
        target: "wiki",
        wikiSlug: "birth-chart-basics",
      },
      hashtags: [],
      scheduledWindow: {
        startAt: "2026-08-08T08:30:00.000Z",
        endAt: "2026-08-08T08:50:00.000Z",
      },
    },
    "https://halleus.ir",
  );
  assert(
    wikiPayload.text.includes('<a href="https://halleus.ir/wiki/birth-chart-basics">چارت تولد چیست؟</a>'),
    "Wiki CTA is not rendered as a hidden Persian Telegram link.",
  );
  assert(
    !/https?:\/\//u.test(stripHtml(wikiPayload.text)),
    "Raw wiki URL is visible in Telegram text.",
  );

  const fallback = content.createTelegramMvpContentPlan({
    snapshot: null,
    siteUrl: "https://halleus.ir",
    localDate: "2026-08-08",
    now: new Date("2026-08-08T08:30:00.000Z"),
  });
  assert(!fallback.some((item) => item.contentClass === "engine_backed"), "Missing sky data must never create an engine-backed claim.");
  assert(fallback.length === 2, "Missing sky data must fill the MVP plan with evergreen/shareable content.");
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

for (const marker of [
  "deliverSkyPublicSnapshot",
  "createTelegramMvpContentPlan",
  "fallbackUsed",
]) {
  assert(serviceSource.includes(marker), `Telegram service is missing source boundary: ${marker}`);
}
assert(!serviceSource.includes('fetch("/sky') && !serviceSource.includes("fetch('/sky"), "Telegram service must not scrape /sky HTML.");
assert(!contentSource.includes("astronomy-engine"), "Telegram writer must not import or calculate astronomy.");
assert(queueSource.includes("for update skip locked"), "Queue claim is not concurrency-safe.");
assert(queueSource.includes("TELEGRAM_PUBLISH_MAX_ATTEMPTS"), "Bounded publishing retry policy must be wired into the queue.");
assert(queueSource.includes("recoverStaleTelegramQueueItems"), "Stale publishing recovery is missing.");
assert(queueSource.includes("[delivery_uncertain]"), "Uncertain delivery quarantine marker is missing.");
assert(queueSource.includes("on conflict (content_key)"), "Queue content idempotency is missing.");
assert(!publisherSource.includes("api.telegram.org"), "Iran VPS publisher must only call the Cloudflare bridge.");
assert(publisherSource.includes("x-halleus-bridge-secret"), "Bridge authentication header is missing.");
assert(bridgeSource.includes("api.telegram.org"), "Cloudflare bridge is not the Telegram transport owner.");
assert(bridgeSource.includes("env.TELEGRAM_CHANNEL_ID"), "Cloudflare bridge must own the allowlisted channel target.");
assert(!bridgeSource.includes("body.chat_id"), "Caller must not be able to choose an arbitrary Telegram target.");
assert(bridgeSource.includes("sendMessage"), "MVP bridge must support sendMessage.");
assert(bridgeSource.includes("scheduled("), "Cloudflare bridge must expose the minimum Cron scheduler.");
assert(bridgeSource.includes("controller.noRetry()"), "Cron trigger must not create hidden Cloudflare retries in the MVP.");
assert(wranglerSource.includes('crons = ["* * * * *"]'), "Minute-level Telegram Cron trigger is missing or changed.");
for (const secret of [
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHANNEL_ID",
  "HALLEUS_BRIDGE_SECRET",
  "HALLEUS_PUBLISHER_SECRET",
]) {
  assert(wranglerSource.includes(`\"${secret}\"`), `Required Worker secret is not declared: ${secret}`);
}
assert(migrationSource.includes("content_key text not null unique"), "Queue migration lacks unique content key.");
assert(migrationSource.includes("telegram_engine_provenance_required"), "Queue migration does not enforce engine provenance.");
assert(migrationSource.includes("telegram_message_id bigint unique"), "Queue migration lacks Telegram message duplicate protection.");
for (const route of [generateRoute, publishRoute]) {
  assert(route.includes("timingSafeEqual"), "Internal Telegram route must use timing-safe secret verification.");
  assert(route.includes("private, no-store"), "Internal Telegram route must remain non-cacheable.");
}

console.log("Telegram content integrity check passed.");
console.log("- engine-backed copy is derived only from a structured SkyDailySnapshot fixture with provenance");
console.log("- missing sky data falls back to evergreen/shareable content instead of inventing transits");
console.log("- Telegram HTML CTAs hide raw URLs and target Halleus routes");
console.log("- queue claim/idempotency, bounded safe retry, and uncertain-delivery quarantine are explicit");
console.log("- Iran VPS publishes only through the authenticated Cloudflare bridge and fixed channel target");
console.log("HALLEUS_TELEGRAM_CONTENT_INTEGRITY_SLICE1_20260808");


// HALLEUS_TELEGRAM_EXPIRED_BACKLOG_NO_BACKFILL_R1_GUARD
{
  const expiryQueue = read("lib/telegram/telegram-queue.ts");

  for (const marker of [
    "HALLEUS_TELEGRAM_EXPIRED_BACKLOG_NO_BACKFILL_R1",
    "TELEGRAM_AUTOMATIC_SEND_MAX_LATE_MS = 30 * 60_000",
    "expiredBeforeDispatch",
    "[expired_window]",
    "expired_without_backfill",
    "scheduled_for <= ${automaticExpiryCutoff}::timestamptz",
    "scheduled_for > ${automaticExpiryCutoff}::timestamptz",
    "Automatic send freshness expired",
  ]) {
    assert(
      expiryQueue.includes(marker),
      "Telegram expired-backlog guard missing marker: " + marker,
    );
  }

  assert(
    expiryQueue.indexOf("scheduled_for <= ${automaticExpiryCutoff}::timestamptz") <
      expiryQueue.indexOf("select queue.id::text"),
    "Expired ready backlog must be retired before the next automatic claim.",
  );
}

console.log("HALLEUS_TELEGRAM_EXPIRED_BACKLOG_NO_BACKFILL_R1_GUARD=PASS");


// HALLEUS_TELEGRAM_UNCERTAIN_CIRCUIT_BREAKER_R2_GUARD
for (const marker of [
  "HALLEUS_TELEGRAM_UNCERTAIN_CIRCUIT_BREAKER_R2",
  "autoPaused: boolean",
  "input.failure.deliveryUncertain",
  "update halleus_private.telegram_publish_control",
  "global_paused = true",
  "auto_pause_delivery_uncertain",
]) {
  assert(
    queueSource.includes(marker),
    "Telegram delivery-uncertain circuit breaker missing queue marker: " +
      marker,
  );
}

for (const marker of [
  "HALLEUS_TELEGRAM_UNCERTAIN_BATCH_HALT_R2",
  "autoPaused: outcome.autoPaused",
  "if (!outcome.autoPaused)",
  "break;",
]) {
  assert(
    serviceSource.includes(marker),
    "Telegram delivery-uncertain batch halt missing service marker: " +
      marker,
  );
}

console.log(
  "HALLEUS_TELEGRAM_UNCERTAIN_CIRCUIT_BREAKER_R2_GUARD=PASS",
);

// HALLEUS_TELEGRAM_AUTO_PAUSE_RECOVERY_R3_GUARD
for (const marker of [
  "HALLEUS_TELEGRAM_AUTO_PAUSE_RECOVERY_R3",
  "TELEGRAM_AUTO_PAUSE_RECOVERY_COOLDOWN_MS = 5 * 60_000",
  "updated_by::text",
  "auto_pause_delivery_uncertain",
  "auto_resume_delivery_uncertain",
  "scheduled_for <= ${automaticExpiryCutoff}::timestamptz",
  "at time zone 'Asia/Tehran'",
]) {
  assert(
    queueSource.includes(marker),
    "Telegram auto-pause recovery missing queue marker: " + marker,
  );
}

for (const marker of [
  "HALLEUS_TELEGRAM_BRIDGE_HEALTH_PROBE_R3",
  "probeTelegramBridgeTransport",
  '"/telegram/check-member"',
  '"invalid-diagnostic-id"',
  "response.status === 400",
]) {
  assert(
    publisherSource.includes(marker),
    "Telegram bridge health probe missing publisher marker: " + marker,
  );
}

for (const marker of [
  "recoverTelegramAutoPausedPublisher",
  "checkBridge: probeTelegramBridgeTransport",
  "autoPauseRecovery",
]) {
  assert(
    serviceSource.includes(marker),
    "Telegram service auto-recovery wiring missing marker: " + marker,
  );
}

for (const marker of [
  "HALLEUS_TELEGRAM_RESUME_FRESHNESS_R3",
  "TELEGRAM_AUTOMATIC_SEND_MAX_LATE_MS",
  "scheduled_for <= ${automaticExpiryCutoff}::timestamptz",
  "at time zone 'Asia/Tehran'",
]) {
  assert(
    adminServiceSource.includes(marker),
    "Telegram admin resume freshness missing marker: " + marker,
  );
}

assert(
  bridgeSource.indexOf("if (!/^\\d{1,19}$/u.test(telegramUserId))") <
    bridgeSource.indexOf('telegramRequest(env, "getChatMember"'),
  "Bridge health probe contract changed: invalid member ids must fail before Telegram API dispatch.",
);

console.log("HALLEUS_TELEGRAM_AUTO_PAUSE_RECOVERY_R3_GUARD=PASS");
