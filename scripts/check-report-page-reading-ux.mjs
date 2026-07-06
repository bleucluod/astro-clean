import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function assertIncludes(content, marker, label) {
  if (!content.includes(marker)) {
    throw new Error(`${label} is missing marker: ${marker}`);
  }
}

function assertNotIncludes(content, marker, label) {
  if (content.includes(marker)) {
    throw new Error(`${label} contains forbidden marker: ${marker}`);
  }
}

const reportDetail = read("components/ReportDetail.tsx");

for (const marker of [
  'id="final-reading"',
  'id="core-pillars"',
  'id="chart-wheel"',
  'id="technical-tables"',
  'id="technical-details"',
  'id="personal-note"',
  "روایت اصلی",
  "سه ستون اصلی",
  "جدول‌ها",
  "جزئیات",
  "یادداشت",
  "سفارش نسخه کامل‌تر این گزارش",
]) {
  assertIncludes(reportDetail, marker, "ReportDetail");
}

for (const forbidden of [
  "نبض آسمان امروز",
  "ماه امروز",
  "فاز ماه امروز",
  "تنظیم با افق تهران",
  "خوانش روزانه",
  "کارت روزانه",
  "paid gate is implemented",
  "Search Console is active",
  "True Node is now available",
  "Lilith is now available",
]) {
  assertNotIncludes(reportDetail, forbidden, "ReportDetail");
}

console.log("Report page reading UX check passed.");
