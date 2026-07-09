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
  assert(synthesis.includes(marker), `ReportSynthesisSection missing marker: ${marker}`);
}

for (const marker of [
  "placement-bridge",
  "اول هر سیاره را جدا",
  "aspectها توضیح می‌دهند",
  "for-dummies",
]) {
  assert(placements.includes(marker), `ReportPlanetPlacementSections missing narrative marker: ${marker}`);
}

for (const marker of [
  "aspect-bridge",
  "دستور زبان",
  "هدف این بخش عمق خواندن است",
]) {
  assert(aspects.includes(marker), `ReportAspectRelationshipSections missing narrative marker: ${marker}`);
}

for (const marker of [
  "special-points-bridge",
  "نه به‌عنوان یک داستان جدا و اغراق‌شده",
  "کنار placementها و aspectها",
]) {
  assert(specialPoints.includes(marker), `ReportSpecialPointsNarrativeSection missing narrative marker: ${marker}`);
}

for (const marker of [
  "ترنزیت قرار نیست یک گزارش جدا باشد",
  "کنار placementها، aspectها و special points بخوان",
  "هالیوس تهران را بی‌اجازه جایگزین محل فعلی نمی‌کند",
]) {
  assert(personalTransit.includes(marker), `PersonalTransitReportSection missing narrative marker: ${marker}`);
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

for (const docPath of [files.context, files.ideaGarden, files.audit, files.plan]) {
  const doc = read(docPath);
  assert(doc.includes("v0.1.263 Report narrative quality pass"), `${docPath} missing v0.1.263 narrative note.`);
  assert(doc.includes("report narrative quality pass"), `${docPath} missing lowercase narrative marker.`);
}

console.log("Report narrative quality pass guard passed.");
