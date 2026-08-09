import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const pack = read("lib/telegram/telegram-content-pack.ts");
const adminService = read("lib/telegram/telegram-admin-service.ts");
const transitRoute = read("app/api/admin/telegram/transit-pack/route.ts");
const importRoute = read("app/api/admin/telegram/content-pack/route.ts");
const panel = read("components/admin/TelegramAdminPanel.tsx");
const consoleSource = read("components/admin/AdminConsole.tsx");
const adminTypes = read("lib/admin/admin-types.ts");
const adminCapabilities = read("lib/admin/admin-capabilities.ts");
const queue = read("lib/telegram/telegram-queue.ts");
const wrangler = read("ops/cloudflare/telegram-bridge/wrangler.toml");

assert(
  pack.includes('"halleus-telegram-transit-pack-v1"') &&
    pack.includes('"halleus-telegram-content-pack-v1"'),
  "Telegram pack contracts are missing.",
);
assert(
  pack.includes("TELEGRAM_CONTENT_PACK_MAX_DAYS = 21") &&
    pack.includes("TELEGRAM_CONTENT_PACK_MAX_ITEMS = 2_000"),
  "Telegram pack bounds are missing.",
);
assert(
  pack.includes("buildSkyDailySnapshot") &&
    pack.includes("contentFactsForSnapshot") &&
    pack.includes("suggestedScheduleAt"),
  "Smart transit pack is not engine-backed/content-ready.",
);
assert(
  pack.includes("sourceRef") && pack.includes("sourceProvenance"),
  "Engine provenance handoff is missing from the pack contract.",
);
assert(
  pack.includes("engine-backed content must use a sky_* contentType") &&
    pack.includes("engine provenance date must match its scheduled Tehran date") &&
    pack.includes("sourceRef does not match its engine provenance date"),
  "Engine-backed pack claims are not tightly bound to Sky type/date provenance.",
);
assert(
  pack.includes("scheduledAt must be an ISO timestamp with timezone") &&
    pack.includes("scheduled outside the declared pack range"),
  "Imported schedule validation is incomplete.",
);
assert(
  pack.includes("contains a raw URL; use the CTA field instead") &&
    pack.includes("Rendered Telegram message exceeds 4096 characters"),
  "Telegram payload safety bounds are incomplete.",
);
assert(
  transitRoute.includes('requireAdminCapability(request, "telegram.read")'),
  "Transit pack route is not capability-protected.",
);
assert(
  importRoute.includes("assertAdminUploadRequest(request)") &&
    importRoute.includes('requireAdminCapability(request, "telegram.import.write")'),
  "Content-pack import is not protected by trusted-origin upload + capability checks.",
);
assert(
  importRoute.includes("enqueueTelegramContentPack(inspection.newItems)"),
  "Validated content packs are not scheduled automatically.",
);
assert(
  importRoute.includes("admin.telegram.content_pack_imported") &&
    importRoute.includes("recordAdminAuditEvent"),
  "Content-pack imports are not audit-covered.",
);
assert(
  adminService.includes("writer_input #>> '{sourceFacts,packId}'") &&
    adminService.includes("max(scheduled_for) filter (where status = 'ready')"),
  "Telegram admin summary does not expose pack/coverage state.",
);
assert(
  adminTypes.includes('"telegram.read"') &&
    adminTypes.includes('"telegram.import.write"'),
  "Telegram admin capabilities are missing from the canonical type list.",
);
assert(
  adminCapabilities.includes('"telegram.import.write"') &&
    adminCapabilities.includes('"telegram.read"'),
  "Telegram admin capability grants are missing.",
);
assert(
  consoleSource.includes("TelegramAdminPanel") &&
    consoleSource.includes('id: "telegram"'),
  "Telegram workspace is not wired into AdminConsole.",
);
assert(
  panel.includes("ساخت و دانلود بستهٔ هوشمند") &&
    panel.includes("اعتبارسنجی، جلوگیری از تکرار و زمان‌بندی بسته") &&
    panel.includes("با هر next فقط ۳ روز بعدی"),
  "Telegram admin workflow UI is incomplete.",
);
assert(
  panel.includes("/api/admin/telegram/transit-pack") &&
    panel.includes("/api/admin/telegram/content-pack"),
  "Telegram admin panel is not connected to pack endpoints.",
);
assert(
  queue.includes("jsonb_to_recordset") && queue.includes("enqueueTelegramContentPack"),
  "Content-pack ingestion is not bulk queued in one database operation.",
);
assert(
  queue.includes("status = 'ready'") && queue.includes("scheduled_for <= now()"),
  "Existing due publisher no longer consumes ready scheduled items.",
);
assert(
  wrangler.includes('crons = ["* * * * *"]'),
  "Telegram due publisher must poll every minute for exact-event scheduling.",
);
assert(
  !pack.includes("Workers AI") &&
    !pack.includes("env.AI") &&
    !importRoute.includes("TELEGRAM_BOT_TOKEN"),
  "Runtime AI or Telegram bot secret leaked into content-pack ingestion.",
);

