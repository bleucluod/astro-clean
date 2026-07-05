import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertIncludes(text, token, label) {
  if (!text.includes(token)) {
    throw new Error(`${label} is missing: ${token}`);
  }
}

const chartForm = read("components/ChartForm.tsx");
const dashboard = read("app/dashboard/page.tsx");
const packageJson = JSON.parse(read("package.json"));

[
  "Beta readiness smoke",
  "مسیر تست بتا",
  "BETA_READINESS_SMOKE",
  "ساخت، ذخیره و باز کردن گزارش",
].forEach((token) => assertIncludes(chartForm, token, "ChartForm beta readiness copy"));

[
  "چک‌لیست مسیر بتا",
  "BETA_READINESS_DASHBOARD",
  "Local smoke",
  "Deploy smoke",
  "feature جدید یا SEO نیست",
].forEach((token) => assertIncludes(dashboard, token, "Dashboard beta readiness copy"));

assertIncludes(
  packageJson.scripts?.["check:beta-readiness-smoke"] ?? "",
  "scripts/check-beta-readiness-smoke.mjs",
  "package script",
);

console.log("Beta readiness smoke check passed.");
