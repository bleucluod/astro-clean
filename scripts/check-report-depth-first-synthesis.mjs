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
const pkg = read("package.json");

for (const marker of [
  "function buildFirstSynthesisText",
  "function buildSynthesisPersonalityThreads",
  "function buildSynthesisCentralTension",
  "function buildSynthesisGrowthLanguage",
  "function buildSynthesisWeeklyPractice",
  "real-engine-first-synthesis",
  "ترکیب نخستین: نخ‌ها، تنش و زبان رشد",
  "نخ‌های اصلی شخصیت",
  "تنش مرکزی چارت",
  "زبان رشد",
  "تمرین تأملی کوتاه برای این هفته",
  "firstSynthesisText",
]) {
  assertIncludes(writer, marker, "real-engine-report-writer");
}

for (const marker of [
  "v0.1.195-report-depth-first-synthesis",
  "real-engine-first-synthesis",
  "نخ‌های اصلی شخصیت",
  "تنش مرکزی چارت",
  "تمرین تأملی کوتاه برای این هفته",
]) {
  assertIncludes(sampleQa, marker, "sample QA");
}

assertIncludes(projectContext, "v0.1.195 Report Depth + First Synthesis", "Project Context");
assertIncludes(projectContext, "without auth/account/schema/SEO/payment/deploy changes", "Project Context");
assertIncludes(ideaGarden, "v0.1.195 product note: Report Depth + First Synthesis", "Idea Garden");
assertIncludes(ideaGarden, "Account stability remains reactive only", "Idea Garden");
assertIncludes(pkg, "check:report-depth-first-synthesis", "package.json");

for (const forbidden of [
  "paid gate is implemented",
  "Search Console is active",
  "True Node is now available",
  "Lilith is now available",
  "mobile is the username",
]) {
  assertNotIncludes(writer, forbidden, "real-engine-report-writer");
  assertNotIncludes(projectContext, forbidden, "Project Context");
  assertNotIncludes(ideaGarden, forbidden, "Idea Garden");
}

execFileSync(process.execPath, ["scripts/check-report-sample-qa.mjs"], {
  stdio: "inherit",
});

console.log("Report depth first synthesis check passed.");