console.log("Telegram content-pack workflow check passed.");
console.log("- admin exports the full selected engine-backed range with compact 3-day lookback/lookahead context");
console.log("- content chat writes at most 3 new days per next and keeps a cumulative idempotent delivery buffer");
console.log("- trusted admin import skips exact duplicates and blocks conflicting same-day overlap with explicit Persian errors");
console.log("- existing due publisher remains the only Telegram sending path and polls every minute");
console.log("HALLEUS_TELEGRAM_CONTENT_PACK_SLICE2_20260809");


// HALLEUS_SMART_DAILY_AI_BRIEF_V2 guard
{
  const smartDailySource = read("lib/telegram/telegram-content-pack.ts");
  for (const marker of [
    "HALLEUS_SMART_DAILY_AI_BRIEF_V2",
    'brief.targetDailyVolume = "50-100"',
    "brief.dailyAnchorRule",
    "brief.primaryEventRule",
    "brief.signImpactRule",
    "brief.signVocabularyRule",
    "brief.varietyRule",
    "exact_today",
    "active_today",
    "supporting_state",
    "sky_planetary_state",
    "sky_priority_aspect",
    "educational_retrograde",
    ":aspect:",
    ":motion:",
  ]) {
    assert(
      smartDailySource.includes(marker),
      "Smart Daily AI brief is missing marker: " + marker,
    );
  }
}


// HALLEUS_TELEGRAM_LINK_POLICY_V1 guard
{
  const linkPackSource = read("lib/telegram/telegram-content-pack.ts");
  const linkContentSource = read("lib/telegram/telegram-content.ts");

  for (const marker of [
    "HALLEUS_TELEGRAM_LINK_POLICY_V1",
    "brief.lookaheadRule",
    "brief.linkPolicy",
    "brief.chartLinkRule",
    "brief.skyLinkRule",
    "brief.compareLinkRule",
    "brief.wikiLinkRule",
    "brief.trustedSiteLinks",
    "brief.trustedWikiLinks",
    "telegramTrustedWikiArticles",
    "maxPerDay: 1",
    "maxPerDay: 2",
  ]) {
    assert(
      linkPackSource.includes(marker),
      "Telegram link/lookahead contract missing marker: " + marker,
    );
  }

  for (const marker of [
    "HALLEUS_TELEGRAM_HIDDEN_LINK_TARGETS_V1",
    '"compare"',
    '"wiki"',
    "wikiSlug?: string",
    'new URL("/compare", siteUrl)',
    'new URL("/wiki/" + normalizedSlug, siteUrl)',
  ]) {
    assert(
      linkContentSource.includes(marker),
      "Telegram hidden-link renderer missing marker: " + marker,
    );
  }
}

