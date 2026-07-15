import fs from "node:fs";

const requiredFiles = [
  "components/HomepageProductProof.tsx",
  "lib/report-preview/homepage-report-preview.ts",
  "app/page.tsx",
  "app/globals.css",
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${file}`);
  }
}

const read = (file) => fs.readFileSync(file, "utf8");
const preview = read("components/HomepageProductProof.tsx");
const copy = read("lib/report-preview/homepage-report-preview.ts");
const page = read("app/page.tsx");
const css = read("app/globals.css");

const mustContain = (text, token, label) => {
  if (!text.includes(token)) {
    throw new Error(`${label} missing required token: ${token}`);
  }
};

for (const token of [
  "HOME_REPORT_PREVIEW_SECTIONS",
  "HOME_REPORT_PREVIEW_LAYERS",
  "real-report-preview-shell",
  'aria-label="نمونه کوتاه گزارش هالیوس"',
  ".slice(0, 1)",
  "ردپای محاسبه",
]) {
  mustContain(preview, token, "HomepageProductProof");
}

for (const token of [
  "خورشید، ماه و رایزینگ در کنار هم",
  "خانه‌ها",
  "جنبه",
  "دست‌های ماه",
  "جمع‌بندی",
  "پرسش",
]) {
  mustContain(copy, token, "homepage report preview copy");
}

for (const token of [
  ".real-report-preview-shell",
  ".report-preview-showcase-grid",
  ".report-preview-excerpt-card",
  ".report-preview-meta-card",
  ".report-preview-trust-row",
]) {
  mustContain(css, token, "homepage report preview CSS");
}

mustContain(page, "HomepageProductProof", "home page report preview path");
mustContain(page, 'id="sample-report"', "home page report preview anchor");

for (const forbidden of [
  "سه نخ اصلی چارت",
  "سه نخ اصلی",
  "placementها",
  "گزارش‌های من",
  "report-preview-card-head",
  "report-preview-actions",
  "فصل اول گزارش",
  "Source keys:",
  "Halleus engine preview",
  "این صفحه برای تست محصولی است",
]) {
  if (preview.includes(forbidden) || copy.includes(forbidden) || page.includes(forbidden)) {
    throw new Error(`Homepage preview contains removed or internal wording: ${forbidden}`);
  }
}

console.log("Real report preview homepage check passed.");
console.log("- the sample follows the current homepage render path and report structure");
console.log("- Persian chart-position wording replaces hybrid or machine-like copy");
console.log("- duplicate sample CTAs and internal chapter markers stay outside the compact proof block");
