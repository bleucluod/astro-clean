import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function count(text, marker) {
  return text.split(marker).length - 1;
}

const writer = read("lib/astrology/real-engine-report-writer.ts");
const sampleQa = read("scripts/check-report-sample-qa.mjs");
const packageJson = JSON.parse(read("package.json"));
const projectContext = read("docs/HALLEUS_PROJECT_CONTEXT.md");
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");

assert(count(writer, "readerCue:") === 3, "Batch 1 must keep exactly one general guide plus active-house and node guides.");
assert(count(writer, "chapterSummary:") === 2, "Batch 1 must keep chapter summaries only for active houses and lunar nodes.");
assert(writer.includes("const activeHouseBody = joinSectionBody(\n    input.activeHouseText,\n    input.houseText,\n  );"), "Active-house narrative must contain only top active houses and the short house-system handoff.");
assert(!writer.includes("input.houseAnglesText,\n    input.natalAccuracyText"), "Technical angles and natal-accuracy copy must stay out of the main narrative.");
assert(writer.includes('title: "نخ اصلی این چارت"'), "The opening section title must stay short.");
assert(writer.includes('title: "سه ستون اصلی"'), "The three-pillar section must use the concise synthesis title.");
assert(writer.includes("coreSynthesisText"), "Three pillars must use concise synthesis text.");
assert(writer.includes("dailyLifeSynthesisText"), "Daily-life placements must use concise synthesis text.");
assert(!writer.includes("به یک انتخاب کوچک و قابل زندگی تبدیل شود"), "The repeated template-like growth sentence must be removed.");
assert(!writer.includes("isAradPattern") && !writer.includes("isArianPattern"), "Batch 1 must use reusable chart synthesis rather than person-specific branches.");
assert(writer.includes("buildChartSpineHumanSummary("), "The opening and closing must reuse the chart-spine synthesis path.");
assert(writer.includes("mercuryVenusShareField"), "Daily-life synthesis must merge repeated Mercury/Venus fields generically.");
assert(writer.includes("buildHouseAnglesText(realEngineWithAspects)"), "Full house/angle data generation must remain.");
assert(writer.includes("buildNatalAccuracyText(realEngineWithAspects)"), "Natal accuracy generation must remain.");
assert(writer.includes("selectNarrativeAspectHighlights"), "Later aspect-selection work must keep the Batch 1 narrative bounded through a separate highlight layer.");
assert(writer.includes("REPORT_ASPECT_HIGHLIGHT_LIMIT"), "Narrative aspect highlights must remain explicitly bounded after Batch 1.");
assert(sampleQa.includes("totalWords > 1950"), "Sample QA must keep the deeper synthesis pass within the strengthened narrative ceiling.");
assert(packageJson.scripts?.["check:report-narrative-cleanup-batch1"] === "node scripts/check-report-narrative-cleanup-batch1.mjs", "package.json must expose the Batch 1 guard.");
assert(packageJson.scripts?.["check:reports"]?.includes("check:report-narrative-cleanup-batch1"), "check:reports must include the Batch 1 guard.");
assert(packageJson.scripts?.["check:project"]?.includes("check:report-narrative-cleanup-batch1"), "check:project must include the Batch 1 guard.");
assert(projectContext.includes("v0.1.283 report narrative cleanup Batch 1"), "Project Context must record Batch 1.");
assert(ideaGarden.includes("Report narrative cleanup five-batch path"), "Idea Garden must record the five-batch report path.");

console.log("Report narrative cleanup Batch 1 guard passed.");
