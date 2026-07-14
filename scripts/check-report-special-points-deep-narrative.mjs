import fs from "node:fs";

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const reportCard = read("components/ReportCard.tsx");
const component = read("components/ReportSpecialPointsNarrativeSection.tsx");
const pkg = JSON.parse(read("package.json"));
const reportsScript = pkg.scripts?.["check:reports"] ?? "";
const projectScript = pkg.scripts?.["check:project"] ?? "";

assert(
  reportCard.includes("ReportSpecialPointsNarrativeSection"),
  "ReportCard must import and render ReportSpecialPointsNarrativeSection.",
);
assert(
  reportCard.indexOf("<ReportPlanetPlacementSections report={report} />") <
    reportCard.indexOf("<ReportSpecialPointsNarrativeSection report={report} />"),
  "Planet placement sections must appear before special points narrative.",
);

for (const marker of [
  "data-special-points-deep-narrative",
  "v0.1.262-report-special-points-deep-narrative",
  "data-special-points-final-qa",
  "v0.1.288-report-special-points-transit-final-qa",
  "دست‌های ماه — الگوی آشنا، انتخاب تازه",
  "<summary>جزئیات فنی لیلیت</summary>",
  "دست شمالی ماه",
  "دست جنوبی ماه",
  "buildLilithNarrativeCard",
  "lilith.approvedForReportOutput !== true",
  "buildLilithBoundaryCard",
  "جایگاه محاسبه‌شده؛ روایت غیرفعال",
  "local-true-osculating-black-moon-lilith",
  "مدل میانگین",
  "سیارک ۱۱۸۱",
  "دارک‌مون/والدماث",
]) {
  assert(component.includes(marker), `Missing component marker: ${marker}`);
}

assert(
  pkg.scripts?.["check:report-special-points-deep-narrative"] ===
    "node scripts/check-report-special-points-deep-narrative.mjs",
  "package.json must expose check:report-special-points-deep-narrative.",
);
assert(
  reportsScript.includes("pnpm run check:report-special-points-deep-narrative"),
  "check:reports must include the special-points guard.",
);
assert(
  projectScript.includes("pnpm run check:report-special-points-deep-narrative"),
  "check:project must include the special-points guard.",
);

console.log("Report special points deep narrative guard passed.");
