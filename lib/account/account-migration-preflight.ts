import type { ReportRecordSummary } from "@/types/storage";

export type AccountMigrationPreflightStage =
  | "no-local-reports"
  | "local-reports-ready"
  | "blocked";

export type AccountMigrationPreflight = {
  stage: AccountMigrationPreflightStage;
  localReportCount: number;
  migratableCount: number;
  skippedCount: number;
  favoriteCount: number;
  noteCount: number;
  privateCount: number;
  canStartAccountMigration: false;
  requiresBackup: true;
  requiresRealLogin: true;
  safeNextActions: string[];
  blockedActions: string[];
};

export function createAccountMigrationPreflight(
  summaries: ReportRecordSummary[],
): AccountMigrationPreflight {
  const localSummaries = summaries.filter(
    (summary) => summary.source === "local-preview",
  );
  const migratableCount = localSummaries.filter((summary) => summary.id.trim()).length;
  const skippedCount = localSummaries.length - migratableCount;

  return {
    stage: localSummaries.length > 0 ? "local-reports-ready" : "no-local-reports",
    localReportCount: localSummaries.length,
    migratableCount,
    skippedCount,
    favoriteCount: localSummaries.filter((summary) => summary.favorite).length,
    noteCount: localSummaries.filter((summary) => summary.hasNote).length,
    privateCount: localSummaries.filter(
      (summary) => summary.visibility === "private",
    ).length,
    canStartAccountMigration: false,
    requiresBackup: true,
    requiresRealLogin: true,
    safeNextActions: [
      "Take a JSON export from the reports library.",
      "Keep local-preview reports until account import succeeds.",
      "Review imported/skipped counts before enabling migration.",
    ],
    blockedActions: [
      "Do not import to account storage yet.",
      "Do not delete local-preview reports.",
      "Do not make migrated reports public or indexable.",
    ],
  };
}

export function describeAccountMigrationPreflight(
  preflight: AccountMigrationPreflight,
) {
  if (preflight.localReportCount === 0) {
    return "هیچ گزارش local-preview برای مهاجرت پیدا نشده است.";
  }

  return `${preflight.localReportCount.toLocaleString("fa-IR")} گزارش local-preview برای پیش‌پرواز مهاجرت شناسایی شد؛ اجرای مهاجرت هنوز غیرفعال است.`;
}
