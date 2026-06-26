import { existsSync, readFileSync } from "node:fs";

function readFile(path) {
  if (!existsSync(path)) {
    throw new Error(`Missing required file: ${path}`);
  }

  return readFileSync(path, "utf8");
}

function assertIncludes(source, marker, label) {
  if (!source.includes(marker)) {
    throw new Error(`${label} is missing marker: ${marker}`);
  }
}

function assertIncludesAny(source, markers, label) {
  if (!markers.some((marker) => source.includes(marker))) {
    throw new Error(`${label} is missing one of markers: ${markers.join(" | ")}`);
  }
}

const types = readFile("types/astro.ts");
const aspects = readFile("lib/astrology/real-engine-aspects.ts");
const writer = readFile("lib/astrology/real-engine-report-writer.ts");
const reportCard = readFile("components/ReportCard.tsx");
const packageJson = readFile("package.json");

assertIncludes(types, "export type RealEngineReportAspectKind", "types/astro.ts");
assertIncludes(types, "export type RealEngineReportAspect", "types/astro.ts");
assertIncludes(types, "aspects?: RealEngineReportAspect[]", "types/astro.ts");

for (const aspectId of [
  "conjunction",
  "sextile",
  "square",
  "trine",
  "opposition",
]) {
  assertIncludes(aspects, aspectId, "lib/astrology/real-engine-aspects.ts");
}

assertIncludes(
  aspects,
  "calculateRealEngineReportAspects",
  "lib/astrology/real-engine-aspects.ts",
);
assertIncludes(aspects, "narrative", "lib/astrology/real-engine-aspects.ts");
assertIncludes(aspects, "separation", "lib/astrology/real-engine-aspects.ts");
assertIncludes(aspects, "orb", "lib/astrology/real-engine-aspects.ts");

assertIncludes(
  writer,
  "calculateRealEngineReportAspects",
  "lib/astrology/real-engine-report-writer.ts",
);
assertIncludesAny(
  writer,
  ["aspects:", "aspects,", "aspects ??"],
  "lib/astrology/real-engine-report-writer.ts",
);
assertIncludes(
  writer,
  "realEngine.placements",
  "lib/astrology/real-engine-report-writer.ts",
);

assertIncludes(
  reportCard,
  "report.realEngine?.aspects",
  "components/ReportCard.tsx",
);
assertIncludes(reportCard, "aspect.narrative", "components/ReportCard.tsx");
assertIncludes(reportCard, "aspect.aspectLabel", "components/ReportCard.tsx");
assertIncludes(reportCard, "aspect.orb", "components/ReportCard.tsx");
assertIncludesAny(
  reportCard,
  ["report-aspect-card", "report-aspect", "aspect-card", "aspect.narrative"],
  "components/ReportCard.tsx",
);

assertIncludes(
  packageJson,
  '"check:real-aspect-narrative"',
  "package.json",
);

console.log("real aspect narrative check passed");
