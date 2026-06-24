import type { AstrologyReport } from "@/types/astro";
import { getReportRepository } from "./report-repository";
import { notifyHalleusDataChanged } from "./storage-events";

export async function saveGeneratedReport(report: AstrologyReport) {
  const record = await getReportRepository().saveReport(report);

  notifyHalleusDataChanged();

  return record;
}
