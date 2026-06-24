import type { AstrologyReport } from "@/types/astro";
import type { DatabaseReportRow, ReportRecord } from "@/types/storage";

export function toDatabaseReportRow(
  userId: string,
  record: ReportRecord,
): DatabaseReportRow {
  return {
    id: record.id,
    user_id: userId,
    report_json: record.report,
    note: record.note?.trim() || null,
    favorite: record.favorite,
    visibility: record.visibility,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

export function fromDatabaseReportRow(row: DatabaseReportRow): ReportRecord {
  const report = row.report_json as AstrologyReport;

  return {
    id: row.id,
    userId: row.user_id,
    report,
    input: report.input,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    favorite: row.favorite,
    note: row.note ?? undefined,
    visibility: row.visibility,
    source: "account",
  };
}
