import { readFileSync } from "node:fs";

const failures = [];
const chartPage = readFileSync("app/chart/page.tsx", "utf8");
const chartLayout = readFileSync("app/chart/layout.tsx", "utf8");
const chartForm = readFileSync("components/ChartForm.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const checkProject = packageJson.scripts?.["check:project"] ?? "";

for (const marker of [
  "return <ChartForm />",
  "ساخت چارت تولد رایگان",
]) {
  if (!chartPage.includes(marker)) {
    failures.push("Chart page missing product polish marker: " + marker);
  }
}

for (const marker of [
  'data-chart-seo-landing="transactional-birth-chart"',
  "<h1 className={styles.title}>ساخت چارت تولد و گزارش تولد فارسی</h1>",
  'data-chart-seo-education="wiki-guides"',
]) {
  if (!chartLayout.includes(marker)) {
    failures.push("Chart layout missing SEO landing marker: " + marker);
  }
}

for (const marker of [
  "نام خود را وارد کنید",
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
  if (!chartForm.includes(marker)) {
    failures.push("ChartForm missing current product polish marker: " + marker);
  }
}

for (const marker of [
  "createMockReport(normalizedForm)",
  "enhanceReportOutputV2",
  "requestRealEngineReportData",
  "saveGeneratedReportWithAccountFallback(nextReport)",
  "router.push(",
  "/reports/",
  "birthCountry: initialForm.birthCountry",
]) {
  if (!chartForm.includes(marker)) {
    failures.push("ChartForm lost existing chart flow marker: " + marker);
  }
}

for (const marker of [
  ".chart-reference-page",
  "margin: 0 auto",
  ".chart-reference-form",
  ".chart-time-title-row",
  ".city-suggestion-chips",
  "scrollbar-width: none",
]) {
  if (!css.includes(marker)) {
    failures.push("Chart form CSS missing current product polish marker: " + marker);
  }
}

for (const forbiddenMarker of [
  "مثال: آرمان",
  "ساخت، ذخیره و باز کردن گزارش",
  "نام یا نیک‌نیم خود را وارد کنید",
  "اطلاعات تولد",
  "ورودی‌های اصلی",
  "اگر شهر شما در فهرست نیست، نزدیک‌ترین شهر را انتخاب کنید",
  "placeholder=\"تهران\"",
  "app/globals.css",
  "ManualOrderRequestForm",
  "ReportOrderCta",
  "<ReportCard",
  "check:sales-copy-polish",
  "check:product-surface",
]) {
  if (chartForm.includes(forbiddenMarker) || chartPage.includes(forbiddenMarker)) {
    failures.push("Chart polish should not include stale/out-of-scope marker: " + forbiddenMarker);
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
  for (const failure of failures) {
    console.error("- " + failure);
  }
  process.exit(1);
}

console.log("Chart page minimal product polish check passed.");
