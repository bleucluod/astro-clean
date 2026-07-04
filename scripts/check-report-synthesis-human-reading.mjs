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
    fail(label + " is missing marker: " + marker);
  }
}

function assertNotIncludes(content, marker, label) {
  if (content.includes(marker)) {
    fail(label + " contains forbidden marker: " + marker);
  }
}

const writer = read("lib/astrology/real-engine-report-writer.ts");
const sampleQa = read("scripts/check-report-sample-qa.mjs");
const projectContext = read("docs/HALLEUS_PROJECT_CONTEXT.md");
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");

for (const marker of [
  "function buildCoreSynthesisThread",
  "function buildAspectSynthesisThread",
  "function buildHouseSynthesisThread",
  "سه نخ اصلی این چارت",
  "تصویر کلی این چارت",
  "کشمکش و استعداد",
  "تمرین رشد",
  "از سه نخ اصلی گزارش یک انتخاب کوچک",
]) {
  assertIncludes(writer, marker, "real-engine-report-writer");
}

for (const marker of [
  "v0.1.169-report-synthesis",
  "missing synthesis marker",
  "سه نخ اصلی این چارت",
]) {
  assertIncludes(sampleQa, marker, "sample QA");
}

assertIncludes(projectContext, "v0.1.169 report-synthesis-human-reading scope note", "Project Context");
assertIncludes(projectContext, "Render-hosted, free, noindex", "Project Context");
assertIncludes(ideaGarden, "v0.1.169 product note: report synthesis before acquisition", "Idea Garden");
assertIncludes(ideaGarden, "همه چیز فعلاً رایگان و noindex می‌ماند", "Idea Garden");

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

console.log("Report synthesis human reading check passed.");
