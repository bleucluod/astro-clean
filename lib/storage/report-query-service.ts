import type { AstrologyReport } from "@/types/astro";
import type { ReportRecordSummary } from "@/types/storage";
import { getReportRepository } from "./report-repository";
import { summarizeReportRecord } from "./report-records";

export async function listReportSummaries(): Promise<ReportRecordSummary[]> {
  const records = await getReportRepository().listReports();

  return records.map(summarizeReportRecord);
}

export async function getStoredReport(reportId: string): Promise<AstrologyReport | null> {
  const record = await getReportRepository().getReport(reportId);

  return record?.report ?? null;
}
