import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as ts from "typescript";

const root = process.cwd();
const read = (relativePath) => readFileSync(path.join(root, relativePath), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const hardeningSource = read("lib/telegram/telegram-publishing-hardening.ts");
const migration = read("database/migrations/0013_telegram_publish_hardening.sql");
const queue = read("lib/telegram/telegram-queue.ts");
const service = read("lib/telegram/telegram-service.ts");
const publisher = read("lib/telegram/telegram-publisher.ts");
const worker = read("ops/cloudflare/telegram-bridge/worker.mjs");
const publishRoute = read("app/api/internal/telegram/publish-due/route.ts");
const adminService = read("lib/telegram/telegram-admin-service.ts");
const adminPanel = read("components/admin/TelegramAdminPanel.tsx");
const packageJson = JSON.parse(read("package.json"));
const registry = JSON.parse(read("config/halleus-check-impact.json"));

for (const marker of [
  "dispatch_started_at timestamptz",
  "retry_after timestamptz",
  "telegram_content_queue_retry_due_idx",
  "telegram_content_queue_stale_publish_idx",
  "quarantined instead of auto-retried",
]) {
  assert(migration.includes(marker), `Publishing hardening migration missing: ${marker}`);
}

for (const marker of [
  "TELEGRAM_PUBLISH_MAX_ATTEMPTS = 3",
  "TELEGRAM_SAFE_RETRY_DELAYS_MS",
  "shouldAutoRetryTelegramFailure",
  "deliveryUncertain",
]) {
  assert(hardeningSource.includes(marker), `Publishing hardening policy missing: ${marker}`);
}

for (const marker of [
  "recoverStaleTelegramQueueItems",
  "dispatch_started_at is null",
  "dispatch_started_at is not null",
  "[delivery_uncertain]",
  "attempt_count = greatest(attempt_count - 1, 0)",
  "status = 'published' and telegram_message_id",
  "retry_after is null or retry_after <= now()",
  "for update skip locked",
  "markTelegramQueueDispatchStarted",
  "markTelegramQueueDeliveryFailure",
]) {
  assert(queue.includes(marker), `Queue hardening missing: ${marker}`);
}
assert(!queue.includes("TELEGRAM_MVP_MAX_ATTEMPTS = 1"), "Legacy one-attempt MVP boundary is still active.");

const dispatchIndex = service.indexOf("await markTelegramQueueDispatchStarted(item.id)");
const publishIndex = service.indexOf("result = await publishTelegramPayload");
assert(dispatchIndex >= 0 && publishIndex > dispatchIndex, "Dispatch phase must be persisted before external send.");
for (const marker of [
  "finalizePublishedWithRetry",
  "retryScheduled",
  "deliveryUncertain",
  "finalizationPending",
  "recoverStaleTelegramQueueItems",
]) {
  assert(service.includes(marker), `Publishing service hardening missing: ${marker}`);
}

for (const marker of [
  "class TelegramPublishError",
  "retryableSafe",
  "deliveryUncertain",
  "request timed out after dispatch started",
  "transport failed after dispatch started",
  "body === null && response.status >= 500",
  "readTelegramPublishFailure",
]) {
  assert(publisher.includes(marker), `Publisher failure classification missing: ${marker}`);
}

for (const marker of [
  "deliveryUncertain: true",
  "deliveryUncertain: false",
  "retryableSafe",
  "telegram.code === 429",
  "controller.noRetry()",
]) {
  assert(worker.includes(marker), `Worker hardening missing: ${marker}`);
}
assert(publishRoute.includes("processDueTelegramQueue(10)"), "Minute publisher must drain up to ten due items per run.");

for (const marker of ["retryingCount", "uncertainCount", "stalePublishingCount"]) {
  assert(adminService.includes(marker), `Admin queue summary missing: ${marker}`);
  assert(adminPanel.includes(marker), `Admin Telegram panel missing: ${marker}`);
}

assert(
  packageJson.scripts?.["check:telegram-publishing-hardening"] ===
    "node scripts/check-telegram-publishing-hardening.mjs",
  "package.json is missing check:telegram-publishing-hardening",
);
const area = registry.areas?.find((candidate) => candidate.id === "telegram-auto-publish-hardening");
assert(area?.guards?.includes("check:telegram-publishing-hardening"), "Impact registry does not enforce publishing hardening guard.");

const tempRoot = mkdtempSync(path.join(tmpdir(), "halleus-telegram-hardening-"));
try {
  const transpiled = ts.transpileModule(hardeningSource, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const modulePath = path.join(tempRoot, "hardening.mjs");
  writeFileSync(modulePath, transpiled, "utf8");
  const hardening = await import(pathToFileURL(modulePath).href);

  const safeFailure = { message: "rate limited", retryableSafe: true, deliveryUncertain: false };
  const uncertainFailure = { message: "timeout", retryableSafe: false, deliveryUncertain: true };
  const terminalFailure = { message: "bad request", retryableSafe: false, deliveryUncertain: false };

  assert(hardening.getTelegramSafeRetryDelayMs(1) === 120000, "First safe retry delay must be two minutes.");
  assert(hardening.getTelegramSafeRetryDelayMs(2) === 600000, "Second safe retry delay must be ten minutes.");
  assert(hardening.getTelegramSafeRetryDelayMs(3) === null, "Third attempt must be terminal.");
  assert(hardening.shouldAutoRetryTelegramFailure({ attemptCount: 1, failure: safeFailure }) === true, "Known-safe failure should retry.");
  assert(hardening.shouldAutoRetryTelegramFailure({ attemptCount: 2, failure: safeFailure }) === true, "Second known-safe failure should retry.");
  assert(hardening.shouldAutoRetryTelegramFailure({ attemptCount: 3, failure: safeFailure }) === false, "Retry budget must be bounded.");
  assert(hardening.shouldAutoRetryTelegramFailure({ attemptCount: 1, failure: uncertainFailure }) === false, "Uncertain delivery must never auto-retry.");
  assert(hardening.shouldAutoRetryTelegramFailure({ attemptCount: 1, failure: terminalFailure }) === false, "Terminal failure must not retry.");
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

console.log("Telegram publishing hardening check passed.");
console.log("- known-safe failures retry with bounded 2m/10m backoff and max three attempts");
console.log("- transport-uncertain delivery is quarantined instead of resent automatically");
console.log("- stale pre-dispatch claims recover while stale post-dispatch claims fail closed");
console.log("- successful Telegram sends are never repeated when database finalization is uncertain");
console.log("- admin visibility exposes retrying, uncertain, and stale publishing states");
console.log("HALLEUS_TELEGRAM_AUTO_PUBLISH_HARDENING_SLICE4_20260809");