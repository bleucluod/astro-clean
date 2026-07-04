import fs from "node:fs";

const requiredFiles = [
  "components/HomepageProductProof.tsx",
  "lib/report-preview/homepage-report-preview.ts",
  "app/page.tsx",
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

const preview = read("components/HomepageProductProof.tsx");
const copy = read("lib/report-preview/homepage-report-preview.ts");
const page = read("app/page.tsx");
const css = read("app/globals.css");
const context = read("docs/HALLEUS_PROJECT_CONTEXT.md");
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");

const mustContain = (text, token, label) => {
  if (!text.includes(token)) {
    throw new Error(`${label} missing required token: ${token}`);
  }
};

for (const token of [
  "HOME_REPORT_PREVIEW_SECTIONS",
  "HOME_REPORT_PREVIEW_LAYERS",
  "real-report-preview-shell",
  "گزارش خودم را بساز",
  "ردپای محاسبه",
]) {
  mustContain(preview, token, "HomepageProductProof");
}

for (const token of [
  "سه نخ اصلی",
  "خورشید",
  "ماه",
  "رایزینگ",
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

mustContain(page, "کتابخانه محتوای فارسی", "home page future modules");
if (page.includes("نمونه گزارش و محتوای فارسی")) {
  throw new Error("Homepage still treats report preview as a future module.");
}

for (const forbidden of [
  "Source keys:",
  "Halleus engine preview",
  "این صفحه برای تست محصولی است",
]) {
  if (preview.includes(forbidden) || copy.includes(forbidden) || page.includes(forbidden)) {
    throw new Error(`Homepage preview leaked internal/demo wording: ${forbidden}`);
  }
}

mustContain(context, "v0.1.175", "project context");
mustContain(ideaGarden, "v0.1.175", "idea garden");

console.log("Real report preview homepage check passed.");
