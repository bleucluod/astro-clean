import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

function fail(message) {
  console.error(`inline-signup-chart-prompt check failed: ${message}`);
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

const chartForm = read("components/ChartForm.tsx");
const authPanel = read("components/SupabaseAuthPanel.tsx");
const projectContext = read("docs/HALLEUS_PROJECT_CONTEXT.md");
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");

for (const marker of [
  'import { SupabaseAuthPanel } from "@/components/SupabaseAuthPanel";',
  "chart-inline-account-panel",
  "chart-inline-account-title",
  "<SupabaseAuthPanel />",
  "local/private",
  "account/private/noindex",
]) {
  assertIncludes(chartForm, marker, "ChartForm");
}

for (const marker of [
  "ثبت‌نام داخل صفحه ساخت چارت اختیاری است",
  "local/private",
  "ذخیره حساب هم تلاش",
]) {
  assertIncludes(authPanel, marker, "SupabaseAuthPanel");
}

assertNotIncludes(
  authPanel,
  "فعلاً ثبت‌نام داخل صفحه ساخت چارت اضافه نمی‌شود",
  "SupabaseAuthPanel",
);

for (const marker of [
  "v0.1.225",
  "Inline Signup Prompt Inside Chart",
  "non-blocking",
  "account/private/noindex",
]) {
  assertIncludes(projectContext, marker, "Project Context");
}

for (const marker of [
  "v0.1.225",
  "Inline signup prompt inside chart",
  "optional sign-in/sign-up panel",
  "No payment",
]) {
  assertIncludes(ideaGarden, marker, "Idea Garden");
}

for (const forbidden of [
  "stripe",
  "checkout",
  "paid/private",
  "public/indexable",
]) {
  assertNotIncludes(chartForm, forbidden, "ChartForm");
}

execFileSync(process.execPath, ["scripts/check-save-report-to-account-bridge.mjs"], {
  stdio: "inherit",
});

execFileSync(process.execPath, ["scripts/check-consent-sharing-clarity.mjs"], {
  stdio: "inherit",
});

console.log("inline-signup-chart-prompt check passed.");
