import { readFileSync } from "node:fs";

const failures = [];
const read = (path) => readFileSync(path, "utf8");
const requireText = (label, source, marker) => { if (!source.includes(marker)) failures.push(`${label} is missing marker: ${marker}`); };
const forbidText = (label, source, marker) => { if (source.includes(marker)) failures.push(`${label} contains forbidden marker: ${marker}`); };

const reader = read("components/report/ReportProductReader.tsx");
const navigation = read("components/report/ReportReadingNavigation.tsx");
const birth = read("components/ReportV3Experience.tsx");
const birthCss = read("components/report/human-first-report.module.css");
const comparison = read("components/comparison/ComparisonReport.tsx");
const composer = read("components/comparison/ComparisonComposer.tsx");
const comparisonCss = read("components/comparison/comparison.module.css");
const journey = read("lib/storage/report-journey-client.ts");
const reportDetail = read("components/ReportDetail.tsx");
const nav = read("lib/config/navigation.ts");
const comparePage = read("app/compare/page.tsx");

for (const marker of [
  "امروز کدام بخش‌های تو پررنگ‌ترند؟",
  "با بازکردن دوباره تازه نمی‌شود",
  "همیشه تصویر همان زمان را نگه می‌دارد",
  "اطلاعات این خوانش",
  "محل زندگی هنگام ساخت گزارش",
  "چارت و جزئیات",
]) requireText("human sky reading", reader, marker);

for (const marker of [
  "PersonalTransitReportSection",
  "Asia/Tehran</small>",
  "وضعیت خوانش",
  "بدون پیش‌فرض پنهان تهران",
  "جزئیات فنی:",
  "snapshot ذخیره‌شده",
]) forbidText("human sky reading", reader, marker);

for (const marker of [
  "floatingSectionsButton",
  "bottomSheet",
  "بخش‌های گزارش",
  "نوع خوانش",
  "فصل‌های گزارش تولد",
]) requireText("mobile reading navigation", navigation, marker);
for (const marker of ["<select", "انتخاب فصل گزارش", "COMPACT_SCROLL_START"]) forbidText("mobile reading navigation", navigation, marker);

for (const marker of [
  ".floatingSectionsButton",
  ".bottomSheetBackdrop",
  ".bottomSheet",
  "env(safe-area-inset-bottom)",
  ".desktopModeSwitch",
]) requireText("mobile reading styles", birthCss, marker);

requireText("birth saveable sentence", birth, "یک جمله برای این روزها");
forbidText("birth saveable sentence", birth, "کپی جمله");
forbidText("birth human reading", birth, "ReportSpecialPointsNarrativeSection");
forbidText("birth human reading", birth, "پشتوانه و محدودیت این خوانش");

for (const marker of ["خوانش رابطه", "جزئیات نجومی", "record.report.contacts.map", "contact.orb"]) requireText("comparison report", comparison, marker);
for (const marker of ["برای کارکرد بهتر:", "contact.growthFa", "برچسب‌های داخلی سیستم"]) forbidText("comparison technical details", comparison, marker);
requireText("comparison navigation label", nav, 'label: "تحلیل رابطه"');
requireText("comparison composer", composer, "تحلیل رابطه با مقایسه دو چارت تولد");
requireText("comparison SEO", comparePage, "چارت سیناستری آنلاین | مقایسه دو چارت تولد");
requireText("comparison mobile tabs", comparisonCss, "/* Final relationship reading cleanup */");

for (const marker of [
  "groupHouseOverlays",
  "buildHouseOverlayNarrative",
  "در زندگی واقعی ممکن است این‌طور دیده شود",
  "وقتی این پیوند خوب پیش می‌رود",
  "زیر فشار ممکن است",
  "یک راه کوچک برای بهترشدن",
  "overlay.readingFa",
]) requireText("human house-overlay narratives", comparison, marker);

for (const marker of [
  ".overlayDirections",
  ".overlayNarrativeCard",
  ".overlayNarrativeParts",
  ".overlayNarrativeEvidence",
]) requireText("human house-overlay styles", comparisonCss, marker);

forbidText(
  "human house-overlay narratives",
  comparison,
  '<article className={styles.overlayCard} key={overlay.id}>',
);

const comparisonTabsRule = comparisonCss.match(/\.reportTabs\s*\{([^}]*)\}/s);
if (!comparisonTabsRule || !/position\s*:\s*static\s*;/.test(comparisonTabsRule[1])) {
  failures.push("comparison tabs must stay at the report top instead of following the reader");
}
if (comparisonTabsRule && /position\s*:\s*sticky\s*;/.test(comparisonTabsRule[1])) {
  failures.push("comparison tabs must not remain sticky while the relationship report scrolls");
}

for (const marker of [
  "buildHumanFirstBirthReading",
  "خلاصه‌ای از چارت تو",
  "وقتی روی فرم خودتی",
  "وقتی فشار بالا می‌رود",
  "یک جهت برای ادامه",
  "halleus-shareable-summary.txt",
]) requireText("shareable summary", journey, marker);
for (const marker of ["privacy-safe-report-summary", "halleus-safe-summary.json", "JSON.stringify(payload"]) forbidText("shareable summary", journey, marker);

for (const marker of [
  "شروع تحلیل رابطه",
  "رابطه‌تان را از زاویهٔ دو چارت ببینید",
  "report-product-reader-tools",
]) requireText("report ending", reportDetail, marker);
forbidText("report ending", reportDetail, "downloadPrivacySafeReport(report)");

const visible = [reader, navigation, birth, comparison, composer, reportDetail, journey].join("\n");
for (const expression of [
  /fixture(?:s)?/iu,
  /دسته شواهد/u,
  /personal-planet/iu,
  /luminary/iu,
  /chart-ruler/iu,
  /بدون پیش‌فرض پنهان/u,
  /وضعیت خوانش/u,
  /داده‌ی ترنزیت ذخیره‌شده آماده/u,
]) {
  if (expression.test(visible)) failures.push(`visible copy contains internal language: ${expression}`);
}

if (failures.length) {
  console.error("Human-First final architecture check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Human-First final architecture check passed.");
console.log("- mobile report navigation uses one floating button and a bottom sheet");
console.log("- the current-sky reading is human-first and date-aware");
console.log("- technical registration data stays in chart details");
console.log("- comparison technical details do not repeat practical advice");
console.log("- every house overlay has a full human narrative, a real-life example, pressure pattern, and practical step");
console.log("- the shareable summary is human-first plain text");
console.log("- the birth report ends with a relationship-analysis CTA");
