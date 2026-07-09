import fs from "node:fs";

const REPORT_STRUCTURE_ORDER_POLISH_VERSION = "v0.1.264-report-structure-order-polish";

const files = {
  reportCard: "components/ReportCard.tsx",
  packageJson: "package.json",
  projectContext: "docs/HALLEUS_PROJECT_CONTEXT.md",
  ideaGarden: "docs/HALLEUS_IDEA_GARDEN.md",
  realityAudit: "docs/HALLEUS_ENGINE_REALITY_AUDIT.md",
  unificationPlan: "docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md",
};

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const reportCard = read(files.reportCard);

for (const marker of [
  REPORT_STRUCTURE_ORDER_POLISH_VERSION,
  "report-technical-details-section",
  "جزئیات فنی چارت",
  "باز کردن داده‌های دقیق، خانه‌ها و جدول‌های پشتوانه",
  'id="personal-note"',
  "این صفحه مثل یک مسیر خواندن اپلیکیشنی چیده شده است",
]) {
  assert(reportCard.includes(marker), `ReportCard is missing marker: ${marker}`);
}

assert(!reportCard.includes("<p><ReportSynthesisSection"), "ReportSynthesisSection must not be wrapped inside a paragraph.");
assert(!reportCard.includes("روایت اصلی پایین صفحه می‌آید"), "Hero copy must not say the main narrative is lower on the page.");

const orderMarkers = [
  ["<ReportSynthesisSection", "synthesis"],
  ["<ReportDetailFactsPanel", "quick facts"],
  ["<PersonalTransitReportSection", "personal transit"],
  ['className="report-section report-core-section"', "core cards"],
  ["<ReportPlanetPlacementSections", "planet placements"],
  ["<ReportAspectRelationshipSections", "aspect relationship sections"],
  ['className="report-section report-aspect-section"', "aspect summary"],
  ["<ReportSpecialPointsNarrativeSection", "special points"],
  ["report-technical-details-section", "technical details"],
  ['id="personal-note"', "safety note"],
];

const positions = orderMarkers.map(([needle, label]) => {
  const index = reportCard.indexOf(needle);
  assert(index >= 0, `ReportCard missing order marker: ${label}`);
  return { label, index };
});

for (let i = 1; i < positions.length; i += 1) {
  assert(
    positions[i - 1].index < positions[i].index,
    `Report order is wrong: ${positions[i - 1].label} must come before ${positions[i].label}`,
  );
}

const pkg = JSON.parse(read(files.packageJson));
assert(
  pkg.scripts?.["check:report-structure-order-polish"] ===
    "node scripts/check-report-structure-order-polish.mjs",
  "package.json must expose check:report-structure-order-polish.",
);

for (const scriptName of ["check:reports", "check:project"]) {
  assert(
    typeof pkg.scripts?.[scriptName] === "string" &&
      pkg.scripts[scriptName].includes("pnpm run check:report-structure-order-polish"),
    `${scriptName} must include the report structure/order polish guard.`,
  );
  assert(!pkg.scripts[scriptName].includes("pnpmrun"), `${scriptName} contains broken pnpmrun spacing.`);
  assert(!pkg.scripts[scriptName].includes("runcheck:"), `${scriptName} contains broken runcheck spacing.`);
}

for (const doc of [
  files.projectContext,
  files.ideaGarden,
  files.realityAudit,
  files.unificationPlan,
]) {
  const text = read(doc);
  assert(text.includes("v0.1.264 Report Structure Order Polish"), `${doc} missing v0.1.264 note.`);
  assert(text.includes("report structure order polish"), `${doc} missing lowercase structure marker.`);
}

console.log("Report structure/order polish guard passed.");
