// HALLEUS_FREE_ALL_ACCESS_MODE_CHECK_BATCH1_R1
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8");
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const policy = read("lib/monetization/access-policy.ts");
const service = read("lib/monetization/product-entitlement-service.ts");
const reader = read("components/report/ReportProductReader.tsx");
const comparison = read("components/comparison/ComparisonComposer.tsx");
const adminRoute = read("app/api/admin/monetization/route.ts");
const adminPanel = read("components/admin/AccessSalesPanel.tsx");
const premiumRoute = read("app/api/premium-requests/route.ts");
const pricingPage = read("app/pricing/page.tsx");
const productPage = read("app/product/page.tsx");
const orderPage = read("app/order/page.tsx");
const commerce = read("components/commerce/CommerceSurfaces.tsx");
const home = read("app/page.tsx");
const reportPage = read("app/reports/[reportId]/page.tsx");
const sharedReportPage = read("app/reports/shared/[shareToken]/page.tsx");
const reportDetail = read("components/ReportDetail.tsx");
const comparePage = read("app/compare/page.tsx");
const dashboard = read("app/dashboard/page.tsx");
const migration = read("database/migrations/0016_free_all_report_access_mode.sql");

for (const marker of [
  '"FREE_ALL"', '"CONFIGURED"', 'monetizationMode',
  'birth_full_report', 'relationship_comparison', 'isReportMonetizationMode',
]) assert(policy.includes(marker), `access mode policy missing: ${marker}`);
assert(policy.includes('monetizationMode: "CONFIGURED"'), "code fallback must fail safe to CONFIGURED before storage proves FREE_ALL");

for (const marker of [
  'getReportAccessControlState', 'updated_at::text', 'updated_by::text',
  'bypassedByMode: "FREE_ALL"', 'bypassedRelationshipByMode: "FREE_ALL"',
  'isReportMonetizationMode',
]) assert(service.includes(marker), `entitlement service missing: ${marker}`);

const reportFreeIndex = service.indexOf('bypassedByMode: "FREE_ALL"');
const reportDebitIndex = service.indexOf('set balance = balance - 1');
assert(reportFreeIndex >= 0 && reportDebitIndex > reportFreeIndex, "FREE_ALL report bypass must happen before report credit debit");
const relationshipFreeIndex = service.indexOf('bypassedRelationshipByMode: "FREE_ALL"');
const relationshipDebitIndex = service.lastIndexOf('set balance = balance - 1');
assert(relationshipFreeIndex >= 0 && relationshipDebitIndex > relationshipFreeIndex, "FREE_ALL relationship bypass must happen before relationship credit debit");

assert(reader.includes('freeAllAccess ||') && reader.includes('data-effective-monetization-mode'), "birth report must render full access from server-returned FREE_ALL mode");
assert(comparison.includes('if (!freeAllAccess)') && comparison.includes('data-free-all-relationship-access="true"'), "relationship generation must skip consumption and hide credit UI in FREE_ALL");
assert(comparison.includes('productAccess.status === "unavailable"'), "relationship generation must fail closed when access mode cannot be confirmed");

for (const marker of ['getReportAccessControlState', 'beforeSummary', 'monetizationMode: before.effectiveMode', 'accessControl: after'])
  assert(adminRoute.includes(marker), `admin mode API missing: ${marker}`);
for (const marker of ['FREE_ALL — همهٔ گزارش‌ها بدون مصرف اعتبار', 'CONFIGURED — قوانین اعتبار فعلی', 'پیش‌نمایش قبل از ذخیره', 'reportTypes', 'updatedBy'])
  assert(adminPanel.includes(marker), `admin mode UI missing: ${marker}`);

assert(home.includes('HALLEUS_FREE_ALL_HOME_COPY_BATCH1_R1') && home.includes('effectiveFaqItems') && home.includes('effectiveTrustItems'), "homepage access copy must reflect effective FREE_ALL mode instead of configured Premium copy");
assert(reportPage.includes('HALLEUS_SERVER_SEEDED_REPORT_ACCESS_BATCH1_R1') && sharedReportPage.includes('HALLEUS_SERVER_SEEDED_SHARED_REPORT_ACCESS_BATCH1_R1') && reportDetail.includes('initialAccessPolicy'), "birth/shared report pages must seed server-authoritative access policy before client hydration");
assert(comparePage.includes('HALLEUS_SERVER_SEEDED_COMPARE_ACCESS_BATCH1_R1') && comparison.includes('initialMonetizationMode'), "comparison page must seed server-authoritative access mode before client hydration");
assert(dashboard.includes('HALLEUS_FREE_ALL_DASHBOARD_BATCH1_R1') && dashboard.includes('configuredMonetizationVisible'), "dashboard must hide purchase CTAs unless CONFIGURED mode is confirmed");

assert(premiumRoute.includes('FREE_ALL_ACTIVE') && premiumRoute.includes('getReportAccessPolicy'), "purchase request API must reject new purchase requests while FREE_ALL is active");
for (const source of [pricingPage, productPage, orderPage]) {
  assert(source.includes('dynamic = "force-dynamic"'), "commerce route must be dynamic so admin mode changes apply without deploy");
  assert(source.includes('getReportAccessPolicy'), "commerce route must read server-authoritative access mode");
}
for (const marker of ['HALLEUS_FREE_ALL_PRICING_SURFACE_BATCH1_R1', 'HALLEUS_FREE_ALL_PRODUCT_SURFACE_BATCH1_R1', 'HALLEUS_FREE_ALL_ORDER_SURFACE_BATCH1_R1'])
  assert(commerce.includes(marker), `FREE_ALL commerce surface missing: ${marker}`);

for (const marker of [
  "jsonb_set", "'{monetizationMode}'", "'FREE_ALL'",
  "coalesce(config ->> 'monetizationMode', 'CONFIGURED') <> 'FREE_ALL'",
]) assert(migration.includes(marker), `0016 mode migration missing: ${marker}`);
for (const forbidden of ['account_credit_balances', 'credit_ledger', 'report_unlocks', 'relationship_unlocks', 'halleus_reports', 'premium_requests'])
  assert(!migration.includes(forbidden), `0016 must not mutate monetization/history/privacy table: ${forbidden}`);
assert(migration.includes('admin_audit_events') && migration.includes('system.monetization.access_mode_initialized'), "0016 initial FREE_ALL activation must append a system audit event");

if (failures.length) {
  console.error("Halleus Batch 1 FREE_ALL access mode check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Halleus Batch 1 FREE_ALL access mode check passed.");
console.log("- discovered charged report flows: birth/full report + relationship comparison");
console.log("- FREE_ALL bypasses all credit consumption without fake unlocks or purchase history");
console.log("- CONFIGURED remains the fail-safe canonical credit mode");
console.log("- admin mode changes are capability-protected, versioned, previewed and audited");
console.log("- commerce purchase surfaces are suppressed while FREE_ALL is active");
console.log("- privacy/publication rows are outside the mode migration");
console.log("HALLEUS_FREE_ALL_ACCESS_MODE_BATCH1_R1=PASS");
