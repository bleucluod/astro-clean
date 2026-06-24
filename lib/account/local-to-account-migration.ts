import type { ReportRecord } from "@/types/storage";

export type LocalToAccountMigrationPlan = {
  targetUserId: string;
  totalRecords: number;
  migratableRecords: number;
  skippedRecords: number;
  generatedAt: string;
};

export function prepareReportRecordForAccount(
  record: ReportRecord,
  targetUserId: string,
): ReportRecord {
  return {
    ...record,
    userId: targetUserId,
    source: "account",
    visibility: "private",
    updatedAt: new Date().toISOString(),
  };
}

export function createLocalToAccountMigrationPlan(
  records: ReportRecord[],
  targetUserId: string,
): LocalToAccountMigrationPlan {
  const migratableRecords = records.filter((record) => Boolean(record.report)).length;

  return {
    targetUserId,
    totalRecords: records.length,
    migratableRecords,
    skippedRecords: records.length - migratableRecords,
    generatedAt: new Date().toISOString(),
  };
}

export function prepareRecordsForAccountMigration(
  records: ReportRecord[],
  targetUserId: string,
): ReportRecord[] {
  return records
    .filter((record) => Boolean(record.report))
    .map((record) => prepareReportRecordForAccount(record, targetUserId));
}
