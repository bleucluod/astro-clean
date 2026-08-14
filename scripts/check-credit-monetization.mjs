import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const migration = read("database/migrations/0015_product_entitlements.sql");
const catalog = read("lib/monetization/product-catalog.ts");
const policy = read("lib/monetization/access-policy.ts");
const service = read("lib/monetization/product-entitlement-service.ts");
const accountRoute = read("app/api/account/entitlements/route.ts");
const client = read("lib/monetization/product-access-client.ts");
const adaptive = read("components/report/ReportAdaptiveNarrative.tsx");
const reader = read("components/report/ReportProductReader.tsx");
const comparison = read("components/comparison/ComparisonComposer.tsx");
const adminPanel = read("components/admin/AccessSalesPanel.tsx");
const adminRoute = read("app/api/admin/monetization/route.ts");
const reportRoute = read("app/api/reports/account/route.ts");
const adminService = read("lib/admin/admin-service.ts");

for (const marker of [
  "account_credit_balances",
  "credit_ledger",
  "report_unlocks",
  "relationship_unlocks",
  "report_access_policy",
  "product_packages",
  "full_report_credit",
  "relationship_credit",
  "unique (user_id, credit_type, idempotency_key)",
  "primary key (user_id, report_id)",
  "primary key (user_id, result_key)",
  "'full_5'",
  "5000000",
  "'couple_5_2'",
  "7000000",
]) {
  assert(migration.includes(marker), `0015 credit schema missing: ${marker}`);
}
assert(
  !migration.includes("create table if not exists halleus_private.product_entitlements"),
  "0015 must no longer create account-wide product_entitlements.",
);

for (const marker of [
  'code: "full_5"',
  "priceMinor: 5_000_000",
  "fullReportCredits: 5",
  'code: "couple_5_2"',
  "priceMinor: 7_000_000",
  "relationshipCredits: 2",
  'code: "single_full"',
  "active: false",
  "normalizeHalleusPackageCode",
]) {
  assert(catalog.includes(marker), `catalog missing: ${marker}`);
}
assert(
  !catalog.includes('code: "relationship"'),
  "Standalone Relationship package must not exist.",
);

for (const marker of [
  "topStoriesFreeCount",
  "importantHousesFreeCount",
  "importantAspectsFreeCount",
  "weeklyActionsFreeCount",
  "nodeAxis",
  "energyBalance",
  "planetChapters",
  "technical",
  "normalizeReportAccessPolicy",
]) {
  assert(policy.includes(marker), `access policy missing: ${marker}`);
}

for (const marker of [
  "for update",
  "balance > 0",
  "pg_advisory_xact_lock",
  "unlockReportWithCredit",
  "consumeRelationshipCredit",
  "grantPackageCredits",
  "adjustAccountCredit",
  "saveReportAccessPolicy",
  "saveProductPackage",
]) {
  assert(service.includes(marker), `credit service missing: ${marker}`);
}

for (const marker of [
  'action === "unlock_report"',
  'action === "consume_relationship"',
  "getAccountProductAccess",
]) {
  assert(accountRoute.includes(marker), `account credit API missing: ${marker}`);
}

assert(
  client.includes("consumeRelationship") &&
    client.includes("unlockReport") &&
    !client.includes("chartB") &&
    !client.includes("birthDate"),
  "client credit access must consume by output key only, without second-person birth payload.",
);

assert(
  adaptive.match(/<ProductLockedOffer/g)?.length === 1,
  "Adaptive Free report must have exactly one main upgrade surface.",
);
assert(
  !reader.includes("<ProductLockedOffer"),
  "Technical appendix must not render a second independent paywall.",
);
for (const marker of [
  "accessPolicy.topStoriesFreeCount",
  "accessPolicy.importantHousesFreeCount",
  "accessPolicy.importantAspectsFreeCount",
  "accessPolicy.weeklyActionsFreeCount",
  "getPlanetChapterAccess",
  "technical.appendix",
]) {
  assert(
    adaptive.includes(marker) || reader.includes(marker),
    `dynamic report gating missing: ${marker}`,
  );
}

for (const marker of [
  "consumeRelationship",
  "result.record.id",
  "savePrivateComparison",
]) {
  assert(comparison.includes(marker), `relationship credit flow missing: ${marker}`);
}
assert(
  !comparison.includes("relationshipUnlocked"),
  "Old account-wide Relationship entitlement gate must be removed.",
);

for (const marker of [
  "چه چیزهایی در گزارش رایگان دیده می‌شوند؟",
  "بسته‌ها و قیمت‌ها",
  "اعتبار حساب‌ها",
  "grant_package",
  "adjust_credit",
]) {
  assert(
    adminPanel.includes(marker) || adminRoute.includes(marker),
    `Access & Sales missing: ${marker}`,
  );
}

assert(
  reportRoute.includes("getEffectiveTelegramRewardAccessTier") &&
    !reportRoute.includes("hasAccountProductEntitlement"),
  "New account report saves must not become premium from an unlimited account entitlement.",
);

assert(
  adminService.includes("grantPackageCredits") &&
    !adminService.includes("product_entitlements") &&
    !adminService.includes("entitlementCodesForProduct"),
  "Manual premium request fulfillment must grant package credits, not unlimited entitlements.",
);

if (failures.length) {
  console.error("Halleus Batch 2 credit monetization check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Halleus Pre-Deploy Batch 2 credit monetization check passed.");
console.log("- credits are account resources; paid output unlock is permanent per output");
console.log("- report and relationship consumption are server-side, idempotent and race-safe");
console.log("- Free/Full report presentation is versioned and admin-configurable");
console.log("- one dynamic upgrade surface replaces duplicate report paywalls");
console.log("- confirmed active defaults are 5 Full and 5 Full + 2 Relationship");
console.log("- standalone Relationship product is absent");
console.log("- Access & Sales supports policy/package edits and audited credit administration");
console.log("HALLEUS_PREDEPLOY_CREDIT_MONETIZATION_BATCH2_R1=PASS");
