import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function fail(message) {
  throw new Error(message);
}

function assertIncludes(content, marker, label) {
  if (!content.includes(marker)) {
    fail(`${label} is missing marker: ${marker}`);
  }
}

function assertNotIncludes(content, marker, label) {
  if (content.includes(marker)) {
    fail(`${label} contains forbidden marker: ${marker}`);
  }
}

function assertOrder(source, first, second, label) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);

  if (firstIndex === -1) {
    fail(`${label} is missing first order marker: ${first}`);
  }

  if (secondIndex === -1) {
    fail(`${label} is missing second order marker: ${second}`);
  }

  if (firstIndex >= secondIndex) {
    fail(`${label} has wrong order: ${first} should appear before ${second}`);
  }
}

const writer = read("lib/astrology/real-engine-report-writer.ts");
const sampleQa = read("scripts/check-report-sample-qa.mjs");
const fullPolishCheck = read("scripts/check-full-report-product-polish.mjs");
const projectContext = read("docs/HALLEUS_PROJECT_CONTEXT.md");
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");

for (const marker of [
  "مسیر خواندن از سه ستون اصلی شروع می‌شود",
  "یادداشت‌های روش و دقت بعد از روایت اصلی آمده‌اند",
  "محورهای اصلی این چارت چنین‌اند",
  "لایه حرکت",
  "دقت تولد و روش خواندن گزارش",
  "۴) دست‌های ماه را مثل نسبت میان عادت آشنا و تمرین تازه بخوان",
]) {
  assertIncludes(writer, marker, "real-engine-report-writer");
}

for (const forbidden of [
  "ذخیره‌شده در snapshot",
  "در snapshot",
  "لایه motion",
  "داده‌های real engine",
  "از همین داده‌های real engine",
  "بخش‌های فنی‌تر بعد از روایت اصلی آمده‌اند",
]) {
  assertNotIncludes(writer, forbidden, "real-engine-report-writer");
}

const sectionArray = writer.slice(writer.indexOf("return (["));
assertOrder(sectionArray, "houseAnglesSection,", "lunarNodeSection,", "report section order");
assertOrder(sectionArray, "lunarNodeSection,", "motionSection,", "report section order");
assertOrder(sectionArray, "motionSection,", 'id: "real-engine-growth"', "report section order");
assertOrder(sectionArray, 'id: "real-engine-growth"', "natalAccuracySection,", "report section order");
assertOrder(sectionArray, "natalAccuracySection,", 'id: "real-engine-reflection-prompts"', "report section order");

assertIncludes(sampleQa, "v0.1.168-reading-polish", "sample QA");
assertIncludes(sampleQa, "technicalSnapshotMentions > 0", "sample QA");
assertIncludes(fullPolishCheck, "یادداشت‌های روش و دقت بعد از روایت اصلی آمده‌اند", "full report polish check");
assertIncludes(projectContext, "v0.1.168 full-report-reading-polish scope note", "Project Context");
assertIncludes(projectContext, "ExecutionPolicy Bypass", "Project Context");
assertIncludes(projectContext, "corrupted `.next/dev/types/routes.d.ts`", "Project Context");
assertIncludes(ideaGarden, "v0.1.168 product note: full report reading polish", "Idea Garden");

console.log("Full report reading polish check passed.");
