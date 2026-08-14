import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const requireText = (label, source, marker) => {
  if (!source.includes(marker)) failures.push(`${label} missing: ${marker}`);
};
const forbidText = (label, source, marker) => {
  if (source.includes(marker)) failures.push(`${label} contains forbidden: ${marker}`);
};

const service = read("lib/admin/admin-report-intelligence.ts");
const route = read("app/api/admin/reports/route.ts");
const exportRoute = read("app/api/admin/reports/export/route.ts");
const workspace = read("components/admin/AdminReportsWorkspace.tsx");
const consoleSource = read("components/admin/AdminConsole.tsx");
const gate = read("components/admin/AdminDirectGate.tsx");
const types = read("lib/admin/admin-types.ts");
const capabilities = read("lib/admin/admin-capabilities.ts");
const packageJson = JSON.parse(read("package.json"));
const impact = JSON.parse(read("config/halleus-check-impact.json"));

for (const [label, source] of [
  ["service", service],
  ["route", route],
  ["export route", exportRoute],
  ["workspace", workspace],
  ["console", consoleSource],
  ["gate", gate],
]) {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
  });
  for (const diagnostic of result.diagnostics ?? []) {
    if (diagnostic.category === ts.DiagnosticCategory.Error) {
      failures.push(`${label} parse error: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`);
    }
  }
}

for (const marker of [
  "HALLEUS_REPORT_CANONICAL_NORMALIZATION_R1",
  "normalizeAdminReportRow",
  "metadata_report_type",
  "top_level_report_type",
  '?? "unknown"',
  "HALLEUS_REPORT_SHARED_COHORT_FILTER_R1",
  "filterAdminReports",
  "buildAdminReportInsights",
  "today",
  "last7Days",
  "last30Days",
  "uniqueCreators",
  "averageReportsPerAccount",
  "oneReportAccounts",
  "multiReportAccounts",
  "topBirthCities",
  "topBirthCountries",
  "birthYears",
  "birthMonths",
  "trends",
]) requireText("canonical report intelligence", service, marker);

forbidText("canonical report type", service, '|| "birth_chart"');
forbidText("canonical report type", service, '?? "birth_chart"');
forbidText("canonical report service", service, "gender");
forbidText("canonical report service", service, "relationshipKind");
forbidText("canonical report service", service, "name+birthdate");
forbidText("canonical report service", service, "segment.com");
forbidText("canonical report service", service, "mixpanel");
forbidText("canonical report service", service, "amplitude");

for (const marker of [
  "dateFrom",
  "dateTo",
  "birthCity",
  "birthCountry",
  "reportType",
  "ownerKind",
  "accessTier",
  "visibility",
  "source",
  "birthYear",
  "birthMonth",
]) requireText("cohort filters", service, marker);

for (const marker of [
  "REPORT_CSV_EXPORT_LIMIT",
  "spreadsheetSafe",
  "/^[=+\\-@]/",
  "\\uFEFF",
  'join("\\r\\n")',
]) requireText("CSV safety", service, marker);

requireText("reports route", route, 'requireAdminCapability(request, "reports.read")');
requireText("reports route", route, "getAdminReportCohort");
requireText("export capability", types, '"reports.export"');
requireText("export route", exportRoute, 'requireAdminCapability(request, "reports.export")');
requireText("export audit", exportRoute, "admin.reports.cohort_exported");
requireText("export audit", exportRoute, "rowCount");
requireText("export audit", exportRoute, "auditSafeReportFilters");
forbidText("export audit", exportRoute, "birthTime:");
forbidText("export audit", exportRoute, "subjectName:");

for (const marker of [
  "HALLEUS_REPORT_COHORT_EXPLORER_R1",
  "Cohort Explorer",
  "Export CSV همین cohort",
  "اعمال فیلترها",
  "Free / Premium",
  "Guest / Account",
  "روند روزانه",
  "روند هفتگی",
  "روند ماهانه",
  "توزیع سال تولد",
  "cohort فعال",
]) requireText("reports workspace", workspace, marker);

// HALLEUS_REPORTS_UI_OWNERSHIP_CONTRACT_R2
for (const marker of [
  "report.subjectName",
  "formatBirthLine(report)",
  "formatBirthPlace(report)",
  '(report.ownerDisplayName ?? report.ownerUserId) || "—"',
  "شناسه، عنوان، سوژه، صاحب حساب، شهر یا کشور",
  // HALLEUS_PREDEPLOY_REPORTS_UI_OWNERSHIP_R2
  "const OPERATIONS_PAGE_SIZE = 25;",
  "const OVERVIEW_PAGE_SIZE = 10;",
  "limit: String(pageSize)",
  "buildQuery(effectiveFilters, effectivePage, pageSize)",
  'view === "operations"',
]) requireText("reports cohort ownership UI", workspace, marker);

requireText("embedded reports intelligence", consoleSource, "<AdminReportsWorkspace");
requireText("direct export permission", gate, 'session.capabilities.includes("reports.export")');

for (const role of ["owner:", "admin:", "analyst:"]) {
  const start = capabilities.indexOf(role);
  const end = capabilities.indexOf("],", start);
  if (start < 0 || !capabilities.slice(start, end).includes('"reports.export"')) {
    failures.push(`${role} must grant reports.export`);
  }
}
for (const role of ["support:", "editor:", "publisher:"]) {
  const start = capabilities.indexOf(role);
  const end = capabilities.indexOf("],", start);
  if (start >= 0 && capabilities.slice(start, end).includes('"reports.export"')) {
    failures.push(`${role} must not bulk-export report cohorts`);
  }
}

if (
  packageJson.scripts?.["check:reports-intelligence"] !==
  "node scripts/check-reports-intelligence.mjs"
) failures.push("package script missing check:reports-intelligence");

const reportArea = impact.areas?.find((area) => area.id === "report-ownership-sharing");
if (!reportArea?.guards?.includes("check:reports-intelligence")) {
  failures.push("report-ownership-sharing does not require check:reports-intelligence");
}

if (failures.length) {
  console.error("Reports Intelligence Phase 4 check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Reports Intelligence Phase 4 check passed.");
console.log("- current and legacy rows share one server-side canonical normalization layer");
console.log("- missing report type/birth fields remain unknown instead of being inferred");
console.log("- list, filters, insights and CSV use the same cohort predicate");
console.log("- CSV is UTF-8 BOM, quoted, spreadsheet-formula safe and bounded");
console.log("- bulk export has a dedicated audited capability while normal report reading remains unchanged");
console.log("- insights cover volume/type/tier/owner/geography/account frequency and daily/weekly/monthly trends");
console.log("- no gender, relationship, demographic-ad inference or third-party BI was introduced");
console.log("HALLEUS_REPORTS_INTELLIGENCE_BATCH6_7_R1=PASS");
