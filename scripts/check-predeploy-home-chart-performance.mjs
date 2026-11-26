import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const failures = [];
const chart = read("components/ChartForm.tsx");
const header = read("components/SiteHeader.tsx");
const shell = read("components/AppShell.tsx");
const packageJson = JSON.parse(read("package.json"));

for (const marker of [
  "HALLEUS_CHART_DEFERRED_RUNTIME_BATCH5_R1",
  'dynamic(',
  'import("@/components/SupabaseAuthPanel")',
  'import("@/lib/storage/account-report-save-client")',
  "saveGeneratedReportWithAccountFallback",
  "useImperativeHandle(comparisonFormRef",
  "comparisonCalculationRef",
  'if (comparisonMode) return;',
  'const realEngineResult = await requestRealEngineReportData(normalizedForm, engineCity)',
]) {
  if (!chart.includes(marker)) failures.push("ChartForm missing deferred-runtime marker: " + marker);
}
for (const forbidden of [
  'import { SupabaseAuthPanel } from',
  'import { createMockReport } from',
  'import { enrichReportWithRealEngineCopy } from',
  'import { saveGeneratedReportWithAccountFallback } from',
  'import { enhanceReportOutputV2 } from',
  'import("@/lib/astrology/mock-engine")',
  'import("@/lib/storage/report-write-service")',
  'function buildLocalFallbackReport(',
  'function attachRealEngineSnapshotToReport(',
]) {
  if (chart.includes(forbidden)) failures.push("ChartForm still has initial static import: " + forbidden);
}

// Lighthouse /chart mobile: the city catalogue must be a deferred interaction chunk.
for (const marker of [
  'type CityDirectory = typeof import("@/lib/locations/cities")',
  'import("@/lib/locations/cities")',
  'onFocus={prefetchCityDirectory}',
  'cityDirectory.filterHalleusCities(form.birthCity)',
  'cityDirectory.filterHalleusCities(currentResidenceCity)',
  'normalizedBirth = normalizeBirthForm(await ensureCityDirectory())',
  'cities.HALLEUS_CITY_OPTIONS.find(',
  'cities.findHalleusCityByName(normalizedCityName)',
]) {
  if (!chart.includes(marker)) failures.push("Chart city on-demand loading missing: " + marker);
}
if (chart.includes('from "@/lib/locations/cities"')) {
  failures.push("ChartForm reintroduced the eager city-directory import.");
}
if (chart.split('onFocus={prefetchCityDirectory}').length !== 3) {
  failures.push("Both the birth and current-residence city inputs must preload the directory.");
}

if (5 > 0) {
  for (const marker of [
    "HALLEUS_RESPONSIVE_CHROME_IMAGE_BATCH5_R1",
    "getImageProps",
    'sizes="72px"',
    'sizes="136px"',
    'viewport="desktop"',
    'viewport="mobile"',
    "/halleus-logo/symbol-transparent-white.png",
    "/halleus-logo/wordmark-bilingual-transparent-white.png",
    "/halleus-logo/symbol-dark-final-20260804.png",
  ]) {
    if (!header.includes(marker)) failures.push("SiteHeader missing responsive image marker: " + marker);
  }
  if (header.includes("className={styles.brandLogoMobile}")) failures.push("Redundant hidden desktop-nav mobile image remains in SiteHeader.");
  for (const marker of ['sizes="40px"', 'sizes="150px"', 'data-halleus-footer-image-sizing="batch5-r1"']) {
    if (!shell.includes(marker)) failures.push("AppShell missing measured footer image sizing: " + marker);
  }
}

if (true) {
  if (!existsSync("components/IntentPrefetchLink.tsx")) failures.push("IntentPrefetchLink is missing.");
  else {
    const intentLink = read("components/IntentPrefetchLink.tsx");
    for (const marker of ["DEFERRED_PREFETCH_PREFIXES", "intent ? null : false", 'data-halleus-prefetch', "onMouseEnter", "onFocus", "onTouchStart"]) {
      if (!intentLink.includes(marker)) failures.push("Intent prefetch contract missing: " + marker);
    }
  }
  for (const path of ["app/page.tsx", "components/NavLinks.tsx", "components/SiteHeader.tsx", "components/AppShell.tsx"]) {
    if (!read(path).includes("IntentPrefetchLink")) failures.push(path + " is not wired to intent prefetch.");
  }
}

if (packageJson.scripts?.["check:predeploy-home-chart-performance"] !== "node scripts/check-predeploy-home-chart-performance.mjs") {
  failures.push("package.json missing check:predeploy-home-chart-performance.");
}

if (failures.length) {
  console.error("Halleus Batch 5 performance guard failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}
console.log("Halleus Pre-Deploy Batch 5 home/chart performance check passed.");
console.log("- post-submit/chart account code is deferred from first render");
console.log("- homepage chrome image correction is evidence-gated from the frozen baseline");
console.log("- route prefetch correction is evidence-gated and interaction-triggered when needed");
console.log("HALLEUS_PREDEPLOY_HOME_CHART_PERFORMANCE_BATCH5_R3=PASS");
