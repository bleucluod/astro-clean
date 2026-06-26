import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function assertIncludes(content, marker, label) {
  if (!content.includes(marker)) {
    throw new Error(`${label} is missing marker: ${marker}`);
  }
}

const types = read("types/astro.ts");
const aspectLib = read("lib/astrology/real-engine-aspects.ts");
const writer = read("lib/astrology/real-engine-report-writer.ts");
const reportCard = read("components/ReportCard.tsx");
const packageJson = read("package.json");

for (const marker of [
  "RealEngineReportAspectKind",
  "RealEngineReportAspect",
  "aspects?: RealEngineReportAspect[];",
]) {
  assertIncludes(types, marker, "types/astro.ts");
}

for (const marker of [
  "calculateRealEngineAspects",
  "calculateAngularSeparation",
  "buildAspectNarrative",
  "conjunction",
  "sextile",
  "square",
  "trine",
  "opposition",
]) {
  assertIncludes(aspectLib, marker, "lib/astrology/real-engine-aspects.ts");
}

for (const marker of [
  "calculateRealEngineAspects(realEngine.placements)",
  "buildAspectOverviewText(aspects)",
  "realEngine: realEngineWithAspects",
]) {
  assertIncludes(writer, marker, "lib/astrology/real-engine-report-writer.ts");
}

for (const marker of [
  "const realEngineAspects = report.realEngine?.aspects ?? [];",
  "realEngineAspects.length > 0",
  "روابط سیاره‌ها",
  "aspect.narrative",
]) {
  assertIncludes(reportCard, marker, "components/ReportCard.tsx");
}

assertIncludes(
  packageJson,
  "\"check:real-aspect-narrative\"",
  "package.json",
);

console.log("real aspect narrative check passed");
