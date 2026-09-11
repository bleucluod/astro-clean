import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function requireText(label, source, marker) {
  if (!source.includes(marker)) {
    failures.push(`${label} missing marker: ${marker}`);
  }
}

function forbidText(label, source, marker) {
  if (source.includes(marker)) {
    failures.push(`${label} contains forbidden marker: ${marker}`);
  }
}

const reportsPage = read("app/reports/page.tsx");
const reportsLayout = read("app/reports/layout.tsx");
const reportsList = read("components/ReportsList.tsx");
const reportsCss = read("app/reports/reports-page.module.css");
const accountRoute = read("app/api/reports/account/route.ts");
const storageTypes = read("types/storage.ts");
const packageJson = JSON.parse(read("package.json"));

for (const marker of [
  'data-reports-library="account-home-v1"',
  '<ReportsList reportSource={reportSource} />',
  'href="/reports?source=local"',
  'href="/privacy"',
  'rawSource === "local" ? "local" : "account"',
]) {
  requireText("reports page", reportsPage, marker);
}

forbidText("reports page", reportsPage, "AccountReportTitleList");

requireText("reports layout", reportsLayout, "index: false");
requireText("reports layout", reportsLayout, "follow: false");

for (const marker of [
  'type ReportsListSource = "local" | "beta-db" | "account"',
  'type ReportFilterMode = "all" | "favorites" | "natal" | "comparison"',
  "listAccountReportSummaries(accountPage)",
  'summary.reportType === "comparison"',
  '`/compare/${summary.id}`',
  'summary.visibility === "shared_by_link"',
  "handleEditLocalNote",
  'details className={styles.dataTools}',
  'details className={styles.actionMenu}',
  'if (!window.confirm("همهٔ گزارش‌های ذخیره‌شده روی این دستگاه پاک شوند؟")) return;',
]) {
  requireText("reports list", reportsList, marker);
}

forbidText("reports list", reportsList, "accountReadConfig.missingConfig.map");
forbidText("reports list", reportsList, "Account reports");

for (const marker of [
  "--reports-bg: #050609",
  "--reports-accent: #7dd3fc",
  "--reports-accent-soft: #dceeff",
  ".cardsGrid",
  ".actionMenuPanel",
  ".dataTools",
  "background: #0b0e13 !important",
]) {
  requireText("reports css", reportsCss, marker);
}

for (const marker of [
  'if (["enable_sharing", "revoke_sharing", "publish", "unpublish"].includes(action))',
  "Comparison reports are private and cannot be shared or published.",
]) {
  requireText("account report route", accountRoute, marker);
}

requireText("storage types", storageTypes, 'export type ReportVisibility = "private" | "public" | "shared_by_link" | "unpublished" | "restricted_by_admin"');
requireText("storage types", storageTypes, 'reportType: "comparison"');

if (
  packageJson.scripts?.["check:account-reports-ui"] !==
  "node scripts/check-account-reports-ui-integration.mjs"
) {
  failures.push("package.json missing check:account-reports-ui script");
}

if (failures.length > 0) {
  console.error("Account reports UI integration check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Account reports UI integration check passed.");
console.log("- reports page uses the dedicated dark account/device library surface");
console.log("- account and device storage remain distinct");
console.log("- comparison reports route to private comparison detail and never expose sharing controls");
console.log("- destructive local actions require confirmation and data tools remain secondary");
console.log("- reports route remains noindex/nofollow");
