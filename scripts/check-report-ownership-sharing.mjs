import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const migration = read("database/migrations/0006_report_ownership_sharing.sql");
const contract = read("lib/reports/report-access-contract.ts");
const accountRoute = read("app/api/reports/account/route.ts");
const reportPage = read("app/reports/[reportId]/page.tsx");
const sharedRoute = read("app/api/reports/shared/[shareToken]/route.ts");
const sharedPage = read("app/reports/shared/[shareToken]/page.tsx");
const service = read("lib/reports/report-access-service.ts");
const adminWorkspace = read("components/admin/AdminReportsWorkspace.tsx");
const adminConsole = read("components/admin/AdminConsole.tsx");
const sitemap = read("app/sitemap.ts");

for (const marker of ["share_token_hash", "share_enabled", "restricted_at", "deleted_at", "visibility = 'private'"]) {
  if (!migration.includes(marker)) throw new Error(`Report migration is missing ${marker}.`);
}
if (!migration.includes("'public', 'shared_by_link'")) throw new Error("Report migration must preserve rollback compatibility with the previous release.");
for (const marker of ["randomBytes(32)", "sha256", "REPORT_SUMMARY_PAGE_SIZE = 25", "validateReportTitle"]) {
  if (!contract.includes(marker)) throw new Error(`Report access contract is missing ${marker}.`);
}
if (accountRoute.includes("getPublicServerStoredReport")) throw new Error("Legacy unauthenticated report lookup is still enabled.");
if (reportPage.includes("getPublicServerStoredReport")) throw new Error("Legacy public report rendering is still enabled.");
if (sitemap.includes("/reports")) throw new Error("Report routes must remain outside the sitemap.");
for (const marker of ["share_token_hash", "deleted_at is null", "listOwnedReportSummaries", "softDeleteOwnedReport", "getSharedReport"]) if (!service.includes(marker)) throw new Error(`Report service is missing ${marker}.`);
const summaryQuery = service.slice(service.indexOf("export async function listOwnedReportSummaries"), service.indexOf("export async function getOwnedReport"));
if (summaryQuery.includes("select id, title, report_json")) throw new Error("Report summary query must not select the full report payload.");
for (const forbidden of ["'{input,birthDate}'", "'{input,birthTime}'", "'{input,birthCity}'", "'{input,birthCountry}'"]) if (summaryQuery.includes(forbidden)) throw new Error(`Report summary query exposes ${forbidden}.`);
if (!sharedRoute.includes("noindex, nofollow") || !sharedPage.includes("index: false")) throw new Error("Shared reports must remain noindex.");
for (const marker of ["limit=25", "update_title", "restrict_visibility", "soft_delete"]) if (!adminWorkspace.includes(marker)) throw new Error(`Admin report workspace is missing ${marker}.`);
for (const marker of ["response.status === 401", "setReports([])", "setPrivateReport(null)"]) if (!adminConsole.includes(marker)) throw new Error(`Admin authentication cleanup is missing ${marker}.`);

console.log("Report ownership and sharing contract check passed.");
