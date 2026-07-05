import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

function assertIncludes(text, token, label) {
  if (!text.includes(token)) {
    throw new Error(label + " is missing: " + token);
  }
}

const writer = read("lib/astrology/real-engine-report-writer.ts");
const detail = read("components/ReportDetail.tsx");
const css = read("app/globals.css");
const pkg = JSON.parse(read("package.json"));

[
  "real-engine-reading-rhythm",
  "ریتم انسانی خواندن گزارش",
  "buildReportHumanReadingRhythmText",
  "چطور بخوانی",
  "یک مکث کوتاه",
  ".join(\"\\n\\n\")",
].forEach((token) => assertIncludes(writer, token, "report writer humanization"));

[
  "ReportHumanReadingMode",
  "report-human-reading-mode",
  "گزارش را یک‌باره تمام نکن",
  "یک جمله، نه همه گزارش",
].forEach((token) => assertIncludes(detail, token, "report detail reading mode"));

[
  "Report Humanization v0.1.199",
  ".report-human-reading-mode",
  "white-space: pre-line",
].forEach((token) => assertIncludes(css, token, "report humanization CSS"));

assertIncludes(
  pkg.scripts?.["check:report-humanization-reading-experience"] ?? "",
  "scripts/check-report-humanization-reading-experience.mjs",
  "package script",
);

console.log("Report humanization reading experience check passed.");
