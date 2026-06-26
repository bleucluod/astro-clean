import { readFileSync } from "node:fs";

const failures = [];
const chartPage = readFileSync("app/chart/page.tsx", "utf8");
const chartForm = readFileSync("components/ChartForm.tsx", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const checkProject = packageJson.scripts?.["check:project"] ?? "";

for (const marker of [
  "return <ChartForm />",
  "صفحه شروع ساخت گزارش تولد",
]) {
  if (!chartPage.includes(marker)) {
    failures.push("Chart page missing product polish marker: " + marker);
  }
}

for (const marker of [
  "شروع گزارش تولد",
  "گزارش تولد فارسی، از همین فرم ساده",
  "تاریخ شمسی، ساعت تولد و شهر تولد کافی است",
  "فرم ساخت گزارش",
  "تاریخ تولد در UI شمسی است",
  "کشور در UI پرسیده نمی‌شود",
  "فعلاً شهرهای ایران پشتیبانی می‌شوند",
  "چه چیزی می‌گیری؟",
  "یک گزارش قابل خواندن، نه فقط داده خام",
  "چارت محاسبه‌شده",
  "متن فارسی گزارش",
  "ذخیره برای ادامه مسیر",
  "مسیر ساده ساخت گزارش",
  "محاسبه پشت صحنه",
  "ساخت گزارش و مشاهده جزئیات",
]) {
  if (!chartForm.includes(marker)) {
    failures.push("ChartForm missing minimal product polish marker: " + marker);
  }
}

for (const marker of [
  "createMockReport(normalizedForm)",
  "enhanceReportOutputV2",
  "requestRealEngineReportData",
  "saveGeneratedReport(nextReport)",
  "router.push(",
  "/reports/",
  "birthCountry: initialForm.birthCountry",
]) {
  if (!chartForm.includes(marker)) {
    failures.push("ChartForm lost existing chart flow marker: " + marker);
  }
}

for (const forbiddenMarker of [
  "app/globals.css",
  "ManualOrderRequestForm",
  "ReportOrderCta",
  "<ReportCard",
  "check:sales-copy-polish",
  "check:product-surface",
]) {
  if (chartForm.includes(forbiddenMarker) || chartPage.includes(forbiddenMarker)) {
    failures.push("Chart polish should not introduce out-of-scope marker: " + forbiddenMarker);
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
  console.error("Chart page product polish check failed:");
  for (const failure of failures) {
    console.error("- " + failure);
  }
  process.exit(1);
}

console.log("Chart page minimal product polish check passed.");
