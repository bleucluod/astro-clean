import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

function fail(message) {
  console.error(`consent-sharing-clarity check failed: ${message}`);
  process.exit(1);
}

function read(path) {
  return readFileSync(path, "utf8");
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
const reportsList = read("components/ReportsList.tsx");
const chartForm = read("components/ChartForm.tsx");
const projectContext = read("docs/HALLEUS_PROJECT_CONTEXT.md");
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");

for (const marker of [
  "getNextActionMessage",
  "وضعیت اشتراک و حریم",
  "public/noindex",
  "private/noindex",
  "نسخه local/private",
]) {
  assertIncludes(reportDetail, marker, "ReportDetail");
}

for (const marker of [
  "local/private",
  "public/noindex",
  "private/noindex",
  "اشتراک عمومی فقط با لینک noindex",
]) {
  assertIncludes(reportsList, marker, "ReportsList");
}

for (const marker of [
  "account-saved",
  "public-saved",
  "local/private",
  "private/noindex",
  "public/noindex",
]) {
  assertIncludes(chartForm, marker, "ChartForm");
}

for (const marker of [
  "v0.1.224",
  "Consent / Sharing Clarity",
  "local/private browser copy",
  "public/noindex direct-link copy",
]) {
  assertIncludes(projectContext, marker, "Project Context");
}

for (const marker of [
  "v0.1.224",
  "consent/sharing clarity",
  "local/private browser copy",
  "No payment",
]) {
  assertIncludes(ideaGarden, marker, "Idea Garden");
}

for (const forbidden of [
  "checkout",
  "stripe",
  "paid report",
  "indexable public-report SEO model",
]) {
  assertNotIncludes(reportDetail + reportsList + chartForm, forbidden, "consent/sharing UI files");
}

execFileSync(process.execPath, ["scripts/check-save-report-to-account-bridge.mjs"], {
  stdio: "inherit",
});

console.log("consent-sharing-clarity check passed.");
