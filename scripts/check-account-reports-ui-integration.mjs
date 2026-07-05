import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function mustContain(label, text, token) {
  if (!text.includes(token)) {
    throw new Error(`${label} missing required token: ${token}`);
  }
}

function mustNotContain(label, text, token) {
  if (text.includes(token)) {
    throw new Error(`${label} must not contain forbidden token: ${token}`);
  }
}

const packageJson = JSON.parse(read("package.json"));
const reportsPage = read("app/reports/page.tsx");
const detailPage = read("app/reports/[reportId]/page.tsx");
const reportsList = read("components/ReportsList.tsx");
const reportDetail = read("components/ReportDetail.tsx");
const contextDoc = read("docs/HALLEUS_PROJECT_CONTEXT.md");
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");

mustContain("reports page", reportsPage, 'rawSource === "account"');
mustContain("reports page", reportsPage, "<ReportsList reportSource={reportSource} />");
mustContain("report detail route", detailPage, 'rawSource === "account"');
mustContain("report detail route", detailPage, "reportSource={reportSource}");

mustContain("reports list", reportsList, 'type ReportsListSource = "local" | "beta-db" | "account"');
mustContain("reports list", reportsList, 'const isAccountSource = reportSource === "account"');
mustContain("reports list", reportsList, "listAccountReportSummaries()");
mustContain("reports list", reportsList, "getAccountReportReadClientConfig()");
mustContain("reports list", reportsList, "?source=account");
mustContain("reports list", reportsList, "Account reports");
mustContain("reports list", reportsList, "private/noindex");
mustContain("reports list", reportsList, "migration");
mustContain("reports list", reportsList, "local reports");

mustContain("report detail", reportDetail, 'type ReportDetailSource = "local" | "beta-db" | "account"');
mustContain("report detail", reportDetail, "getAccountReportRecord(reportId)");
mustContain("report detail", reportDetail, 'reportSource === "account"');
mustContain("report detail", reportDetail, "isAccountReportSource");
mustContain("report detail", reportDetail, "read-only");
mustContain("report detail", reportDetail, "migration");
mustContain("report detail", reportDetail, "local reports");

mustContain("context doc", contextDoc, "v0.1.187 Account Reports UI Integration");
mustContain("context doc", contextDoc, "/reports?source=account");
mustContain("context doc", contextDoc, "/reports/[reportId]?source=account");
mustContain("context doc", contextDoc, "Local-to-account migration remains deferred");
mustContain("idea garden", ideaGarden, "Account reports UI integration");
mustContain("idea garden", ideaGarden, "/reports?source=account");
mustContain("idea garden", ideaGarden, "Migration from local-preview to account is deferred");

mustNotContain("reports list", reportsList, "localStorage.removeItem");
mustNotContain("report detail", reportDetail, "localStorage.removeItem");

if (
  packageJson.scripts?.["check:account-reports-ui"] !==
  "node scripts/check-account-reports-ui-integration.mjs"
) {
  throw new Error("package.json missing check:account-reports-ui script");
}

console.log("Account reports UI integration check passed.");
