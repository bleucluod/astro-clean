import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

const read = (file) => readFileSync(resolve(import.meta.dirname, "..", file), "utf8");
const checked = [
  "lib/admin/admin-report-intelligence.ts",
  "lib/admin/admin-service.ts",
  "lib/admin/admin-overview-trends.ts",
];
const parseFiles = [
  ...checked,
  "lib/admin/admin-types.ts",
  "components/admin/AdminReportsWorkspace.tsx",
];
for (const file of parseFiles) {
  const source = read(file);
  const result = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  const errors = (result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.equal(errors.length, 0, file + " TypeScript/TSX syntax");
}
for (const file of checked) {
  const source = read(file);
  assert.match(source, /deleted_by::text = r\.user_id/, file + " owner id cast");
  assert.match(source, /delete_reason = 'Deleted by report owner\.'/,
    file + " owner deletion sentinel");
  assert.match(source, /deletion_audit\.action = 'admin\.report\.soft_deleted'/,
    file + " admin override protection");
  assert.match(source, /deletion_audit\.success = true/,
    file + " successful audit");
}
assert.match(read("lib/admin/admin-service.ts"), /with counted_reports as \(/);
assert.match(read("lib/admin/admin-report-intelligence.ts"), /deletionState: row\.deleted_at/);
assert.match(read("components/admin/AdminReportsWorkspace.tsx"), /حذف‌شده توسط کاربر/);
assert.match(read("lib/storage/account-report-read-client.ts"), /method: "DELETE"/);
assert.match(read("lib/reports/report-access-service.ts"), /deleted_at is null/);

// Pure fixtures for the explicit admin accounting boundary.
// SQL above is separately checked to contain the same three required predicates.
function countable(report, hasSuccessfulAdminDeleteAudit = false) {
  if (report.deletedAt === null) return true;
  return report.deletedBy === report.ownerId &&
    report.reason === "Deleted by report owner." &&
    !hasSuccessfulAdminDeleteAudit;
}
const owner = "account-a";
assert.equal(countable({ ownerId: owner, deletedAt: null, deletedBy: null, reason: null }), true);
assert.equal(countable({ ownerId: owner, deletedAt: "2026-11-10", deletedBy: owner, reason: "Deleted by report owner." }), true);
assert.equal(countable({ ownerId: owner, deletedAt: "2026-11-10", deletedBy: "admin-b", reason: "test cleanup" }), false);
assert.equal(countable({ ownerId: owner, deletedAt: "2026-11-10", deletedBy: owner, reason: "Deleted by report owner." }, true), false);
assert.equal(countable({ ownerId: owner, deletedAt: "2026-11-10", deletedBy: null, reason: null }), false);
console.log("ADMIN_REPORT_DELETION_ACCOUNTING=PASS source syntax, query guards, owner/admin/ambiguous fixtures");
