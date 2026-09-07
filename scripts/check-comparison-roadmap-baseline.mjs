import { existsSync, readFileSync } from "node:fs";

const failures = [];
const observations = [];
const paths = {
  page: "app/compare/page.tsx",
  layout: "app/compare/layout.tsx",
  privateLayout: "app/compare/[comparisonId]/layout.tsx",
  composer: "components/comparison/ComparisonComposer.tsx",
  report: "components/comparison/ComparisonReport.tsx",
  wheel: "components/comparison/ComparisonBiWheel.tsx",
  styles: "components/comparison/comparison.module.css",
  service: "lib/comparison/comparison-product-service.ts",
  editorial: "content/public-editorial-final/05-compare.md",
  optionalLanding: "components/comparison/ComparisonLanding.tsx",
};

const read = (path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");
const readOptional = (path) => existsSync(path) ? read(path) : "";
const src = Object.fromEntries(Object.entries(paths).map(([key, path]) => [key, key === "optionalLanding" ? readOptional(path) : read(path)]));
const landing = [src.page, src.layout, src.optionalLanding].join("\n");
const finalTitle = "\u0686\u0627\u0631\u062a \u0633\u06cc\u0646\u0627\u0633\u062a\u0631\u06cc \u0622\u0646\u0644\u0627\u06cc\u0646 | \u062a\u062d\u0644\u06cc\u0644 \u0631\u0627\u0628\u0637\u0647 \u0648 \u0627\u0632\u062f\u0648\u0627\u062c \u062f\u0648 \u0646\u0641\u0631";
const staleNewTabCopy = "\u0633\u0627\u062e\u062a \u0686\u0627\u0631\u062a \u062f\u0648\u0645 \u062f\u0631 \u062a\u0628 \u062a\u0627\u0632\u0647";

function check(group, condition, detail) {
  if (!condition) failures.push({ group, detail });
}
function observe(key, value) {
  observations.push({ key, value });
}

const fixtures = [
  { id: "library-zero", expected: "two-inline-chart-entry-actions" },
  { id: "library-one", expected: "first-slot-suggested-second-slot-empty" },
  { id: "library-two-plus", expected: "distinct-selectable-charts" },
  { id: "noon-known", birthTime: "12:00", accuracy: "known", expected: "exact" },
  { id: "noon-unknown", birthTime: "12:00", accuracy: "unknown", expected: "unknown" },
  { id: "legacy-no-angles", expected: "unknown" },
  { id: "legacy-valid-angles-houses", expected: "exact" },
  { id: "result-both-exact", expected: "houses-eligible" },
  { id: "result-one-unknown", expected: "dependent-layers-bounded" },
  { id: "result-both-unknown", expected: "no-house-angle-overclaim" },
];
check("fixtures", fixtures.length === 10, "roadmap fixture matrix must keep all 10 baseline scenarios");

observe("forceDynamic", src.page.includes('export const dynamic = "force-dynamic"'));
observe("usesFinalEditorialPage", src.page.includes("FinalEditorialPage"));
observe("opensChartInNewTab", src.composer.includes('target="_blank"'));
observe("usesNoonSentinel", src.service.includes('birthTime.trim() === "12:00"'));
const consentGated =
  /disabled=\{[^}]*!consentConfirmed/.test(src.composer) ||
  (
    src.composer.includes("const generationDisabled =") &&
    /const generationDisabled =[\s\S]{0,260}!consentConfirmed/.test(src.composer)
  );
observe("consentIncludedInDisabled", consentGated);
observe("historyAlwaysRendersSection", src.composer.includes("history.length === 0"));

check("landing", !src.page.includes('export const dynamic = "force-dynamic"'), "public /compare must not force dynamic rendering");
check("landing", !src.page.includes("FinalEditorialPage"), "public /compare must use a dedicated product landing composition, not FinalEditorialPage");
check("landing", src.optionalLanding.length > 0 || src.page.includes("ComparisonLanding"), "dedicated ComparisonLanding composition is missing");
check("seo", landing.includes(finalTitle), "final roadmap title is not present");
check("seo", landing.includes("SoftwareApplication") || landing.includes("WebApplication"), "application structured data is missing");
check("seo", landing.includes("BreadcrumbList"), "BreadcrumbList structured data is missing");
check("seo", landing.includes("FAQPage"), "FAQPage structured data is missing");
check("builder", landing.includes("compare-builder"), "builder anchor/focus target #compare-builder is missing");
check("builder", !src.composer.includes('target="_blank"'), "chart creation still leaves the journey through target=_blank");
check("builder", !src.composer.includes(staleNewTabCopy), "stale new-tab chart creation copy is still visible");
check("builder", src.composer.includes("data-inline-chart-creation") || /\bChartForm\b/.test(src.composer), "inline/reused chart creation path is not present");
check("builder", consentGated, "generation CTA is not gated by explicit consent");
check("builder", src.composer.includes("aria-current") || src.composer.includes("data-step-state"), "progress rail has no complete/active/remaining semantic state");
check("builder", /history\.length\s*>\s*0/.test(src.composer), "empty comparison history still occupies the main landing body");
check("birth-time", !src.service.includes('birthTime.trim() === "12:00"'), "12:00 sentinel still misclassifies a real noon birth");
check("birth-time", src.service.includes("birthTimeAccuracy"), "birthTimeAccuracy is not the primary known/unknown contract in comparison defaults");
check("result", /ownerSection|sectionOwnership|narrativeOwner/.test(src.service), "narrative ownership contract for deduplication is missing");
check("result", /slice\(0,\s*8\)/.test(src.report) || src.report.includes("INITIAL_TECHNICAL_CONTACT_LIMIT"), "technical tab does not have an explicit initial <=8 contact limit");
check("result", src.report.includes("data-person-direction") || src.report.includes("directionalAspectTitle"), "technical aspect titles do not expose an explicit person-direction contract");
check("wheel", /collision|leaderLine|labelLane|resolveLabel/.test(src.wheel), "bi-wheel label collision handling is missing");
check("privacy", src.privateLayout.includes("index: false") && src.privateLayout.includes("follow: false") && src.privateLayout.includes("noarchive: true") && src.privateLayout.includes("nosnippet: true") && src.privateLayout.includes("noimageindex: true"), "private result metadata boundary regressed");
check("a11y", src.styles.includes("prefers-reduced-motion"), "reduced-motion boundary is missing");
check("a11y", src.composer.includes("<fieldset") && src.composer.includes("<legend"), "relationship controls must retain fieldset/legend semantics");

const literalParagraphs = [...src.report.matchAll(/<p[^>]*>\s*([^<{][^<]{30,}?)\s*<\/p>/gs)]
  .map((match) => match[1].replace(/\s+/g, " ").trim())
  .filter(Boolean);
const paragraphCounts = new Map();
for (const paragraph of literalParagraphs) paragraphCounts.set(paragraph, (paragraphCounts.get(paragraph) ?? 0) + 1);
const duplicateLiteralParagraphs = [...paragraphCounts.entries()].filter(([, count]) => count > 1);

const groupCounts = new Map();
for (const failure of failures) groupCounts.set(failure.group, (groupCounts.get(failure.group) ?? 0) + 1);
const observationMap = new Map(observations.map((item) => [item.key, item.value]));

console.log("HALLEUS_COMPARE_ROADMAP_BASELINE");
console.log("FIXTURE_COUNT=" + fixtures.length);
console.log("REPORT_SOURCE_LINES=" + src.report.split("\n").length);
console.log("LITERAL_PARAGRAPH_COUNT=" + literalParagraphs.length);
console.log("DUPLICATE_LITERAL_PARAGRAPH_GROUPS=" + duplicateLiteralParagraphs.length);
for (const item of observations) console.log("OBSERVE_" + item.key + "=" + String(item.value));

const args = new Set(process.argv.slice(2));
const allowedArgs = new Set(["--expect-baseline", "--expect-slice1", "--expect-slice2", "--expect-final"]);
for (const arg of args) {
  if (!allowedArgs.has(arg)) {
    console.error("UNKNOWN_ARGUMENT=" + arg);
    process.exit(2);
  }
}
if (["--expect-baseline", "--expect-slice1", "--expect-slice2", "--expect-final"].filter((arg) => args.has(arg)).length > 1) {
  console.error("Choose only one expectation mode");
  process.exit(2);
}

if (args.has("--expect-baseline")) {
  const expectedGroupCounts = new Map([
    ["landing", 3],
    ["seo", 4],
    ["builder", 7],
    ["birth-time", 2],
    ["result", 3],
    ["wheel", 1],
  ]);
  const expectedObservations = new Map([
    ["forceDynamic", true],
    ["usesFinalEditorialPage", true],
    ["opensChartInNewTab", true],
    ["usesNoonSentinel", true],
    ["consentIncludedInDisabled", false],
    ["historyAlwaysRendersSection", true],
  ]);
  const baselineMismatches = [];
  if (failures.length !== 20) baselineMismatches.push(`expected 20 roadmap gaps, observed ${failures.length}`);
  for (const [group, expectedCount] of expectedGroupCounts) {
    const actualCount = groupCounts.get(group) ?? 0;
    if (actualCount !== expectedCount) baselineMismatches.push(`${group}: expected ${expectedCount} gaps, observed ${actualCount}`);
  }
  for (const [group, actualCount] of groupCounts) {
    if (!expectedGroupCounts.has(group) && actualCount > 0) baselineMismatches.push(`${group}: unexpected baseline gaps ${actualCount}`);
  }
  for (const [key, expectedValue] of expectedObservations) {
    const actualValue = observationMap.get(key);
    if (actualValue !== expectedValue) baselineMismatches.push(`observation ${key}: expected ${expectedValue}, observed ${actualValue}`);
  }
  if (baselineMismatches.length > 0) {
    console.error("COMPARE_ROADMAP_SLICE0_BASELINE_MISMATCHES=" + baselineMismatches.length);
    for (const mismatch of baselineMismatches) console.error("- " + mismatch);
    process.exit(1);
  }
  console.log("COMPARE_ROADMAP_BASELINE_GAPS=" + failures.length);
  for (const [group, count] of expectedGroupCounts) console.log(`BASELINE_GAP_GROUP_${group}=${count}`);
  for (const failure of failures) console.log(`[BASELINE_GAP:${failure.group}] ${failure.detail}`);
  console.log("HALLEUS_COMPARE_ROADMAP_SLICE0_BASELINE=PASS");
  process.exit(0);
}

if (args.has("--expect-slice1")) {
  const expectedGroupCounts = new Map([
    ["builder", 6],
    ["birth-time", 2],
    ["result", 3],
    ["wheel", 1],
  ]);
  const expectedObservations = new Map([
    ["forceDynamic", false],
    ["usesFinalEditorialPage", false],
    ["opensChartInNewTab", true],
    ["usesNoonSentinel", true],
    ["consentIncludedInDisabled", false],
    ["historyAlwaysRendersSection", true],
  ]);
  const mismatches = [];
  if (failures.length !== 12) mismatches.push(`expected 12 remaining roadmap gaps after Slice 1, observed ${failures.length}`);
  for (const [group, expectedCount] of expectedGroupCounts) {
    const actualCount = groupCounts.get(group) ?? 0;
    if (actualCount !== expectedCount) mismatches.push(`${group}: expected ${expectedCount} gaps, observed ${actualCount}`);
  }
  for (const [group, actualCount] of groupCounts) {
    if (!expectedGroupCounts.has(group) && actualCount > 0) mismatches.push(`${group}: unexpected Slice 1 gaps ${actualCount}`);
  }
  for (const [key, expectedValue] of expectedObservations) {
    const actualValue = observationMap.get(key);
    if (actualValue !== expectedValue) mismatches.push(`observation ${key}: expected ${expectedValue}, observed ${actualValue}`);
  }
  if (mismatches.length > 0) {
    console.error("COMPARE_ROADMAP_SLICE1_MISMATCHES=" + mismatches.length);
    for (const mismatch of mismatches) console.error("- " + mismatch);
    process.exit(1);
  }
  console.log("COMPARE_ROADMAP_REMAINING_GAPS=" + failures.length);
  for (const [group, count] of expectedGroupCounts) console.log(`SLICE1_REMAINING_GAP_GROUP_${group}=${count}`);
  console.log("HALLEUS_COMPARE_ROADMAP_SLICE1=PASS");
  process.exit(0);
}

if (args.has("--expect-slice2")) {
  const expectedGroupCounts = new Map([
    ["result", 3],
    ["wheel", 1],
  ]);
  const expectedObservations = new Map([
    ["forceDynamic", false],
    ["usesFinalEditorialPage", false],
    ["opensChartInNewTab", false],
    ["usesNoonSentinel", false],
    ["consentIncludedInDisabled", true],
    ["historyAlwaysRendersSection", false],
  ]);
  const mismatches = [];
  if (failures.length !== 4) mismatches.push(`expected 4 remaining roadmap gaps after Slice 2, observed ${failures.length}`);
  for (const [group, expectedCount] of expectedGroupCounts) {
    const actualCount = groupCounts.get(group) ?? 0;
    if (actualCount !== expectedCount) mismatches.push(`${group}: expected ${expectedCount} gaps, observed ${actualCount}`);
  }
  for (const [group, actualCount] of groupCounts) {
    if (!expectedGroupCounts.has(group) && actualCount > 0) mismatches.push(`${group}: unexpected Slice 2 gaps ${actualCount}`);
  }
  for (const [key, expectedValue] of expectedObservations) {
    const actualValue = observationMap.get(key);
    if (actualValue !== expectedValue) mismatches.push(`observation ${key}: expected ${expectedValue}, observed ${actualValue}`);
  }
  if (mismatches.length > 0) {
    console.error("COMPARE_ROADMAP_SLICE2_MISMATCHES=" + mismatches.length);
    for (const mismatch of mismatches) console.error("- " + mismatch);
    process.exit(1);
  }
  console.log("COMPARE_ROADMAP_REMAINING_GAPS=" + failures.length);
  for (const [group, count] of expectedGroupCounts) console.log(`SLICE2_REMAINING_GAP_GROUP_${group}=${count}`);
  console.log("HALLEUS_COMPARE_ROADMAP_SLICE2=PASS");
  process.exit(0);
}

if (failures.length) {
  console.error("COMPARE_ROADMAP_FINAL_GAPS=" + failures.length);
  for (const [group, count] of groupCounts) console.error(`[${group}] ${count}`);
  for (const failure of failures) console.error(`- [${failure.group}] ${failure.detail}`);
  process.exit(1);
}

console.log("HALLEUS_COMPARE_ROADMAP_FINAL_CONTRACT=PASS");
