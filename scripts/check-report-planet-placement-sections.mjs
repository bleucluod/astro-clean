import fs from "node:fs";

const files = {
  reportCard: "components/ReportCard.tsx",
  reportDetail: "components/ReportDetail.tsx",
  component: "components/ReportPlanetPlacementSections.tsx",
  packageJson: "package.json",
};

function read(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${file}`);
  }
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function between(source, start, end, label) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert(startIndex >= 0 && endIndex > startIndex, `Unable to isolate ${label}.`);
  return source.slice(startIndex, endIndex);
}

const reportCard = read(files.reportCard);
const reportDetail = read(files.reportDetail);
const component = read(files.component);
const pkg = JSON.parse(read(files.packageJson));

for (const marker of [
  'import { ReportPlanetPlacementSections } from "./ReportPlanetPlacementSections";',
  '<ReportPlanetPlacementSections report={report} />',
  'shownAspects.length > 0',
]) {
  assert(reportCard.includes(marker), `ReportCard missing marker: ${marker}`);
}

const placementIndex = reportCard.indexOf('<ReportPlanetPlacementSections report={report} />');
const aspectsIndex = reportCard.indexOf('shownAspects.length > 0');
assert(
  placementIndex >= 0 && aspectsIndex >= 0 && placementIndex < aspectsIndex,
  "Standalone placement sections must render before aspect relationship section.",
);

for (const marker of [
  'data-halleus-report-planet-placement-sections="v0.1.259"',
  'data-halleus-report-placement-reference="v0.1.369"',
  'import type { ReportOutputSection } from "@/types/report-output";',
  'type ReportWithInterpretationSections = AstrologyReport & {',
  'const reportWithSections = report as ReportWithInterpretationSections;',
  'reportWithSections.interpretationSections ?? []',
  'hasThemeChapters',
  'section.id.startsWith("real-engine-theme-")',
  '"theme-reference" : "legacy-narrative"',
  'مرجع جایگاه‌های سیاره‌ای',
  'روایت اصلی و فصل‌های موضوعی بالاتر آمده‌اند',
  'ThemePlacementReference',
  'LegacyPlacementNarrative',
  'data-report-placement-reference-details="deduplicated"',
  'data-report-placement-legacy-details="full-narrative"',
  'PLANET_ORDER',
]) {
  assert(component.includes(marker), `ReportPlanetPlacementSections missing marker: ${marker}`);
}


assert(
  !component.includes("report.interpretationSections"),
  "Placement reference must use the narrow sectioned-report type bridge.",
);

const referenceBlock = between(
  component,
  "function ThemePlacementReference",
  "function LegacyPlacementNarrative",
  "theme placement reference block",
);
const legacyBlock = between(
  component,
  "function LegacyPlacementNarrative",
  "function getPlanetPlacements",
  "legacy placement narrative block",
);

for (const marker of ["interpretation?.focus", "interpretation?.smallExperiment"]) {
  assert(referenceBlock.includes(marker), `Theme reference missing distinct field: ${marker}`);
}
for (const forbidden of [
  "healthyExpression",
  "possibleFriction",
  "dailyLifeExample",
  "symbolicBody",
]) {
  assert(
    !referenceBlock.includes(forbidden),
    `Theme reference must not repeat narrative field: ${forbidden}`,
  );
  assert(
    legacyBlock.includes(forbidden),
    `Legacy reports must preserve narrative field: ${forbidden}`,
  );
}

assert(
  reportDetail.includes('["planet-placements", "مرجع سیاره‌ها"]'),
  "Live report navigation must label the deduplicated placement reference.",
);
assert(
  reportDetail.includes('<ReportPlanetPlacementSections report={report} />'),
  "Live report must preserve the placement reference section.",
);

assert(
  component.includes(
    "روایت اصلی و فصل‌های موضوعی بالاتر آمده‌اند؛ این بخش فقط جایگاه، خانه، حرکت و یک آزمایش کوچک را برای مرور سریع نگه می‌دارد.",
  ),
  "Theme reference copy must preserve readable Persian spacing.",
);
assert(
  component.includes(
    "هر کارت یک الگوی قابل مشاهده، یک گیر محتمل و یک تمرین کوتاه را نشان می‌دهد.",
  ),
  "Legacy placement copy must remain readable and complete.",
);
for (const collapsedCopy of ["جایگاه،خانه", "رانشان"]) {
  assert(
    !component.includes(collapsedCopy),
    "Placement copy contains collapsed words: " + collapsedCopy,
  );
}

assert(
  pkg.scripts?.["check:report-planet-placement-sections"] ===
    "node scripts/check-report-planet-placement-sections.mjs",
  "package.json missing check:report-planet-placement-sections script.",
);
for (const scriptName of ["check:reports", "check:project"]) {
  const script = pkg.scripts?.[scriptName] ?? "";
  assert(
    script.includes("check:report-planet-placement-sections"),
    `package.json ${scriptName} does not include placement guard.`,
  );
}

console.log("Report planet placement sections guard passed.");
console.log("- new reports use a compact placement reference after thematic narrative");
console.log("- repeated healthy/friction/example/body fields stay out of reference mode");
console.log("- older stored reports keep the full legacy placement narrative");
