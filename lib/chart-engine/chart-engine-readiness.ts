import { getChartEngineDriver } from "@/lib/chart-engine/chart-engine-factory";
import type { ChartEngineReadinessReport } from "@/types/chart-engine";

export function getChartEngineReadinessReport(): ChartEngineReadinessReport {
  return getChartEngineDriver().getReadiness();
}
