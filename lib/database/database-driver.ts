import type { DatabaseReportRow, ReportRecord } from "@/types/storage";

export type DatabaseHealthStatus = {
  ok: boolean;
  driver: "not-configured" | "postgres";
  checkedAt: string;
  message: string;
};

export type ReportDatabaseDriver = {
  healthCheck(): Promise<DatabaseHealthStatus>;
  listReportsByUser(userId: string): Promise<ReportRecord[]>;
  getReportById(userId: string, reportId: string): Promise<ReportRecord | null>;
  upsertReport(userId: string, record: ReportRecord): Promise<ReportRecord>;
  deleteReport(userId: string, reportId: string): Promise<void>;
};

export type ReportRowMapper = {
  toDatabaseRow(userId: string, record: ReportRecord): DatabaseReportRow;
  fromDatabaseRow(row: DatabaseReportRow): ReportRecord;
};
