import fs from "node:fs";
import { execFileSync } from "node:child_process";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function read(path) {
  return fs.readFileSync(path, "utf8");
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

function assertExactCount(content, marker, expected, label) {
  const count = content.split(marker).length - 1;
  if (count !== expected) {
    fail(`${label} expected exactly ${expected} occurrences of ${marker}, found ${count}`);
  }
}

const writer = read("lib/astrology/real-engine-report-writer.ts");
const projectContext = read("docs/HALLEUS_PROJECT_CONTEXT.md");
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");

for (const marker of [
  "chapterSummary?: string",
  "chapterSummaryText",
  "خلاصه فصل:",
  "return [readerCueText, opening, chapterSummaryText, body, reflectionText, closing]",
  "real-engine-first-synthesis",
  "real-engine-personal-summary",
  "تمرین کوچک این هفته",
  "سه تمرین کوچک این چارت",
]) {
  assertIncludes(writer, marker, "real-engine-report-writer");
}

assertExactCount(writer, "chapterSummary:", 2, "real-engine-report-writer");
assertExactCount(writer, "readerCue:", 3, "real-engine-report-writer");

for (const marker of [
  "v0.1.223b",
  "Report Value + Synthesis Lite",
  "chapterSummary",
  "No account/auth/database changes",
]) {
  assertIncludes(projectContext, marker, "Project Context");
}

for (const marker of [
  "v0.1.223b",
  "report value synthesis lite",
  "Preserve the current weekly-practice markers",
  "No broad rewrite of the report writer",
]) {
  assertIncludes(ideaGarden, marker, "Idea Garden");
}

for (const forbidden of [
  "/pricing",
  "/order",
  "checkout",
  "paid/private implementation",
]) {
  assertNotIncludes(writer, forbidden, "real-engine-report-writer");
}

execFileSync(process.execPath, ["scripts/check-report-qa-alignment.mjs"], {
  stdio: "inherit",
});

execFileSync(process.execPath, ["scripts/check-report-sample-qa.mjs"], {
  stdio: "inherit",
});

console.log("report-value-synthesis-lite check passed.");
