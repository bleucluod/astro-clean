import type {
  ChartEngineInput,
  ChartEngineReadinessReport,
  ChartEngineResult,
  ChartEngineSlug,
} from "@/types/chart-engine";

export type ChartEngineDriver = {
  slug: ChartEngineSlug;
  generate(input: ChartEngineInput): Promise<ChartEngineResult>;
  getReadiness(): ChartEngineReadinessReport;
};

export function validateChartEngineInput(input: ChartEngineInput) {
  const missingFields: string[] = [];

  if (!input.birthDate) missingFields.push("birthDate");
  if (!input.birthTime) missingFields.push("birthTime");
  if (!input.birthCity) missingFields.push("birthCity");
  if (!input.birthCountry) missingFields.push("birthCountry");

  return {
    ok: missingFields.length === 0,
    missingFields,
  };
}
