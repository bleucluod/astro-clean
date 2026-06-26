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
  "SIGN_COPY",
  "PLANET_COPY",
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

console.log("real engine report writer check passed");
