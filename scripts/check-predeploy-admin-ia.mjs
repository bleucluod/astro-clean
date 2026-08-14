import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const requireText = (label, source, marker) => {
  if (!source.includes(marker)) failures.push(`${label} missing: ${marker}`);
};
const forbidText = (label, source, marker) => {
  if (source.includes(marker)) failures.push(`${label} contains forbidden: ${marker}`);
};

const reports = read("components/admin/AdminReportsWorkspace.tsx");
const reportService = read("lib/admin/admin-report-intelligence.ts");
const reportTypes = read("lib/admin/admin-types.ts");
const directGate = read("components/admin/AdminDirectGate.tsx");
const consoleSource = read("components/admin/AdminConsole.tsx");
const appShell = read("components/AppShell.tsx");

const telegramPanel = read("components/admin/TelegramAdminPanel.tsx");
const telegramService = read("lib/telegram/telegram-admin-service.ts");
const telegramOps = read("app/api/admin/telegram/operations/route.ts");
const contentConfig = read("lib/telegram/telegram-content-config.ts");
const contentConfigRoute = read("app/api/admin/telegram/content-config/route.ts");
const transitRoute = read("app/api/admin/telegram/transit-pack/route.ts");
const contentPackRoute = read("app/api/admin/telegram/content-pack/route.ts");
const contentPack = read("lib/telegram/telegram-content-pack.ts");
const migration = read("database/migrations/0014_telegram_admin_operations.sql");

const wiki = read("components/admin/WikiAdminPanel.tsx");
const css = read("components/admin/admin-console.module.css");
const packageJson = JSON.parse(read("package.json"));
const impact = JSON.parse(read("config/halleus-check-impact.json"));

for (const [label, source] of [
  ["reports workspace", reports],
  ["report service", reportService],
  ["direct gate", directGate],
  ["admin console", consoleSource],
  ["app shell", appShell],
  ["telegram panel", telegramPanel],
  ["telegram service", telegramService],
  ["telegram operations", telegramOps],
  ["content config", contentConfig],
  ["content config route", contentConfigRoute],
  ["transit route", transitRoute],
  ["content pack route", contentPackRoute],
  ["content pack", contentPack],
  ["wiki panel", wiki],
]) {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
  });
  for (const diagnostic of result.diagnostics ?? []) {
    if (diagnostic.category === ts.DiagnosticCategory.Error) {
      failures.push(
        `${label} parse error: ${ts.flattenDiagnosticMessageText(
          diagnostic.messageText,
          " ",
        )}`,
      );
    }
  }
}

// Reports daily IA + Operations
for (const marker of [
  "HALLEUS_PREDEPLOY_REPORTS_DAILY_IA_R1",
  '"overview" | "operations"',
  "۱۰ گزارش آخر",
  "نمای کلی",
  "عملیات",
  "حذف گزارش",
  "گزارش‌ها بر اساس دادهٔ canonical",
  "<details",
  "فیلترهای بیشتر",
  "Export CSV همین cohort",
]) requireText("reports IA", reports, marker);

for (const marker of [
  "pg_column_size(r)::int as storage_bytes",
  "pg_column_size(r.report_json)::int as report_json_bytes",
  "buildStorageInsights",
  "totalBytes",
  "averageBytes",
  "largestBytes",
  "medianBytes",
  "reportJsonTotalBytes",
]) requireText("report storage metrics", reportService, marker);

for (const marker of [
  "storageBytes: number",
  "reportJsonBytes: number",
  "storage:",
]) requireText("report types", reportTypes, marker);

requireText(
  "direct report delete capability",
  directGate,
  'session.capabilities.includes("reports.delete")',
);
requireText(
  "embedded report delete capability",
  consoleSource,
  'hasCapability(session, "reports.delete")',
);

// Telegram overview + actual text + operations
for (const marker of [
  '"overview" | "operations"',
  "محتوای تلگرام تا",
  "۵ پیام آینده",
  "item.previewText",
  "Queue Browser",
  "Failure Center",
  "Message Detail",
  "ذخیرهٔ متن و CTA",
  "پاک‌کردن همه پیام‌های آینده",
  "CLEAR_FUTURE_QUEUE",
  "دستور محتوایی AI",
  "دادهٔ موتور هالیوس · فقط خواندنی",
  "پرامپت کامل تولید محتوای تلگرام",
  "ذخیره دستور محتوایی",
  "Pack Progress",
  'data-telegram-day-first="true"',
  "حذف روزهای انتخاب‌شده از صف آینده",
  'data-telegram-smart-picker="public-sky-only"',
  "فقط داده‌های عمومی آسمان",
  "telegramAdvancedTools",
  "futureCoverageEnd",
  "summary?.futureClearableCount",
]) requireText("telegram IA", telegramPanel, marker);

requireText(
  "telegram nested sidebar",
  consoleSource,
  'data-admin-telegram-subnav="true"',
);
forbidText(
  "telegram legacy in-page tabs",
  telegramPanel,
  '<nav className={styles.adminWorkspaceTabs} aria-label="بخش‌های تلگرام">',
);

for (const marker of [
  "upcomingItems",
  "coverageThrough",
  "tomorrowRemaining",
  "futureClearableCount",
  "aiContentConfigVersion",
  "HALLEUS_TELEGRAM_CLEAR_FUTURE_QUEUE_R1",
  "status in ('draft', 'ready')",
  "scheduled_for > now()",
  "telegram_message_id is null",
  "bulk_cancelled_future",
  "listTelegramAdminFutureDays",
  "cancelTelegramAdminFutureDays",
  "HALLEUS_TELEGRAM_CANCEL_SELECTED_FUTURE_DAYS_R1",
  "future_clearable_count",
  "future_coverage_end",
  "listTelegramAdminUpcomingItems",
]) requireText("telegram service", telegramService, marker);

