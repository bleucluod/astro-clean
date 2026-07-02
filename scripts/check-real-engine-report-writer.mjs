import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function assertIncludes(content, marker, label) {
  if (!content.includes(marker)) {
    throw new Error(`${label} is missing marker: ${marker}`);
  }
}

const writer = read("lib/astrology/real-engine-report-writer.ts");
const types = read("types/astro.ts");
const reportV3 = read("lib/report-output/report-v3.ts");

for (const marker of [
  "enrichReportWithRealEngineCopy",
  "buildRealEngineSummary",
  "buildCorePlacementText(sun, \"sun\")",
  "buildCorePlacementText(moon, \"moon\")",
  "buildRisingText(risingSign, realEngine.ascendantLongitude)",
  "buildOptionalPlacementText(mercury, \"mercury\")",
  "buildOptionalPlacementText(venus, \"venus\")",
  "buildOptionalPlacementText(mars, \"mars\")",
  "buildIntegrationText(realEngineWithAspects)",
  "buildRealEngineInterpretationSections",
  "real-engine-overview",
  "real-engine-reflection-prompts",
  "SIGN_COPY",
  "PLANET_COPY",
  "CORE_PLACEMENT_STORY",
  "این بخش فقط یک برچسب شخصیتی نیست",
  "پرسش تأملی",
  "برای خواندن این گزارش",
]) {
  assertIncludes(writer, marker, "lib/astrology/real-engine-report-writer.ts");
}

for (const marker of [
  "calculateRealEngineAspects(realEngine.placements)",
  "buildAspectOverviewText(aspects)",
  "realEngine: realEngineWithAspects",
]) {
  assertIncludes(writer, marker, "lib/astrology/real-engine-report-writer.ts");
}

for (const marker of [
  "RealEngineReportPlacement",
  "RealEngineReportSnapshot",
  "RealEngineReportAspect",
]) {
  assertIncludes(types, marker, "types/astro.ts");
}


for (const marker of [
  "hasRealEngineReportText",
  "section.id.startsWith(\"real-engine-\")",
  "!isRealEngineReportText",
  "Math.max(v2Report.outputQuality?.score ?? 0, 88)",
]) {
  assertIncludes(reportV3, marker, "lib/report-output/report-v3.ts");
}

console.log("real engine report writer check passed");
