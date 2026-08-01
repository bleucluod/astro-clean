import type { AstrologyReport } from "@/types/astro";
import type { ReportPublicationPolicyInput } from "@/types/report-generation";
import type { ReportRecord, ReportRecordSummary } from "@/types/storage";
import { createDatabaseReportRepository } from "@/lib/storage/database-report-repository";
import { getReportDatabaseDriver } from "@/lib/database/report-database-driver";
import { summarizeReportRecord } from "@/lib/storage/report-records";

export type ServerReportPersistenceOptions = {
  userId: string;
  publication?: ReportPublicationPolicyInput;
};

export type SaveServerReportInput = ServerReportPersistenceOptions & {
  report: AstrologyReport;
};

export type GetServerReportInput = ServerReportPersistenceOptions & {
  reportId: string;
};

function normalizeServerPersistenceId(value: string, label: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`${label} is required for server report persistence.`);
  }

  return normalizedValue;
}

export function createServerReportPersistenceRepository(
  options: ServerReportPersistenceOptions,
) {
  return createDatabaseReportRepository({
    userId: normalizeServerPersistenceId(options.userId, "userId"),
    publication: options.publication,
  });
}

export async function saveServerGeneratedReport({
  userId,
  report,
  publication,
}: SaveServerReportInput): Promise<ReportRecord> {
  const repository = createServerReportPersistenceRepository({
    userId,
    publication,
  });

  return repository.saveReport(report);
}

export async function getServerStoredReport({
  userId,
  reportId,
}: GetServerReportInput): Promise<ReportRecord | null> {
  const repository = createServerReportPersistenceRepository({ userId });

  return repository.getReport(
    normalizeServerPersistenceId(reportId, "reportId"),
  );
}

export async function listServerReportSummaries({
  userId,
}: ServerReportPersistenceOptions): Promise<ReportRecordSummary[]> {
  const repository = createServerReportPersistenceRepository({ userId });
  const records = await repository.listReports();

  return records.map(summarizeReportRecord);
}

export type GetPublicServerReportInput = {
  reportId: string;
};

export async function getPublicServerStoredReport({
  reportId,
}: GetPublicServerReportInput): Promise<ReportRecord | null> {
  const driver = getReportDatabaseDriver();

  return driver.getPublicReportById(
    normalizeServerPersistenceId(reportId, "reportId"),
  );
}