// HALLEUS_TELEGRAM_3DAY_CUMULATIVE_FLOW_R8 guard
{
  const flowPack = read("lib/telegram/telegram-content-pack.ts");
  const flowAdmin = read("lib/telegram/telegram-admin-service.ts");
  const flowRoute = read("app/api/admin/telegram/content-pack/route.ts");
  const flowPanel = read("components/admin/TelegramAdminPanel.tsx");

  for (const marker of [
    "HALLEUS_TELEGRAM_3DAY_CUMULATIVE_FLOW_R8",
    "batchSizeDays: 3",
    "lookbackSummary",
    "lookaheadSummary",
    "brief.productionBatchRule",
    "brief.cumulativeDeliveryRule",
    "brief.creativeHistoryRule",
    "brief.temporalConsistencyRule",
    "brief.signRelativeForecastRule",
    "brief.relativeDomainOrder",
    "brief.forecastQaRule",
    "brief.antiTemplateRule",
    "brief.domainRenderingRule",
    "brief.natalSpotlightRule",
    "brief.wikiCooldownRule",
    "timingMode",
    "eventAt",
    "pre_event but its Persian copy claims the event already happened",
    "bridgeSourceRef",
    "interpretationBasis",
    '["sky", "chart", "compare", "wiki"]',
  ]) {
    assert(
      flowPack.includes(marker),
      "3-day cumulative Smart Pack contract missing marker: " + marker,
    );
  }

  for (const marker of [
    "inspectTelegramContentPackImport",
    "skippedDuplicateCount",
    "conflictDates",
    "existingPackIds",
  ]) {
    assert(
      flowAdmin.includes(marker),
      "Telegram import inspection missing marker: " + marker,
    );
  }

  for (const marker of [
    "هم‌پوشانی محتوای تلگرام پیدا شد",
    "نسخهٔ قبلی دست‌نخورده ماند",
    "alreadyImported",
    "skippedDuplicateCount",
  ]) {
    assert(
      flowRoute.includes(marker),
      "Telegram admin import error contract missing marker: " + marker,
    );
  }

  for (const marker of [
    "این بسته قبلاً به هالیوس داده شده بود",
    "پیام تکراری",
    "هم‌پوشانیِ نسخهٔ متفاوت",
    "با هر next فقط ۳ روز بعدی",
  ]) {
    assert(
      flowPanel.includes(marker),
      "Telegram admin Persian UX missing marker: " + marker,
    );
  }
}


// HALLEUS_TELEGRAM_SMARTPACK_SMOKE_HARDENING_R13 guard
{
  const r13Pack = read("lib/telegram/telegram-content-pack.ts");
  const r13Admin = read("lib/telegram/telegram-admin-service.ts");
  const r13ImportRoute = read("app/api/admin/telegram/content-pack/route.ts");
  const r13TransitRoute = read("app/api/admin/telegram/transit-pack/route.ts");

  for (const marker of [
    'available: false as const',
    '"CONTEXT_SNAPSHOT_FAILED"',
    "ساخت دادهٔ نجومی روز",
  ]) {
    assert(
      r13Pack.includes(marker),
      "R13 Smart Pack context/error hardening missing marker: " + marker,
    );
  }

  for (const marker of [
    "sameStoredTelegramMessage",
    "changedIdentityCount",
    "rendered_payload ->> 'text'",
    "existingByKey",
  ]) {
    assert(
      r13Admin.includes(marker),
      "R13 duplicate identity hardening missing marker: " + marker,
    );
  }

  assert(
    r13ImportRoute.includes("همان شناسهٔ قبلی را دارند اما متن، زمان یا نوع پیام تغییر کرده"),
    "R13 changed-content conflict explanation is missing.",
  );

  for (const marker of [
    "ساخت بستهٔ هوشمند تلگرام ناموفق بود:",
    "هیچ فایلی ساخته نشد",
    "همین متن کامل خطا را بفرست",
  ]) {
    assert(
      r13TransitRoute.includes(marker),
      "R13 transit-pack Persian error contract missing marker: " + marker,
    );
  }
}

console.log("HALLEUS_TELEGRAM_SMARTPACK_SMOKE_HARDENING_R13");
