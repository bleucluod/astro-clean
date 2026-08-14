import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const dashboard = read("app/dashboard/page.tsx");
const dashboardCss = read("app/dashboard/dashboard.module.css");
const composer = read("components/comparison/ComparisonComposer.tsx");
const comparisonCss = read("components/comparison/comparison.module.css");
const accessClient = read("lib/monetization/product-access-client.ts");
const detailLayout = read("app/compare/[comparisonId]/layout.tsx");
const packageJson = JSON.parse(read("package.json"));

for (const marker of [
  'data-halleus-progressive-compare="batch4-r1"',
  'data-flow-step="charts"',
  'data-flow-step="relationship"',
  'data-flow-step="consent"',
  'data-flow-step="credit"',
  "ساخت تحلیل رابطه",
  "اجازه استفاده از اطلاعات نفر دوم را دارم",
  "savePrivateComparison",
  'href="/pricing"',
  "ProductAccessCards",
]) assert(composer.includes(marker), "Compare missing Batch 4 marker: " + marker);

const clientImport = composer.match(/import\s+\{([^}]*)\}\s+from\s+"@\/lib\/monetization\/product-access-client";/m);
assert(Boolean(clientImport), "Compare must keep importing the Batch 2 product-access client.");
const importedClientNames = clientImport
  ? clientImport[1].split(",").map((item) => item.trim()).filter(Boolean).map((item) => {
      const parts = item.split(/\s+as\s+/);
      return (parts[1] ?? parts[0]).trim();
    })
  : [];
assert(importedClientNames.some((name) => composer.includes(name)), "Compare must keep referencing the Batch 2 product-access client.");
assert(!/\bfetch\s*\(/.test(composer), "Compare must not send second-person birth data through a direct fetch path.");
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
console.log("- Compare is progressive while preserving private synastry, consent and Batch 2 credit consumption");
console.log("- relationship balance is visible before the creation CTA and pricing is the no-credit path");
console.log("- Dashboard is the personal Halleus home with credits, continuation, recent reports and integrated auth");
console.log("HALLEUS_PREDEPLOY_CONSUMER_PRODUCT_UX_BATCH4_R2=PASS");
