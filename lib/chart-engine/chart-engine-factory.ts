import { createAstronomyEnginePrototypeDriver } from "@/lib/chart-engine/astronomy-engine-prototype";
import type { ChartEngineDriver } from "@/lib/chart-engine/chart-engine-driver";

export function getChartEngineDriver(): ChartEngineDriver {
  return createAstronomyEnginePrototypeDriver();
}
