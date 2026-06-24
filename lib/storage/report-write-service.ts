import type { AstrologyReport } from "@/types/astro";
import { getReportRepository } from "./report-repository";
import { notifyHalleusDataChanged } from "./storage-events";

import { attachChartEngineMetadata } from "@/lib/chart-engine/report-engine-metadata";
export async function saveGeneratedReport(report: AstrologyReport) {
  const reportWithEngine = await attachChartEngineMetadata(report);
  const record = await getReportRepository().saveReport(reportWithEngine);

  notifyHalleusDataChanged();

  return record;
}
