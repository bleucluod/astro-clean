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
  "buildStructuredSectionBody",
  "buildFinalSynthesisClosing",
  "نقشه راه خوانش",
  "تمرین پایانی برای خواندن گزارش",
  "خورشید و رایزینگ را کنار هم بخوان",
  "real-engine-overview",
  "real-engine-reflection-prompts",
  "SIGN_COPY",
  "PLANET_COPY",
  "CORE_PLACEMENT_STORY",
  "PERSONAL_PLANET_STORY",
  "ASPECT_STORY",
  "buildAspectDetailText",
  "buildAspectReflectionText",
  "این بخش فقط یک برچسب شخصیتی نیست",
  "این لایه درباره",
  "گفت‌وگوی درونی",
  "اصطکاک سازنده",
  "پرسش تأملی",
  "پرسش تأملی: عطارد",
  "پرسش تأملی: زهره",
  "پرسش تأملی: مریخ",
  "برای خواندن این گزارش",
  "هالیوس",
]) {
  assertIncludes(writer, marker, "lib/astrology/real-engine-report-writer.ts");
}

for (const forbiddenMarker of ["Halleus"]) {
  if (writer.includes(forbiddenMarker)) {
    throw new Error(
      `lib/astrology/real-engine-report-writer.ts still contains English brand marker in Persian report text: ${forbiddenMarker}`,
    );
  }
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
