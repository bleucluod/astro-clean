// HALLEUS_DEEP_NARRATIVE_SLICE5_NARRATIVE_QUALITY_OWNER_RECONCILIATION_R7_20260903
// HALLEUS_DEEP_NARRATIVE_SLICE5_AUTHORITY_DOC_DECOUPLING_R12_20260903
import fs from "node:fs";

const files = {
  synthesis: "components/ReportSynthesisSection.tsx",
  placements: "components/ReportPlanetPlacementSections.tsx",
  aspects: "components/ReportAspectRelationshipSections.tsx",
  specialPoints: "components/ReportSpecialPointsNarrativeSection.tsx",
  personalTransit: "components/PersonalTransitReportSection.tsx",
  packageJson: "package.json",
};

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const synthesis = read(files.synthesis);
const placements = read(files.placements);
const aspects = read(files.aspects);
const specialPoints = read(files.specialPoints);
const personalTransit = read(files.personalTransit);
const pkg = JSON.parse(read(files.packageJson));
const reportsScript = pkg.scripts?.["check:reports"] ?? "";
const projectScript = pkg.scripts?.["check:project"] ?? "";

for (const marker of [
  "v0.1.263-report-narrative-quality-pass",
  "data-report-narrative-quality-pass",
  "مسیر خواندن گزارش",
  "کارت‌های جدا",
  "پیوسته‌تر",
]) {
  assert(
    synthesis.includes(marker),
    `ReportSynthesisSection missing marker: ${marker}`,
  );
}

for (const marker of [
  "placement-bridge",
  "for-dummies",
  "data-halleus-behavioral-placement-core",
  "buildPlacementBehavioralInterpretation",
  "isBehavioralPlacementInput",
]) {
  assert(
    placements.includes(marker),
    `ReportPlanetPlacementSections missing behavioral structure marker: ${marker}`,
  );
}

for (const forbiddenMarker of ["const PLANET_COPY", "const SIGN_COPY"]) {
  assert(
    !placements.includes(forbiddenMarker),
    `ReportPlanetPlacementSections still owns duplicate semantic dictionary: ${forbiddenMarker}`,
  );
}

for (const marker of [
  'data-report-aspect-relationship-sections="human-first"',
  "buildAspectBehavioralInterpretation",
  "isBehavioralAspectInput",
]) {
  assert(
    aspects.includes(marker),
    `ReportAspectRelationshipSections missing behavioral structure marker: ${marker}`,
  );
}

for (const forbiddenMarker of ["const ASPECT_META_BY_KIND"]) {
  assert(
    !aspects.includes(forbiddenMarker),
    `ReportAspectRelationshipSections still owns duplicate semantic dictionary: ${forbiddenMarker}`,
  );
}

for (const marker of [
  "special-points-bridge",
  "دست‌های ماه — الگوی آشنا، انتخاب تازه",
]) {
  assert(
    specialPoints.includes(marker),
    `ReportSpecialPointsNarrativeSection missing narrative marker: ${marker}`,
  );
}

for (const marker of [
  "این بخش آسمانی را که هنگام ساخت گزارش ثبت شده",
  "سیاره‌ای و نقاط ویژه بخوان",
  "هالیوس تهران را بی‌اجازه جایگزین محل فعلی نمی‌کند",
]) {
  assert(
    personalTransit.includes(marker),
    `PersonalTransitReportSection missing narrative marker: ${marker}`,
  );
}

assert(
  pkg.scripts?.["check:report-narrative-quality-pass"] ===
    "node scripts/check-report-narrative-quality-pass.mjs",
  "package.json must expose check:report-narrative-quality-pass.",
);
assert(
  reportsScript.includes("pnpm run check:report-narrative-quality-pass"),
  "check:reports must include the narrative quality pass guard.",
);
assert(
  projectScript.includes("pnpm run check:report-narrative-quality-pass"),
  "check:project must include the narrative quality pass guard.",
);

console.log("Report narrative quality pass guard passed.");
