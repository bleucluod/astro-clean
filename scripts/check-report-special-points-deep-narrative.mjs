import fs from "node:fs";

const files = {
  reportCard: "components/ReportCard.tsx",
  component: "components/ReportSpecialPointsNarrativeSection.tsx",
  packageJson: "package.json",
  projectContext: "docs/HALLEUS_PROJECT_CONTEXT.md",
  ideaGarden: "docs/HALLEUS_IDEA_GARDEN.md",
  realityAudit: "docs/HALLEUS_ENGINE_REALITY_AUDIT.md",
  unificationPlan: "docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md",
};

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const reportCard = read(files.reportCard);
const component = read(files.component);
const pkg = JSON.parse(read(files.packageJson));
const reportsScript = pkg.scripts?.["check:reports"] ?? "";
const projectScript = pkg.scripts?.["check:project"] ?? "";

assert(
  reportCard.includes("ReportSpecialPointsNarrativeSection"),
  "ReportCard must import and render ReportSpecialPointsNarrativeSection.",
);
assert(
  reportCard.indexOf("<ReportSpecialPointsNarrativeSection report={report} />") <
    reportCard.indexOf("<ReportPlanetPlacementSections report={report} />"),
  "Special points narrative must appear before standalone planet placement sections.",
);

for (const marker of [
  "data-special-points-deep-narrative",
  "v0.1.262-report-special-points-deep-narrative",
  "لیلیت و دست‌های ماه",
  "دست شمالی ماه",
  "دست جنوبی ماه",
  "لیلیت: مرز، سایه و میل خام",
  "True/Osculating",
  "Mean",
  "local-true-osculating-black-moon-lilith",
  "سیارک ۱۱۸۱",
  "دارک‌مون/والدماث",
  "نه حکم قطعی",
  "حکم قطعی روان‌شناختی یا پزشکی نمی‌دهد",
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
  "check:reports must include the special-points deep narrative guard.",
);
assert(
  projectScript.includes("pnpm run check:report-special-points-deep-narrative"),
  "check:project must include the special-points deep narrative guard.",
);

for (const file of [
  files.projectContext,
  files.ideaGarden,
  files.realityAudit,
  files.unificationPlan,
]) {
  assert(
    read(file).includes("report special points deep narrative"),
    `${file} missing report special points deep narrative marker.`,
  );
}

console.log("Report special points deep narrative guard passed.");
