import fs from "node:fs";

const files = [
  "app/product/page.tsx",
  "app/privacy/page.tsx",
  "app/reports/page.tsx",
  "components/AppShell.tsx",
  "components/ReportsList.tsx",
  "app/globals.css",
  "docs/HALLEUS_PROJECT_CONTEXT.md",
  "docs/HALLEUS_IDEA_GARDEN.md",
];

for (const file of files) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${file}`);
  }
}

const read = (file) => fs.readFileSync(file, "utf8");
const product = read("app/product/page.tsx");
const privacy = read("app/privacy/page.tsx");
const reportsPage = read("app/reports/page.tsx");
const appShell = read("components/AppShell.tsx");
const reportsList = read("components/ReportsList.tsx");
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
  "مسیر محصول Halleus",
  "خصوصی",
  "ساخت گزارش تولد",
  "گزارش قابل خواندن",
  "زبان هالیوس نمادین",
]) {
  mustContain(product, token, "product page");
}

for (const token of [
  "حریم داده و گزارش‌ها",
  "private-first",
  "رضایت روشن",
  "ایندکس گوگل: فعال نیست",
]) {
  mustContain(privacy, token, "privacy page");
}

for (const token of [
  "گزارش‌های من",
  "هر گزارشی که ساختی",
  "حریم داده‌ها",
]) {
  mustContain(reportsPage, token, "reports page");
}

for (const token of [
  "back-to-top-button",
  "پرش به بالا",
  "site-nav-cta-main",
]) {
  mustContain(appShell, token, "AppShell");
}
mustNotContain(appShell, "شروع رایگان", "AppShell");

for (const token of [
  "report-lifecycle-strip",
  "خصوصی روی همین دستگاه",
  "ساخت اولین گزارش تولد",
  "خروجی کامل JSON",
]) {
  mustContain(reportsList, token, "ReportsList");
}

for (const stale of [
  "اولین گزارش mock",
  "نه فروش، نه ایندکس عمومی",
]) {
  mustNotContain(reportsList + reportsPage, stale, "reports flow");
}

for (const stale of [
  "شروع سفارش دستی",
  "دیدن پلن‌ها",
  "پرداخت واقعی هنوز فعال نیست",
]) {
  mustNotContain(product + privacy, stale, "trust pages");
}

for (const token of [
  "Trust, return flow, and global UI polish v0.1.177",
  ".back-to-top-button",
  ".trust-principle-grid",
  ".report-lifecycle-strip",
]) {
  mustContain(css, token, "CSS");
}

mustContain(context, "v0.1.177", "project context");
mustContain(ideaGarden, "v0.1.177", "idea garden");

console.log("Trust, return flow, and global UI polish check passed.");
