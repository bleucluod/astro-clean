import type { AccountMigrationPreflight } from "@/lib/account/account-migration-preflight";

export type AccountMigrationReviewStatus =
  | "backup-needed"
  | "ready-for-user-review"
  | "no-local-reports";

export type AccountMigrationReviewModel = {
  status: AccountMigrationReviewStatus;
  localReportCount: number;
  wouldImportCount: number;
  wouldSkipCount: number;
  canExecuteMigration: false;
  requiresUserConfirmation: true;
  requiresBackup: true;
  reviewItems: string[];
};

export function createAccountMigrationReviewModel(
  preflight: AccountMigrationPreflight,
): AccountMigrationReviewModel {
  const hasLocalReports = preflight.localReportCount > 0;

  return {
    status: hasLocalReports ? "backup-needed" : "no-local-reports",
    localReportCount: preflight.localReportCount,
    wouldImportCount: preflight.migratableCount,
    wouldSkipCount: preflight.skippedCount,
    canExecuteMigration: false,
    requiresUserConfirmation: true,
    requiresBackup: true,
    reviewItems: [
      "Export JSON before any account import.",
      "Review imported/skipped counts before enabling migration.",
      "Keep imported reports private/noindex.",
      "Do not delete browser-local reports until account import succeeds.",
    ],
  };
}
