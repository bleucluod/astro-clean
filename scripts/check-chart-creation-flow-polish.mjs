import fs from "node:fs";

const requiredFiles = [
  "components/ChartForm.tsx",
  "app/globals.css",
  "docs/HALLEUS_PROJECT_CONTEXT.md",
  "docs/HALLEUS_IDEA_GARDEN.md",
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${file}`);
  }
}

const read = (file) => fs.readFileSync(file, "utf8");
const chartForm = read("components/ChartForm.tsx");
const css = read("app/globals.css");
const context = read("docs/HALLEUS_PROJECT_CONTEXT.md");
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");

const mustContain = (text, token, label) => {
  if (!text.includes(token)) {
    throw new Error(`${label} missing required token: ${token}`);
  }
};

const mustNotContain = (text, token, label) => {
  if (text.includes(token)) {
    throw new Error(`${label} still contains stale token: ${token}`);
  }
};

for (const token of [
  "BirthDateMode",
  'useState<BirthDateMode>("jalali")',
  "تاریخ تولد",
  "شمسی",
  "میلادی",
  "type=\"date\"",
  "birthTimeMode",
  "UNKNOWN_BIRTH_TIME",
  "نمی‌دانم",
  "time-choice-row",
  "نامت را بنویس — اختیاری",
  "citySuggestions",
  "MAX_CITY_SUGGESTIONS",
  ".slice(0, MAX_CITY_SUGGESTIONS)",
  "شهر تولد را بنویس",
  "چارت واقعی",
  "ذخیره خصوصی",
  "ساخت گزارش",
  "requestRealEngineReportData",
  "saveGeneratedReport(nextReport)",
  "router.push(`/reports/${nextReport.id}`)",
]) {
  mustContain(chartForm, token, "ChartForm");
}

for (const stale of [
  "birthCity: \"تهران\"",
  "تاریخ تولد شمسی را با انتخاب سال، ماه و روز کامل کن.",
  "بدون انتخاب کشور",
  "خروجی ذخیره‌شده",
  "چه چیزی می‌گیری؟",
  "مسیر ساده ساخت گزارش",
  "این صفحه دیگر پیش‌نمایش آزمایشگاهی نشان نمی‌دهد",
  "engine داخلی",
  "کشور در UI پرسیده نمی‌شود",
]) {
  mustNotContain(chartForm, stale, "ChartForm");
}

for (const token of [
  "Chart creation flow polish v0.1.176",
  ".chart-app-flow-page",
  ".chart-form-header",
  ".date-mode-switch",
  ".birth-date-picker-grid",
  ".time-choice-row",
  ".time-unknown-button",
]) {
  mustContain(css, token, "chart flow CSS");
}

mustContain(context, "v0.1.176", "project context");
mustContain(ideaGarden, "v0.1.176", "idea garden");

console.log("Chart creation flow polish check passed.");
