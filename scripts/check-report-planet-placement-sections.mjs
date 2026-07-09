import fs from "node:fs";

const files = {
  reportCard: "components/ReportCard.tsx",
  component: "components/ReportPlanetPlacementSections.tsx",
  packageJson: "package.json",
  ideaGarden: "docs/HALLEUS_IDEA_GARDEN.md",
  context: "docs/HALLEUS_PROJECT_CONTEXT.md",
  audit: "docs/HALLEUS_ENGINE_REALITY_AUDIT.md",
  plan: "docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md",
};

function read(path) {
  if (!fs.existsSync(path)) {
    throw new Error(`Missing required file: ${path}`);
  }
  return fs.readFileSync(path, "utf8");
}

const reportCard = read(files.reportCard);
const component = read(files.component);
const pkg = JSON.parse(read(files.packageJson));
const docs = [files.ideaGarden, files.context, files.audit, files.plan].map(read);

const requiredReportCardMarkers = [
  'import { ReportPlanetPlacementSections } from "./ReportPlanetPlacementSections";',
  '<ReportPlanetPlacementSections report={report} />',
  'shownAspects.length > 0',
];

for (const marker of requiredReportCardMarkers) {
  if (!reportCard.includes(marker)) {
    throw new Error(`ReportCard missing marker: ${marker}`);
  }
}

const placementIndex = reportCard.indexOf('<ReportPlanetPlacementSections report={report} />');
const aspectsIndex = reportCard.indexOf('shownAspects.length > 0');
if (placementIndex < 0 || aspectsIndex < 0 || placementIndex > aspectsIndex) {
  throw new Error("Standalone placement sections must render before aspect relationship section.");
}

const requiredComponentMarkers = [
  'data-halleus-report-planet-placement-sections="v0.1.259"',
  'خورشید',
  'ماه',
  'ویژگی‌های روشن',
  'چالش‌ها',
  'علایق و کشش‌ها',
  'مثال ساده',
  'آناتومی نمادین',
  'تشخیص پزشکی نیست',
  'PLANET_ORDER',
];

for (const marker of requiredComponentMarkers) {
  if (!component.includes(marker)) {
    throw new Error(`ReportPlanetPlacementSections missing marker: ${marker}`);
  }
}

if (pkg.scripts?.["check:report-planet-placement-sections"] !== "node scripts/check-report-planet-placement-sections.mjs") {
  throw new Error("package.json missing check:report-planet-placement-sections script.");
}

for (const scriptName of ["check:reports", "check:project"]) {
  const script = pkg.scripts?.[scriptName] ?? "";
  if (!script.includes("check:report-planet-placement-sections")) {
    throw new Error(`package.json ${scriptName} does not include check:report-planet-placement-sections.`);
  }
}

for (const doc of docs) {
  if (!doc.includes("v0.1.259")) {
    throw new Error("Authority docs must mention v0.1.259.");
  }
  if (!doc.includes("standalone planet placement")) {
    throw new Error("Authority docs must mention standalone planet placement scope.");
  }
}

console.log("Report planet placement sections guard passed.");
