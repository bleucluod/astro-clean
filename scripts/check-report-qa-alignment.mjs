import fs from "node:fs";
import { execFileSync } from "node:child_process";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function decode(base64) {
  return Buffer.from(base64, "base64").toString("utf8");
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

const weeklyMarkers = [
  decode("2KrZhdix24zZhiDaqdmI2obaqSDYp9uM2YYg2YfZgdiq2Yc="),
  decode("2LPZhyDYqtmF2LHbjNmGINqp2YjahtqpINin24zZhiDahtin2LHYqg=="),
];

for (const marker of weeklyMarkers) {
  assertIncludes(writer, marker, "real-engine-report-writer");
  assertIncludes(sampleQa, marker, "check-report-sample-qa");
}

for (const marker of [
  "buildSynthesisWeeklyPractice",
  "buildChartPracticeList",
  "current V3 synthesis marker",
]) {
  assertIncludes(writer + sampleQa, marker, "report QA alignment sources");
}

for (const marker of [
  "v0.1.223a",
  "Report QA Alignment",
  "v0.1.223 report-value rollback",
]) {
  assertIncludes(projectContext, marker, "Project Context");
}

for (const marker of [
  "v0.1.223a",
  "report QA alignment",
  "No rewrite of report narrative copy",
]) {
  assertIncludes(ideaGarden, marker, "Idea Garden");
}

for (const forbidden of [
  "/pricing",
  "/order",
  "checkout",
  "payment",
]) {
  assertNotIncludes(writer, forbidden, "real-engine-report-writer");
}

execFileSync(process.execPath, ["scripts/check-report-sample-qa.mjs"], {
  stdio: "inherit",
});

console.log("report-qa-alignment check passed.");