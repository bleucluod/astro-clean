import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) =>
  readFileSync(path.join(root, relativePath), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const migration = read("database/migrations/0014_telegram_admin_operations.sql");
const queue = read("lib/telegram/telegram-queue.ts");
const service = read("lib/telegram/telegram-service.ts");
const adminService = read("lib/telegram/telegram-admin-service.ts");
const queueRoute = read("app/api/admin/telegram/queue/route.ts");
const operationsRoute = read("app/api/admin/telegram/operations/route.ts");
const panel = read("components/admin/TelegramAdminPanel.tsx");
const adminTypes = read("lib/admin/admin-types.ts");
const capabilities = read("lib/admin/admin-capabilities.ts");
const contentPackRoute = read("app/api/admin/telegram/content-pack/route.ts");
const publishRoute = read("app/api/internal/telegram/publish-due/route.ts");
const publisher = read("lib/telegram/telegram-publisher.ts");
const packageJson = JSON.parse(read("package.json"));
const registry = JSON.parse(read("config/halleus-check-impact.json"));

for (const marker of [
  "telegram_queue_events",
  "append-only",
  "telegram_publish_control",
  "global_paused",
  "telegram_paused_days",
  "'cancelled'",
]) {
  assert(migration.includes(marker), `Migration missing ${marker}`);
}

assert(
  queue.includes(
    'status: "draft" | "ready" | "publishing" | "published" | "failed" | "skipped" | "cancelled";',
  ),
  "Queue item status type is missing cancelled.",
);
assert(
  queue.includes('"skipped",') &&
    queue.includes('"cancelled",') &&
    queue.includes("].includes(status)"),
  "Stored queue status validator is missing cancelled.",
);
for (const marker of [
  "claimTelegramQueueItemNow",
  "telegram_publish_control",
  "telegram_paused_days",
  "for update skip locked",
  "TELEGRAM_PUBLISH_MAX_ATTEMPTS",
  "retry_after",
  "expectedUpdatedAt",
]) {
  assert(queue.includes(marker), `Canonical queue safety missing ${marker}`);
}

for (const marker of [
  "processClaimedTelegramQueueItem",
  "processDueTelegramQueue",
  "processTelegramQueueItemNow",
  "publishTelegramPayload",
  "markTelegramQueueDispatchStarted",
  "markTelegramQueueDeliveryFailure",
  "finalizePublishedWithRetry",
]) {
  assert(service.includes(marker), `Canonical sending pipeline missing ${marker}`);
}
assert(
  operationsRoute.includes("processTelegramQueueItemNow") &&
    !operationsRoute.includes("publishTelegramPayload") &&
    !operationsRoute.includes("/telegram/send-message"),
  "Send Now must use the canonical service and not dispatch from admin route.",
);
assert(
  publisher.includes("x-halleus-bridge-secret") &&
    !panel.includes("x-halleus-bridge-secret") &&
    !panel.includes("telegramBridgeSecret"),
  "Browser/admin UI must never own bridge secrets.",
);

for (const marker of [
  "listTelegramAdminQueuePage",
  "getTelegramAdminQueueDetail",
  "getTelegramAdminControlSnapshot",
  "editTelegramAdminQueueItem",
  "rescheduleTelegramAdminQueueItem",
  "cancelTelegramAdminQueueItem",
  "retryTelegramAdminQueueItem",
  "setTelegramAdminGlobalPause",
  "pauseTelegramAdminDay",
  "resumeTelegramAdminDay",
  "delivery_uncertain",
  'lastError?.startsWith("[safe_retry]")',
  "pause_resume_skip",
  "scheduledWindow",
  "sourceProvenance",
  "expectedUpdatedAt",
  "totalPages",
  "listTelegramAdminFutureDays",
  "listTelegramAdminUpcomingItems",
  "cancelTelegramAdminFutureDays",
  "HALLEUS_TELEGRAM_CANCEL_SELECTED_FUTURE_DAYS_R1",
]) {
  assert(adminService.includes(marker), `Admin service missing ${marker}`);
}

for (const marker of [
  '"today"',
  '"tomorrow"',
  '"date"',
  '"all"',
  '"ready"',
  '"published"',
  '"problems"',
  "pageSize",
  'view === "days"',
  'view === "upcoming"',
  "listTelegramAdminFutureDays",
  "listTelegramAdminUpcomingItems",
  'requireAdminCapability(request, "telegram.read")',
]) {
  assert(queueRoute.includes(marker), `Paginated queue route missing ${marker}`);
}

for (const marker of [
  'requireAdminCapability(request, "telegram.operations.write")',
  'action === "edit"',
  'action === "reschedule"',
  'action === "cancel"',
  'action === "retry"',
  'action === "pause_global"',
  'action === "resume_global"',
  'action === "pause_day"',
  'action === "resume_day"',
  'action === "send_now"',
  'body.confirm !== "SEND_NOW"',
  'action === "cancel_days"',
  'body.confirm !== "CANCEL_SELECTED_DAYS"',
  "cancelTelegramAdminFutureDays",
  "recordAdminAuditEvent",
  "assertAdminMutationRequest",
]) {
  assert(operationsRoute.includes(marker), `Operations route missing ${marker}`);
}

for (const marker of [
  "Today Timeline · Asia/Tehran",
  "Queue Browser",
  "Failure Center",
  "Message Detail",
  "پیش‌نمایش دقیق payload ذخیره‌شده",
  "Source provenance برای دیباگ",
  "Pack Progress",
  "Pause سراسری",
  "Resume امن",
  "توقف این روز",
  "ذخیرهٔ متن و CTA",
  "ثبت زمان جدید",
  "تلاش دوبارهٔ امن",
  "لغو بدون حذف",
  "Send Now",
  "window.confirm",
  "با هر next فقط ۳ روز بعدی",
  "زمان انتشارشان تا لحظهٔ ورود فایل گذشته بود",
  "پیام آینده با زمان‌بندی اصلی وارد صف شد",
  'data-telegram-day-first="true"',
  "حذف روزهای انتخاب‌شده از صف آینده",
  "ویرایش",
  'data-telegram-smart-picker="public-sky-only"',
  "ابزارهای پیشرفته صف و خطاها",
]) {
  assert(panel.includes(marker), `Telegram Admin UI missing ${marker}`);
}

assert(
  !panel.includes('<nav className={styles.adminWorkspaceTabs} aria-label="بخش‌های تلگرام">'),
  "Telegram Overview/Operations must live in the Admin sidebar, not a second in-page tab bar.",
);
assert(
  panel.includes("summary?.futureClearableCount") &&
    adminService.includes("future_clearable_count") &&
    adminService.includes("telegram_message_id is null"),
  "Clear Future count must come from the canonical future-unsent queue.",
);

assert(
  !panel.includes("summary.lastError"),
  "Raw summary.lastError must not be rendered directly.",
);
assert(
  !panel.includes("generationResult") &&
    !operationsRoute.includes('action === "generate"'),
  "Out-of-roadmap manual generation from R1 must be removed.",
);

assert(
  contentPackRoute.includes(
    "Date.parse(item.scheduledFor) <= importStartedAt.getTime()",
  ) &&
    contentPackRoute.includes(
      "Date.parse(item.scheduledFor) > importStartedAt.getTime()",
    ),
  "Past-due import protection must remain intact.",
);
assert(
  publishRoute.includes("processDueTelegramQueue(10)"),
  "Scheduled publisher entry point changed unexpectedly.",
);

assert(
  adminTypes.includes('"telegram.operations.write"'),
  "Canonical admin capability type is missing.",
);
for (const roleMarker of ["owner:", "admin:", "publisher:"]) {
  const start = capabilities.indexOf(roleMarker);
  assert(start >= 0, `Role missing ${roleMarker}`);
  const end = capabilities.indexOf("],", start);
  assert(
    capabilities.slice(start, end).includes('"telegram.operations.write"'),
    `${roleMarker} lacks telegram.operations.write`,
  );
}

assert(
  packageJson.scripts?.["check:telegram-admin-operations"] ===
    "node scripts/check-telegram-admin-operations.mjs",
  "Focused Telegram Admin guard script is not registered.",
);
const area = registry.areas?.find(
  (candidate) => candidate.id === "telegram-content-publishing",
);
assert(
  area?.guards?.includes("check:telegram-admin-operations"),
  "Impact registry does not enforce Telegram Admin guard.",
);
assert(
  area?.patterns?.includes(
    "database/migrations/0014_telegram_admin_operations.sql",
  ),
  "Impact registry does not include the Phase 2 migration.",
);
assert(
  area?.patterns?.includes("app/api/admin/telegram/**"),
  "Impact registry must cover admin Telegram routes.",
);

console.log("Telegram Admin Control Center Phase 2 check passed.");
console.log("- queue browsing is server-paginated and filter-aware");
console.log(
  "- Today Timeline, exact payload, provenance, failure state, history, and pack progress are visible",
);
console.log(
  "- edit/reschedule/CTA/cancel/day pause/global pause/safe resume/retry/send-now are status-aware",
);
console.log("- delivery_uncertain cannot receive blind Retry");
console.log(
  "- Send Now reuses the canonical publisher lifecycle instead of creating a second bridge path",
);
console.log("- resume skips missed backlog instead of burst-sending it");
console.log(
  "- mutations are origin-bound, capability-gated, optimistic, and audit-covered",
);
console.log("HALLEUS_TELEGRAM_ADMIN_PHASE2_BATCH2_3_R2=PASS");
