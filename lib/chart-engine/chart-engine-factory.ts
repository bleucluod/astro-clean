import { createFixtureChartEngine } from "@/lib/chart-engine/fixture-chart-engine";
import type { ChartEngineDriver } from "@/lib/chart-engine/chart-engine-driver";

export function getChartEngineDriver(): ChartEngineDriver {
  return createFixtureChartEngine();
}
