import fs from "node:fs";

// HALLEUS_REPORT_FINAL_SLICE_GUARD_R3_20260919
const failures = [];
const read = (path) => fs.readFileSync(path, "utf8");
const need = (label, source, marker) => {
  if (!source.includes(marker)) failures.push(`${label} missing: ${marker}`);
};
const forbid = (label, source, marker) => {
  if (source.includes(marker)) failures.push(`${label} still contains: ${marker}`);
};

const guest = read("lib/auth/guest-report-session.ts");
const owner = read("app/api/reports/owner/route.ts");
const save = read("lib/storage/account-report-save-client.ts");
const reads = read("lib/storage/account-report-read-client.ts");
const migration = read("lib/account/server-canonical-report-migration-client.ts");
const auth = read("components/SupabaseAuthPanel.tsx");
const chart = read("components/ChartForm.tsx");
const reportsPage = read("app/reports/page.tsx");
const reportsList = read("components/ReportsList.tsx");
const detailPage = read("app/reports/[reportId]/page.tsx");
const detail = read("components/ReportDetail.tsx");
const cta = read("components/report/ReportAccountCta.tsx");
const css = read("components/report/human-first-report.module.css");
const composer = read("components/comparison/ComparisonComposer.tsx");
const comparison = read("components/comparison/ComparisonReport.tsx");
const comparisonClient = read("lib/comparison/comparison-account-client.ts");
const policy = read("lib/monetization/access-policy.ts");
const adaptive = read("components/report/ReportAdaptiveNarrative.tsx");
const profile = read("lib/account/account-profile-service.ts");
const initialSchema = read("database/migrations/0001_initial_schema.sql");
const freeAllMigration = read("database/migrations/0016_free_all_report_access_mode.sql");
const accessService = read("lib/reports/report-access-service.ts");
const serverPersistence = read("lib/storage/server-report-persistence.ts");
const productReader = read("components/report/ReportProductReader.tsx");

for (const marker of [
  "createHmac",
  "timingSafeEqual",
  "GUEST_REPORT_COOKIE_NAME",
  "httpOnly: true",
  'sameSite: "lax"',
]) need("guest identity", guest, marker);

for (const marker of [
  'action === "claim_guest"',
  'action === "claim_legacy_report"',
  'action === "claim_legacy_comparison"',
  "LEGACY_PUBLIC_REPORT_OWNER_USER_ID",
  'publicationIntent: "unpublish"',
  "visibility = 'unpublished'",
  "publication_state = 'unpublished'",
  "report_json = ${sql.json(report)}::jsonb",
  "report_json = ${sql.json(stored)}::jsonb",
  "HALLEUS_REPORT_OWNER_CLAIM_PROFILE_FINISH_R3_20260919",
  "getClaimableCurrentNatalReport",
  "syncAccountBirthDateFromReport",
  "initializeAccountProfileFromBirthInput",
  "currentReportId",
  "profileSync",
]) need("owner route", owner, marker);

for (const marker of [
  "HALLEUS_SERVER_CANONICAL_REPORT_SAVE_R1_20260919",
  'fetch("/api/reports/owner"',
  "ensureServerCanonicalReport",
]) need("server save", save, marker);
forbid("server save", save, "saveGeneratedReport(report)");

for (const marker of [
  "/api/reports/owner?page=",
  "/api/reports/owner?reportId=",
  "ownerKind: CurrentReportOwnerKind",
]) need("server reads", reads, marker);

for (const marker of [
  "HALLEUS_SERVER_CANONICAL_LEGACY_MIGRATION_R3_20260919",
  "HALLEUS_REPORT_CTA_CLAIM_PROFILE_FINISH_R2_20260919",
  "claimCurrentGuestReport",
  "currentReportId",
  "await repository.deleteReport(record.id)",
  "loadPrivateComparisons",
]) need("legacy migration", migration, marker);

for (const marker of [
  "reconcileServerCanonicalReports",
  "initialMode?: AuthMode",
  'initialMode = "sign-in"',
  "useState<AuthMode>(initialMode)",
]) need("auth", auth, marker);

need("chart", chart, "const nextPath = `/reports/${saveResult.accountRecord.id}?source=account`;");

// HALLEUS_OWNER_PRIVATE_PARITY_GUARD_R17_20260920
for (const marker of [
  "HALLEUS_OWNER_PRIVATE_PARITY_R16_20260920",
  "assertOwnerPrivateReportParity(report, reportRecord.report);",
  "Owner report integrity check failed: name was not preserved.",
  "Owner report integrity check failed: current residence was not preserved.",
  "Owner report integrity check failed: personal transit availability was not preserved.",
  "Owner report integrity check failed: personal transit status was not preserved.",
]) need("owner private parity", owner, marker);

forbid("chart owner navigation", chart, "?source=public");
need("owner report reader", productReader, "engineData?.personalTransitReportData ?? null");
need("owner report reader", productReader, "report.input.name?.trim()");

