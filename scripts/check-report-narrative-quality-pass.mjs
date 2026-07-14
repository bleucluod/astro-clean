import fs from "node:fs";

const files = {
  synthesis: "components/ReportSynthesisSection.tsx",
  placements: "components/ReportPlanetPlacementSections.tsx",
  aspects: "components/ReportAspectRelationshipSections.tsx",
  specialPoints: "components/ReportSpecialPointsNarrativeSection.tsx",
  personalTransit: "components/PersonalTransitReportSection.tsx",
  packageJson: "package.json",
  context: "docs/HALLEUS_PROJECT_CONTEXT.md",
  ideaGarden: "docs/HALLEUS_IDEA_GARDEN.md",
  audit: "docs/HALLEUS_ENGINE_REALITY_AUDIT.md",
  plan: "docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md",
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
  "aspect-bridge",
  "data-halleus-behavioral-aspect-core",
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
  "یک داستان جدا، قطعی یا اغراق‌شده",
  "کنار جایگاه‌ها و رابطه‌های سیاره‌ای",
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

for (const docPath of [
  files.context,
  files.ideaGarden,
  files.audit,
  files.plan,
]) {
  const doc = read(docPath);
  assert(
    doc.includes("v0.1.263 Report narrative quality pass"),
    `${docPath} missing v0.1.263 narrative note.`,
  );
  assert(
    doc.includes("report narrative quality pass"),
    `${docPath} missing lowercase narrative marker.`,
  );
}

console.log("Report narrative quality pass guard passed.");
