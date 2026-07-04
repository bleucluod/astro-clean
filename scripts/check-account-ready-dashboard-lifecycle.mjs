import fs from "node:fs";

const requiredFiles = [
  "app/dashboard/page.tsx",
  "app/reports/page.tsx",
  "components/ReportsList.tsx",
  "components/AppShell.tsx",
  "lib/config/navigation.ts",
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

const dashboard = read("app/dashboard/page.tsx");
const reportsPage = read("app/reports/page.tsx");
const reportsList = read("components/ReportsList.tsx");
const appShell = read("components/AppShell.tsx");
const navigation = read("lib/config/navigation.ts");
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
  "Halleus Dashboard",
  "پنل کاربری Halleus",
  "از مرورگر تا اکانت",
  "حساب کاربری واقعی هنوز فعال نشده",
  "local-preview",
  "listReportSummaries",
  "پیش‌فرض: خصوصی و noindex",
]) {
  mustContain(dashboard, token, "dashboard");
}

for (const token of [
  "کتابخانه خصوصی گزارش‌های تو",
  "هر گزارشی که ساختی",
  "پنل کاربری",
  'href="/dashboard"',
]) {
  mustContain(reportsPage, token, "reports page");
}

for (const token of [
  "report-lifecycle-strip",
  "خصوصی روی همین دستگاه",
  "آماده اتصال به حساب کاربری",
  "رفتن به پنل کاربری",
  "خروجی کامل JSON",
  "ساخت اولین گزارش تولد",
]) {
  mustContain(reportsList, token, "reports list");
}

for (const token of [
  'href: "/dashboard"',
  'label: "پنل"',
]) {
  mustContain(navigation, token, "navigation");
}

for (const token of [
  'href: "/dashboard"',
  "پنل کاربری",
  "site-nav-cta-main",
]) {
  mustContain(appShell, token, "AppShell");
}

for (const token of [
  "Account-ready reports dashboard and lifecycle v0.1.179",
  ".account-ready-dashboard",
  ".account-ready-status-strip",
]) {
  mustContain(css, token, "CSS");
}

for (const stale of [
  "دیتابیس فعال شد",
  "login واقعی فعال است",
  "ایندکس عمومی فعال شد",
]) {
  mustNotContain(dashboard + reportsPage + reportsList, stale, "account-ready copy");
}

mustContain(context, "v0.1.179", "project context");
mustContain(ideaGarden, "v0.1.179", "idea garden");

console.log("Account-ready reports dashboard lifecycle check passed.");
