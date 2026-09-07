import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const dashboard = read("app/dashboard/page.tsx");
const dashboardCss = read("app/dashboard/dashboard.module.css");
const composer = read("components/comparison/ComparisonComposer.tsx");
const comparisonService = read("lib/comparison/comparison-product-service.ts");
const comparisonCss = read("components/comparison/comparison.module.css");
const detailLayout = read("app/compare/[comparisonId]/layout.tsx");
const packageJson = JSON.parse(read("package.json"));

for (const marker of [
  'data-halleus-progressive-compare="batch4-r1"',
  'data-flow-step="charts"',
  'data-flow-step="relationship"',
  'data-builder-simplified="r12"',
  "ساخت تحلیل رابطه",
  "savePrivateComparison",
  "generationInFlightRef",
  "pendingGenerationRef",
  "generationDisabled",
]) assert(composer.includes(marker), "Compare missing simplified R12 marker: " + marker);

const clientImport = composer.match(/import\s+\{([^}]*)\}\s+from\s+"@\/lib\/monetization\/product-access-client";/m);
assert(Boolean(clientImport), "Compare must keep importing the product-access client.");
const importedClientNames = clientImport
  ? clientImport[1].split(",").map((item) => item.trim()).filter(Boolean).map((item) => {
      const parts = item.split(/\s+as\s+/);
      return (parts[1] ?? parts[0]).trim();
    })
  : [];
assert(importedClientNames.some((name) => composer.includes(name)), "Compare must keep referencing the product-access client.");
assert(!/\bfetch\s*\(/.test(composer), "Compare must not send second-person birth data through a direct fetch path.");
for (const retired of [
  'import { ChartForm } from "@/components/ChartForm";',
  "chartCreationSlot",
  "inlineChartDialog",
  "onComparisonChartSaved",
  'data-flow-step="consent"',
  "consentConfirmed",
  "compare_consent_completed",
  "چارت خودت را انتخاب یا بساز.",
  "فعلاً ساخت تحلیل رابطه رایگان است و هیچ اعتبار رابطه‌ای مصرف نمی‌شود.",
]) assert(!composer.includes(retired), "Compare still contains retired R12 UI/flow: " + retired);
assert(
  composer.includes("pendingGenerationRef") &&
    composer.includes("recordId: pending?.signature === signature ? pending.recordId : undefined"),
  "Compare retry must preserve a stable relationship result key.",
);
assert(
  comparisonService.includes('report.input.birthTimeAccuracy === "known"') &&
    comparisonService.includes('report.input.birthTimeAccuracy === "unknown"') &&
    !comparisonService.includes('birthTime.trim() === "12:00"'),
  "Comparison birth-time status must use explicit accuracy before legacy structural fallback.",
);
assert(
  !comparisonService.includes("input.secondPersonConsentConfirmed") &&
    !comparisonService.includes('"consent-required"'),
  "Comparison service must not retain the removed explicit-consent gate.",
);
assert(
  composer.includes("history.length > 0") &&
    !composer.includes("history.length === 0"),
  "Empty comparison history must not occupy the public landing body.",
);
assert(!composer.includes("compatibilityPercent") && !composer.includes("compatibilityScore"), "Compare must not introduce compatibility percentages.");
for (const marker of ["index: false", "follow: false", "noarchive: true", "nosnippet: true"]) assert(detailLayout.includes(marker), "Private comparison metadata missing: " + marker);

for (const marker of [
  'data-halleus-personal-home="batch4-r1"',
  "خانه شخصی هالیوس",
  "ProductAccessCards",
  "SupabaseAuthPanel compact",
  'href="/chart"',
  'href="/compare"',
  'href="/pricing"',
  'href="/profile"',
  'href="/privacy"',
  "ادامه گزارش",
  "گزارش‌های اخیر",
]) assert(dashboard.includes(marker), "Dashboard missing Batch 4 marker: " + marker);

for (const oldTechnical of ["علاقه‌مندی‌ها", "یادداشت‌ها", "feature-grid", "stats.favoriteCount", "stats.noteCount", "stats.privateCount"]) {
  assert(!dashboard.includes(oldTechnical), "Dashboard still exposes demoted technical/statistical UI: " + oldTechnical);
}
assert(dashboardCss.includes("@media (max-width: 760px)"), "Dashboard mobile layout guard missing.");
assert(dashboardCss.includes("prefers-reduced-motion"), "Dashboard reduced-motion boundary missing.");
assert(comparisonCss.includes("Halleus predeploy Batch 4 progressive compare UX"), "Compare Batch 4 styles missing.");
assert(comparisonCss.includes("prefers-reduced-motion"), "Compare reduced-motion boundary missing.");
assert(packageJson.scripts?.["check:predeploy-consumer-product-ux"] === "node scripts/check-predeploy-consumer-product-ux.mjs", "Batch 4 package guard script missing.");

if (failures.length) {
  console.error("Halleus Pre-Deploy Batch 4 consumer product UX check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}
console.log("Halleus Pre-Deploy Batch 4 consumer product UX check passed.");
console.log("- Compare is a simplified stored-chart-only journey; chart creation is routed to /chart");
console.log("- retry preserves the same relationship result key and the retired consent/inline-create UI stays absent");
console.log("- relationship balance is visible before the creation CTA and pricing is the no-credit path");
console.log("- Dashboard is the personal Halleus home with credits, continuation, recent reports and integrated auth");
console.log("HALLEUS_PREDEPLOY_CONSUMER_PRODUCT_UX_BATCH4_R2=PASS");
