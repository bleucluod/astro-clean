import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const failures = [];
function assert(condition, message) { if (!condition) failures.push(message); }
function includesAll(label, text, markers) { for (const marker of markers) assert(text.includes(marker), `${label} missing marker: ${marker}`); }
function excludesAll(label, text, markers) { for (const marker of markers) assert(!text.includes(marker), `${label} must not include marker: ${marker}`); }

const pkg = JSON.parse(read("package.json"));
const types = read("types/astro.ts");
const engine = read("src/lib/chart/real-chart-engine.ts");
const reportCard = read("components/ReportCard.tsx");
const reportDetail = read("components/ReportDetail.tsx");
const specialPoints = read("components/ReportSpecialPointsNarrativeSection.tsx");
const transitSection = read("components/PersonalTransitReportSection.tsx");
const transitBridge = read("src/lib/report-output/personal-transit-report-data-bridge.ts");
const writer = read("lib/astrology/real-engine-report-writer.ts");
const service = read("lib/report-generation/report-generation-service.ts");

assert(pkg.scripts?.["check:report-special-points-transit-final-qa"] === "node scripts/check-report-special-points-transit-final-qa.mjs", "package.json missing final QA guard script.");
for (const scriptName of ["check:reports", "check:project"]) {
  assert(pkg.scripts?.[scriptName]?.includes("pnpm run check:report-special-points-transit-final-qa"), `${scriptName} must include final QA guard.`);
}

includesAll("Lilith calculation/output gate", types + engine, [
  'lilithType: "local-true-osculating-black-moon-lilith"',
  "approvedForReportOutput: false",
]);
includesAll("Lilith technical-only report contract", reportCard + specialPoints + writer + service, [
  "نمایش محدود داده؛ روایت تفسیری این گزارش فعال نیست",
  "lilith.approvedForReportOutput !== true",
  "buildLilithBoundaryCard",
  "جایگاه محاسبه‌شده؛ روایت غیرفعال",
  "مجوز ورود به روایت تفسیری این گزارش فعال نیست",
  "تا وقتی مجوز خروجی فعال نیست وارد روایت تفسیری نمی‌شود",
]);
excludesAll("Lilith forbidden overclaims", reportCard + specialPoints + writer, [
  "لیلیت سرنوشت قطعی",
  "کشش جنسی پنهان",
  "زخم تاریک",
  "سایه قطعی",
]);

includesAll("model-aware lunar node contract", reportCard + specialPoints + writer, [
  "مدل میانگین",
  "مدل نوسانی/واقعی محلی",
  "getLunarNodeModelLabel",
  "formatNodeSource",
  "این محور حکم قطعی درباره گذشته یا آینده نیست",
]);
excludesAll("fixture-specific lunar node branches", writer, [
  'lunarNodes.northNode.signId === "libra"',
  'lunarNodes.northNode.signId === "leo"',
]);

includesAll("stored personal transit trust contract", transitBridge + transitSection + reportDetail, [
  "v0.1.288-personal-transit-trust-boundary",
  "transitLocalDate",
  "sampleLocalTime",
  "currentResidenceUtcIso",
  "must not be relabeled as today",
  "formatTransitLocalDate",
  "آسمان زمان ساخت گزارش نسبت به چارت تولد تو",
  "آسمان زمان گزارش",
  "هنگام بازکردن گزارش قدیمی داده‌ی تازه‌ای جایگزین نمی‌کند",
]);
excludesAll("stale personal transit labels", transitSection + reportDetail, [
  "آسمان امروز نسبت به چارت تولد تو",
  "ترنزیت امروز برای چارت تولد",
  "امروز کدام بخش‌های چارت تولد تو روشن‌تر می‌شود؟",
  "placementها",
  "aspectها",
  "special points",
  "deferred",
]);

for (const depName of ["sweph", "swisseph", "pyswisseph", "swiss-ephemeris", "astrologia"]) {
  assert(!pkg.dependencies?.[depName] && !pkg.devDependencies?.[depName] && !pkg.optionalDependencies?.[depName], `unapproved runtime dependency present: ${depName}`);
}

for (const file of [
  "docs/HALLEUS_PROJECT_CONTEXT.md",
  "docs/HALLEUS_IDEA_GARDEN.md",
  "docs/HALLEUS_ENGINE_REALITY_AUDIT.md",
  "docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md",
]) {
  includesAll(file, read(file), [
    "v0.1.288 report special-points/transit final QA",
    "Report Cleanup Batch 5",
    "stored transit snapshot",
    "Lilith technical position",
    "model-aware lunar-node",
  ]);
}

if (failures.length > 0) {
  console.error("Report special-points/transit final QA failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Report special-points/transit final QA passed.");
console.log("- Lilith stays technical-only while approvedForReportOutput is false");
console.log("- lunar-node labels and narrative follow the stored model");
console.log("- saved transit data keeps its stored date instead of being relabeled today");
