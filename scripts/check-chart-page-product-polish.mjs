import { readFileSync } from "node:fs";

const failures = [];
const chartPage = readFileSync("app/chart/page.tsx", "utf8");
const chartForm = readFileSync("components/ChartForm.tsx", "utf8");
const chartCss = readFileSync("app/chart/chart-shell.module.css", "utf8");
const globalCss = readFileSync("app/globals.css", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const checkProject = packageJson.scripts?.["check:project"] ?? "";

function requireMarker(label, source, marker) {
  if (!source.includes(marker)) failures.push(`${label} missing marker: ${marker}`);
}

for (const marker of [
  "<ChartForm />",
  "چارت تولد رایگان فارسی",
  'id="birth-data-heading"',
  'data-chart-seo-landing="transactional-birth-chart"',
]) {
  requireMarker("Chart page", chartPage, marker);
}

for (const marker of [
  'id="chart-birth-data-form"',
  'aria-labelledby="birth-data-heading"',
  "نام فارسی خود را وارد کنید",
  "تاریخ تولد",
  "شمسی",
  "میلادی",
  "ساعت تولد",
  "ساعت تولدم را نمی‌دانم",
  "اگر ساعت دقیق را نمی‌دانی",
  "نام شهر تولد را وارد کنید",
  "پیشنهادهای شهر تولد",
  "گزارشم را در حساب هالیوس نگه دار",
  "ساخت گزارش",
]) {
  requireMarker("ChartForm product flow", chartForm, marker);
}

for (const marker of [
  "buildReportForSave(",
  "buildLocalFallbackReport(",
  "enhanceReportOutputV2(createMockReport(normalizedForm))",
  "requestRealEngineReportData(",
  "saveGeneratedReportWithAccountFallback(",
  "router.push(",
  "/reports/",
  "birthCountry: initialForm.birthCountry",
]) {
  requireMarker("ChartForm engine/report flow", chartForm, marker);
}

for (const marker of [
  ".workspace",
  ".formPanel",
  ".reportSample",
  ".sampleFigure",
  ".sampleImage",
  "/* chart-seo-handoff-20260911 */",
]) {
  requireMarker("Chart page CSS", chartCss, marker);
}

for (const marker of [
  ".chart-reference-page",
  ".chart-reference-form",
  ".chart-time-title-row",
  ".city-suggestion-chips",
  "scrollbar-width: none",
]) {
  requireMarker("Chart form base CSS", globalCss, marker);
}

for (const forbiddenFormMarker of [
  "مثال: آرمان",
  "ساخت، ذخیره و باز کردن گزارش",
  "نام یا نیک‌نیم خود را وارد کنید",
  "ورودی‌های اصلی",
  "اگر شهر شما در فهرست نیست، نزدیک‌ترین شهر را انتخاب کنید",
  'placeholder="تهران"',
]) {
  if (chartForm.includes(forbiddenFormMarker)) {
    failures.push(`ChartForm should not include stale marker: ${forbiddenFormMarker}`);
  }
}

for (const forbiddenPageMarker of [
  "ManualOrderRequestForm",
  "ReportOrderCta",
  "<ReportCard",
]) {
  if (chartForm.includes(forbiddenPageMarker) || chartPage.includes(forbiddenPageMarker)) {
    failures.push(`Chart polish should not include out-of-scope marker: ${forbiddenPageMarker}`);
  }
}

if (
  packageJson.scripts?.["check:chart-page-product-polish"] !==
  "node scripts/check-chart-page-product-polish.mjs"
) {
  failures.push("Missing package script: check:chart-page-product-polish");
}

if (!checkProject.includes("pnpm run check:chart-page-product-polish")) {
  failures.push("check:project does not run check:chart-page-product-polish");
}

if (failures.length > 0) {
  console.error("Chart page minimal product polish check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Chart page minimal product polish check passed.");
console.log("- current form UX markers and the real engine/report flow remain guarded");
console.log("- page shell markers now match the current /chart architecture instead of the retired layout shell");
