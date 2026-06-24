import { createMockPreviewChartEngine } from "@/lib/chart-engine/mock-preview-engine";
import type { ChartEngineDriver } from "@/lib/chart-engine/chart-engine-driver";

export function getChartEngineDriver(): ChartEngineDriver {
  return createMockPreviewChartEngine();
}