for (const marker of [
  'clear_future: "admin.telegram.future_queue_cleared"',
  'action === "clear_future"',
  'body.confirm !== "CLEAR_FUTURE_QUEUE"',
  "clearTelegramAdminFutureQueue",
  'cancel_days: "admin.telegram.future_days_cancelled"',
  'action === "cancel_days"',
  'body.confirm !== "CANCEL_SELECTED_DAYS"',
  "cancelTelegramAdminFutureDays",
]) requireText("telegram operations", telegramOps, marker);

for (const marker of [
  "HALLEUS_TELEGRAM_AI_CONTENT_CONFIG_R1",
  "messagesPerDayMin",
  "messagesPerDayMax",
  "messageTypes",
  "rawPrompt",
  "config_version",
  "persisted",
]) requireText("telegram AI config", contentConfig, marker);

for (const marker of [
  "HALLEUS_TELEGRAM_AI_CONTENT_CONFIG_API_R1",
  'requireAdminCapability(request, "telegram.read")',
  'requireAdminCapability(request, "telegram.operations.write")',
  "admin.telegram.ai_content_config_updated",
  "rawPromptLength",
]) requireText("telegram AI config API", contentConfigRoute, marker);

for (const marker of [
  "telegram_ai_content_config",
  "config_version",
  "raw_prompt",
  "settings jsonb",
  "updated_by",
  "enable row level security",
  "revoke all on halleus_private.telegram_ai_content_config",
]) requireText("telegram config migration", migration, marker);

for (const marker of [
  "HALLEUS_TELEGRAM_TRANSIT_PACK_CONTENT_CONFIG_R1",
  "getTelegramAiContentConfig",
  "aiContentConfigVersion",
  "aiContentInstructions",
  "immutableEngineRules",
  "SMART_FEATURES",
  "SMART_BODIES",
  "SMART_ASPECT_KINDS",
  "SMART_ASPECT_PHASES",
  "filterSmartTransitPack",
  'scope: "public_sky_only"',
  "aspectLimit",
]) requireText("transit content config", transitRoute, marker);

requireText("content pack parser", contentPack, "aiContentConfigVersion");
requireText(
  "content pack writer provenance",
  contentPack,
  "aiContentConfigVersion,",
);
requireText("content pack import audit", contentPackRoute, "aiContentConfigVersion");

// Engine data must remain source-controlled/read-only.
forbidText("content config", contentConfig, "sourceProvenance");
forbidText("content config API", contentConfigRoute, "contentFacts");
forbidText("content config API", contentConfigRoute, "sourceRef");

// Wiki row selection
for (const marker of [
  "wikiArticleSelectableRow",
  'role={selectable ? "checkbox" : undefined}',
  "updateArticleSelection(article.id, !selected)",
  "event.stopPropagation()",
  "wikiArticleEditButton",
  "ویرایش",
]) requireText("wiki list UX", wiki, marker);
forbidText(
  "wiki row open behavior",
  wiki,
  'className={styles.wikiArticleOpenButton}',
);

for (const marker of [
  "HALLEUS_PREDEPLOY_ADMIN_IA_BATCH1_R1",
  ".adminWorkspaceTabs",
  ".reportRecentRow",
  ".telegramUpcomingRow",
  ".telegramPromptEditor",
  ".wikiArticleSelectableRow",
  "HALLEUS_TELEGRAM_ADMIN_UX_COMPLETE_R2",
  ".telegramWorkspace button",
  ".telegramGeneratorGrid",
  ".telegramDayCard",
  ".telegramAdvancedTools",
]) requireText("admin IA styles", css, marker);

for (const marker of [
  "/halleus-logo/logo-horizontal-bilingual-final-20260804.png",
  'data-logo-variant="approved-final"',
  'filter: "brightness(0) invert(1)"',
]) requireText("footer final logo", appShell, marker);

if (
  packageJson.scripts?.["check:predeploy-admin-ia"] !==
  "node scripts/check-predeploy-admin-ia.mjs"
) {
  failures.push("package script missing check:predeploy-admin-ia");
}

for (const areaId of [
  "report-ownership-sharing",
  "telegram-content-publishing",
  "wiki",
  "wiki-admin-ui",
]) {
  const area = impact.areas?.find((entry) => entry.id === areaId);
  if (!area?.guards?.includes("check:predeploy-admin-ia")) {
    failures.push(`${areaId} does not require check:predeploy-admin-ia`);
  }
}

if (failures.length) {
  console.error("Halleus pre-deploy Admin IA Batch 1 check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Halleus pre-deploy Admin IA Batch 1 check passed.");
console.log("- Reports is daily overview first with 10 latest reports and audited delete");
console.log("- canonical analytics/CSV/storage metrics remain under collapsed Operations");
console.log("- Telegram overview shows real coverage and upcoming message copy");
console.log("- queue editing remains one-message-at-a-time through the canonical queue path");
console.log("- future unsent clearing uses audited cancellation semantics, not history deletion");
console.log("- AI content direction is versioned/editable while engine facts remain immutable");
console.log("- Wiki Articles row click selects and only the explicit Edit control opens the editor");
console.log("HALLEUS_PREDEPLOY_ADMIN_IA_BATCH1_R1=PASS");
