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

const reportDetail = read("components/ReportDetail.tsx");
const reportsPage = read("app/reports/page.tsx");
const projectContext = read("docs/HALLEUS_PROJECT_CONTEXT.md");
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");

for (const marker of [
  "function ReportReadingGuide",
  "function ReportNextStepPanel",
  "مسیر پیشنهادی خواندن گزارش",
  "شروع خواندن گزارش کامل",
  "گفت‌وگوی درونی چارت",
  "هالیوس فعلاً رایگان و noindex است",
  "id=\"reading-guide\"",
  "id=\"final-reading\"",
  "id=\"personal-note\"",
]) {
  assertIncludes(reportDetail, marker, "ReportDetail");
}

for (const marker of [
  "گزارش‌هایی که ساختی را آرام‌تر مرور کن",
  "فعلاً رایگان، خصوصی",
  "حریم خصوصی گزارش‌ها",
  "href=\"/privacy\"",
]) {
  assertIncludes(reportsPage, marker, "reports page");
}

for (const forbidden of [
  "href=\"/pricing\"",
  "دیدن پلن‌ها",
  "سفارش دستی",
]) {
  assertNotIncludes(reportsPage, forbidden, "reports page");
}

assertIncludes(projectContext, "v0.1.171 report-page-reading-ux scope note", "Project Context");
assertIncludes(ideaGarden, "v0.1.171 product note: report page reading UX", "Idea Garden");

for (const forbidden of [
  "paid gate is implemented",
  "Search Console is active",
  "True Node is now available",
  "Lilith is now available",
]) {
  assertNotIncludes(projectContext, forbidden, "Project Context");
  assertNotIncludes(ideaGarden, forbidden, "Idea Garden");
  assertNotIncludes(reportDetail, forbidden, "ReportDetail");
  assertNotIncludes(reportsPage, forbidden, "reports page");
}

console.log("Report page reading UX check passed.");
