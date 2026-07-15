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

function assertNotIncludes(text, token, label) {
  if (text.includes(token)) {
    throw new Error(`${label} must not expose: ${token}`);
  }
}

const chartForm = read("components/ChartForm.tsx");
const chartLayout = read("app/chart/layout.tsx");
const chartPage = read("app/chart/page.tsx");
const packageJson = JSON.parse(read("package.json"));

[
  "Beta readiness smoke",
  "مسیر تست بتا",
  "BETA_READINESS_SMOKE",
  "ساخت، ذخیره و باز کردن گزارش",
].forEach((token) => {
  assertNotIncludes(chartForm, token, "public ChartForm");
  assertNotIncludes(chartLayout, token, "public chart layout");
  assertNotIncludes(chartPage, token, "public chart page");
});

assertIncludes(
  packageJson.scripts?.["check:beta-readiness-smoke"] ?? "",
  "scripts/check-beta-readiness-smoke.mjs",
  "package script",
);

console.log("Beta readiness boundary check passed.");
console.log("- beta/smoke/test copy stays outside the public /chart route");
