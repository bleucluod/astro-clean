import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];
const read = (path) => readFileSync(join(root, path), "utf8");
const need = (label, source, marker) => {
  if (!source.includes(marker)) failures.push(`${label} missing: ${marker}`);
};
const forbid = (label, source, marker) => {
  if (source.includes(marker)) failures.push(`${label} still contains: ${marker}`);
};

const reportsPage = read("app/reports/page.tsx");
const reportsLayout = read("app/reports/layout.tsx");
const reportsList = read("components/ReportsList.tsx");
const reportsCss = read("app/reports/reports-page.module.css");
const ownerRoute = read("app/api/reports/owner/route.ts");
const packageJson = JSON.parse(read("package.json"));

for (const marker of [
  'data-reports-library="server-canonical-v1"',
  '<ReportsList reportSource="account" />',
  'href="/privacy"',
]) need("reports page", reportsPage, marker);

forbid("reports page", reportsPage, 'href="/reports?source=local"');

for (const marker of ["index: false", "follow: false"]) {
  need("reports layout", reportsLayout, marker);
}

for (const marker of [
  'type ReportsListSource = "local" | "beta-db" | "account"',
  "reconcileServerCanonicalReports",
  "listAccountReportSummaries(accountPage)",
  "libraryOwnerKind",
  'summary.reportType === "comparison"',
  '`/compare/${summary.id}`',
  'details className={styles.actionMenu}',
]) need("reports list", reportsList, marker);

for (const marker of [
  "--reports-bg: #050609",
  ".cardsGrid",
  ".actionMenuPanel",
  "background: #0b0e13 !important",
]) need("reports css", reportsCss, marker);

for (const marker of [
  'action === "claim_guest"',
  'action === "claim_legacy_report"',
  "Comparison reports are private and cannot be shared.",
]) need("owner route", ownerRoute, marker);

if (
  packageJson.scripts?.["check:account-reports-ui"] !==
  "node scripts/check-account-reports-ui-integration.mjs"
) {
  failures.push("package.json missing check:account-reports-ui script");
}

if (failures.length) {
  console.error("Account reports UI integration check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Account reports UI integration check passed.");