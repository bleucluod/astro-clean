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
const service = read("lib/report-generation/report-generation-service.ts");
const reportV3 = read("lib/report-output/report-v3.ts");

for (const marker of [
  "enrichReportWithRealEngineCopy",
  "buildRealEngineSummary",
  "buildCorePlacementText(sun, \"sun\")",
  "buildCorePlacementText(moon, \"moon\")",
  "buildRisingText(",
  "buildHouseContextText(realEngine.houseContext, risingSign)",
  "buildHouseAnglesText(realEngineWithAspects)",
  "buildNatalAccuracyText(realEngineWithAspects)",
  "buildOptionalPlacementText(mercury, \"mercury\")",
  "buildOptionalPlacementText(venus, \"venus\")",
  "buildOptionalPlacementText(mars, \"mars\")",
  "buildFirstSynthesisText(",
  "buildIntegrationText(",
  "buildRealEngineSynthesisPlan",
  "buildSynthesisAspectBridge",
  "buildSynthesisParticipantPhrase",
  "buildRealEngineInterpretationSections",
  "buildStructuredSectionBody",
  "readerCueText",
  "چطور بخوانی",
  "نشانه‌های محاسبه‌شده این بخش:",
  "buildFinalSynthesisClosing",
  "buildSynthesisGrowthLanguage",
  "trimSentenceEnd(buildPlacementGrowthPractice",
  "!CORE_SPINE_IDS.has(chartSpine.chartRulerId)",
  "buildChartPracticeList",
  "buildSynthesisPracticeItems",
  "getRealEngineSynthesisRoles",
  "buildActiveHousesText",
  "buildChartRulerText",
  "buildChartSpine",
  "real-engine-first-synthesis",
  "real-engine-core-pattern",
  "real-engine-chart-ruler",
  "real-engine-active-houses",
  "real-engine-daily-life",
  "real-engine-node-axis",
  "real-engine-balance",
  "real-engine-personal-summary",
  "SIGN_COPY",
  "PLANET_COPY",
  "HOUSE_COPY",
  "buildAspectBehavioralInterpretation", "buildWriterAspectInterpretation", "buildSynthesisPracticeItems",
  "buildPlanetHouseSentence",
  "toPersianNumber",
  "از نظر خانه‌ها",
  "رابطه‌های سیاره‌ای",
  "گفت‌وگوی درونی",
  "برای تأمل",
  "تمرین این هفته",
  "کشمکش اصلی",
  "منبع همراه",
  "ترجمهٔ روزمره",
  "دست‌های ماه",
  "لیلیت در این نسخه محاسبه نمی‌شود",
  "دقت این گزارش به ساعت تولد",
  "هالیوس",
]) {
  assertIncludes(writer, marker, "lib/astrology/real-engine-report-writer.ts");
}

for (const forbiddenMarker of ["Halleus", "const ASPECT_STORY"]) {
  if (writer.includes(forbiddenMarker)) {
    throw new Error(
      `lib/astrology/real-engine-report-writer.ts still contains English brand marker in Persian report text: ${forbiddenMarker}`,
    );
  }
}

for (const marker of [
  "calculateRealEngineAspects(realEngine.placements)",
  "buildAspectOverviewText(synthesisPlan, realEngineWithAspects)",
  "aspects: allAspects",
  "aspectHighlights,",
  "realEngine: realEngineWithAspects",
]) {
  assertIncludes(writer, marker, "lib/astrology/real-engine-report-writer.ts");
}

for (const marker of [
  "toRealEnginePlacement(placement, chartReportEnrichment)",
  "chartReportEnrichment?.placements.find",
  "house,",
]) {
  assertIncludes(service, marker, "lib/report-generation/report-generation-service.ts");
}

for (const marker of [
  "RealEngineReportPlacement",
  "house?: number | null",
  "RealEngineReportSnapshot",
  "RealEngineReportHouseContext",
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
