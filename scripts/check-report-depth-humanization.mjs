import { execFileSync } from "node:child_process";
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

const writer = read("lib/astrology/real-engine-report-writer.ts");
const sampleQa = read("scripts/check-report-sample-qa.mjs");
const projectContext = read("docs/HALLEUS_PROJECT_CONTEXT.md");
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");

for (const marker of [
  "function getAspectPlainLanguageBridge",
  "function buildAspectPriorityText",
  "برای خواندن انسانی جنبه‌ها",
  "اولویت خواندن جنبه‌ها",
  "در زبان ساده",
  "پرسش خانه",
  "میدان زندگی این خانه",
  "تمرین انسانی این خانه",
  "برای کم کردن تکرار",
  "toPersianNumber(tensionCount)",
]) {
  assertIncludes(writer, marker, "real-engine-report-writer");
}

for (const marker of [
  "v0.1.170-report-depth-humanization",
  "اولویت خواندن جنبه‌ها",
  "میدان زندگی این خانه",
]) {
  assertIncludes(sampleQa, marker, "sample QA");
}

assertIncludes(projectContext, "v0.1.170 report-depth-humanization scope note", "Project Context");
assertIncludes(ideaGarden, "v0.1.170 product note: report depth humanization bundle", "Idea Garden");

for (const forbidden of [
  "paid gate is implemented",
  "Search Console is active",
  "True Node is now available",
  "Lilith is now available",
]) {
  assertNotIncludes(writer, forbidden, "real-engine-report-writer");
  assertNotIncludes(projectContext, forbidden, "Project Context");
  assertNotIncludes(ideaGarden, forbidden, "Idea Garden");
}

execFileSync(process.execPath, ["scripts/check-report-sample-qa.mjs"], {
  stdio: "inherit",
});

console.log("Report depth humanization check passed.");
