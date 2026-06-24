import type { ChartEngineResult } from "@/types/chart-engine";

export type ChartEngineIntegrationVersion = "v1-engine-path";

export type ChartEngineReportMetadata = {
  chartEngineIntegrationVersion: ChartEngineIntegrationVersion;
  chartEngineIntegratedAt: string;
  chartEngineResult: ChartEngineResult;
};
