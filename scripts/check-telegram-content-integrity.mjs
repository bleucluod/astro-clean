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
assert(queueSource.includes("TELEGRAM_MVP_MAX_ATTEMPTS = 1"), "MVP retry boundary must be explicit and duplicate-safe.");
assert(queueSource.includes("on conflict (content_key)"), "Queue content idempotency is missing.");
assert(!publisherSource.includes("api.telegram.org"), "Iran VPS publisher must only call the Cloudflare bridge.");
assert(publisherSource.includes("x-halleus-bridge-secret"), "Bridge authentication header is missing.");
assert(bridgeSource.includes("api.telegram.org"), "Cloudflare bridge is not the Telegram transport owner.");
assert(bridgeSource.includes("env.TELEGRAM_CHANNEL_ID"), "Cloudflare bridge must own the allowlisted channel target.");
assert(!bridgeSource.includes("body.chat_id"), "Caller must not be able to choose an arbitrary Telegram target.");
assert(bridgeSource.includes("sendMessage"), "MVP bridge must support sendMessage.");
assert(bridgeSource.includes("scheduled("), "Cloudflare bridge must expose the minimum Cron scheduler.");
assert(bridgeSource.includes("controller.noRetry()"), "Cron trigger must not create hidden Cloudflare retries in the MVP.");
assert(wranglerSource.includes('crons = ["*/10 * * * *"]'), "Cron trigger is missing or changed.");
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
console.log("- queue claim/idempotency and one-attempt MVP duplicate protection are explicit");
console.log("- Iran VPS publishes only through the authenticated Cloudflare bridge and fixed channel target");
console.log("HALLEUS_TELEGRAM_CONTENT_INTEGRITY_SLICE1_20260808");