const ownedReadStart = accessService.indexOf(
  "export async function getOwnedReport",
);
const ownedReadEnd = accessService.indexOf(
  "export type OwnedReportPublicationMutationResult",
  ownedReadStart,
);
if (ownedReadStart < 0 || ownedReadEnd < 0 || ownedReadEnd <= ownedReadStart) {
  failures.push("owner read block could not be isolated");
} else {
  const ownedReadBlock = accessService.slice(ownedReadStart, ownedReadEnd);
  forbid("owner private read", ownedReadBlock, "projectPrivateShareReport(");
  forbid("owner private read", ownedReadBlock, "projectPublicReportRecord(");
}

need(
  "private share projection",
  serverPersistence,
  "export function projectPrivateShareReport(",
);
need(
  "public projection",
  serverPersistence,
  "export function projectPublicReportRecord(",
);
const transitRedactionCount = serverPersistence.split(
  "personalTransitReportData: null",
).length - 1;
if (transitRedactionCount < 2) {
  failures.push(
    `privacy projections must keep personal transit redacted; found ${transitRedactionCount}`,
  );
}
forbid("chart", chart, "نسخه همین دستگاه آماده شد");

need("reports page", reportsPage, 'data-reports-library="server-canonical-v1"');
forbid("reports page", reportsPage, 'href="/reports?source=local"');
need("reports list", reportsList, "reconcileServerCanonicalReports");
need("reports list", reportsList, "libraryOwnerKind");
need("detail source", detailPage, 'return "account";');

for (const marker of [
  "ReportAccountCta",
  "reportId={report.id}",
  'accountOwnerKind === "guest"',
  'setAccountOwnerKind("account")',
]) need("detail CTA", detail, marker);

for (const marker of [
  "HALLEUS_REPORT_CTA_SYNASTRY_AUTH_FINISH_R2_20260919",
  "REVEAL_PROGRESS = 0.22",
  "--wiki-cta-progress-angle",
  'initialMode="sign-up"',
  "claimCurrentGuestReport",
  "!pendingAccessToken ? (",
  "قصه‌ی یک رابطه، از کنار هم گذاشتن دو آسمان شروع می‌شود",
  "برای ساخت چارت سیناستری، اول این چارت را در حسابت نگه دار.",
  "ذخیره چارت و ساخت سیناستری",
]) need("report CTA", cta, marker);
forbid("report CTA", cta, "window.location.reload()");
forbid("report CTA", cta, "ساخت حساب و نگه‌داشتن گزارش");

for (const marker of [
  "HALLEUS_REPORT_MOBILE_CANONICAL_DESKTOP_R5_20260919",
  "HALLEUS_REPORT_ACCOUNT_CTA_WIKI_PARITY_R3_20260919",
  "HALLEUS_REPORT_DESKTOP_GEOMETRY_FINISH_R2_20260919",
  "HALLEUS_REPORT_AUTH_DARK_SURFACE_FINISH_R2_20260919",
  "conic-gradient(",
  "from var(--wiki-cta-progress-angle)",
  ".fullReportStage",
  "grid-template-columns: minmax(0, 1fr) !important;",
  ".reportAccountAuthDialog :global(.chart-account-save-note)",
  "display: none !important;",
]) need("report CSS", css, marker);

for (const marker of [
  "ensureServerCanonicalReport(chartA)",
  "ensureServerCanonicalReport(chartB)",
  "saveComparisonToAccount(result.record",
]) need("comparison composer", composer, marker);

for (const marker of [
  "async function resolveCanonicalNatal(reportId: string)",
  "const server = await getAccountReportRecord(reportId);",
  "resolveCanonicalNatal(record.chartAId)",
  "resolveCanonicalNatal(record.chartBId)",
  "ensureServerCanonicalReport(legacyLocal)",
]) need("comparison detail", comparison, marker);

need("comparison client", comparisonClient, 'fetch("/api/reports/owner"');
need("comparison client", comparisonClient, 'detail.ownerKind === "account" ? "saved" : "guest-saved"');

need("free launch policy", policy, 'monetizationMode: "FREE_ALL"');
need("free launch adaptive", adaptive, "const monetizationConfigured =");
need("free launch adaptive", adaptive, 'accessPolicy.monetizationMode === "CONFIGURED";');
need("free launch adaptive", adaptive, "monetizationConfigured && !isPremium && lockedItems.length > 0");

need("DOB initialize", profile, "profile_birth_date = coalesce(profile_birth_date");
need("DOB initialize", profile, "initializeAccountProfileFromBirthInput");

for (const marker of [
  "id text primary key",
  "user_id text not null references halleus_users(id)",
]) need("report id schema", initialSchema, marker);
forbid("owner route text-id contract", owner, "::uuid");
for (const marker of [
  "HALLEUS_FREE_ALL_ACCESS_MODE_MIGRATION_BATCH1_R1",
  "'{monetizationMode}'",
  "'FREE_ALL'",
]) need("production FREE_ALL migration", freeAllMigration, marker);

if (failures.length) {
  console.error("Server-canonical report final-slice check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Server-canonical report final-slice check passed.");
console.log("- FREE_ALL fallback cannot surface the report paywall.");
console.log("- CTA copy, same-page sign-up, current-report claim and DOB initialization are wired.");
console.log("- mobile remains canonical while desktop geometry is repaired separately.");
console.log("HALLEUS_REPORT_FINAL_SLICE_GUARD_R3_20260919=PASS");
