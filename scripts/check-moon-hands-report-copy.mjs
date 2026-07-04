import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function assertIncludes(content, marker, label) {
  if (!content.includes(marker)) {
    throw new Error(label + " is missing marker: " + marker);
  }
}

function assertNotIncludes(content, marker, label) {
  if (content.includes(marker)) {
    throw new Error(label + " contains forbidden marker: " + marker);
  }
}

const writer = read("lib/astrology/real-engine-report-writer.ts");
const reportCard = read("components/ReportCard.tsx");
const reportCardCheck = read("scripts/check-mean-lunar-node-report-card.mjs");
const sampleQa = read("scripts/check-report-sample-qa.mjs");
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");

for (const marker of [
  "const lunarNodeText = buildLunarNodeText(realEngineWithAspects);",
  "function buildLunarNodeText(realEngine: RealEngineReportSnapshot): string | undefined",
  "دست‌های ماه در این گزارش با مدل Mean Lunar Node",
  "ادعای True/Osculating Node ندارد",
  "دست جنوبی ماه از دست شمالی ماه + ۱۸۰°",
  "title: \"دست‌های ماه\"",
  "real-engine-lunar-nodes",
  "lunarNodeSection",
  "isCalculatedLunarNodes(realEngine.lunarNodes)",
]) {
  assertIncludes(writer, marker, "real-engine-report-writer");
}

for (const marker of [
  "دست‌های ماه Mean Lunar Node",
  "دست شمالی ماه",
  "دست جنوبی ماه",
  "Opposition from Mean North Node / دست شمالی + ۱۸۰°",
  "True Node و لیلیت همچنان ادعا نمی‌شوند",
]) {
  assertIncludes(reportCard, marker, "ReportCard");
}

for (const marker of [
  "گره‌های ماه",
  "گره شمالی ماه",
  "گره جنوبی ماه",
]) {
  assertNotIncludes(writer, marker, "real-engine-report-writer");
  assertNotIncludes(reportCard, marker, "ReportCard");
}

for (const marker of [
  "True Lunar Node / محاسبه",
  "لیلیت محاسبه‌شده",
  "Black Moon Lilith محاسبه",
  "true-lunar-node",
]) {
  assertNotIncludes(writer, marker, "real-engine-report-writer");
  assertNotIncludes(reportCard, marker, "ReportCard");
}

assertIncludes(reportCardCheck, "دست‌های ماه Mean Lunar Node", "ReportCard check");
assertIncludes(sampleQa, "دست‌های ماه", "sample QA check");
assertIncludes(ideaGarden, "v0.1.167b product wording: Moon Hands", "Idea Garden");
assertIncludes(ideaGarden, "دست‌های ماه", "Idea Garden");
assertIncludes(ideaGarden, "Mean Lunar Node", "Idea Garden");

console.log("Moon Hands report copy check passed.");
