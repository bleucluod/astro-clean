import { getChartEngineDriver } from "@/lib/chart-engine/chart-engine-factory";
import type { ChartEngineInput, ChartEngineResult } from "@/types/chart-engine";
import type { ChartEngineReportMetadata } from "@/types/chart-engine-report";

function getNestedString(source: Record<string, unknown>, key: string) {
  const input = source.input;

  if (typeof input === "object" && input !== null) {
    const value = (input as Record<string, unknown>)[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  const value = source[key];

  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function getNestedNumber(source: Record<string, unknown>, key: string) {
  const input = source.input;

  if (typeof input === "object" && input !== null) {
    const value = (input as Record<string, unknown>)[key];

    if (typeof value === "number") {
      return value;
    }
  }

  const value = source[key];

  return typeof value === "number" ? value : undefined;
}

export function extractChartEngineInput(report: object): ChartEngineInput {
  const source = report as Record<string, unknown>;

  return {
    name: getNestedString(source, "name") || undefined,
    birthDate: getNestedString(source, "birthDate"),
    birthTime: getNestedString(source, "birthTime"),
    birthCity: getNestedString(source, "birthCity"),
    birthCountry: getNestedString(source, "birthCountry") || "Iran",
    birthLatitude: getNestedNumber(source, "birthLatitude"),
    birthLongitude: getNestedNumber(source, "birthLongitude"),
    birthTimezone: getNestedString(source, "birthTimezone") || undefined,
  };
}

function createFallbackResult(input: ChartEngineInput, error: unknown): ChartEngineResult {
  return {
    engine: "mock-preview",
    stage: "mock-preview",
    input,
    placements: [],
    generatedAt: new Date().toISOString(),
    warnings: [
      `Chart engine integration fallback was used: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    ],
  };
}

export async function attachChartEngineMetadata<TReport extends object>(
  report: TReport,
): Promise<TReport & ChartEngineReportMetadata> {
  const source = report as TReport & Partial<ChartEngineReportMetadata>;

  if (source.chartEngineResult) {
    return source as TReport & ChartEngineReportMetadata;
  }

  const input = extractChartEngineInput(report);
  const driver = getChartEngineDriver();

  try {
    const result = await driver.generate(input);

    return {
      ...report,
      chartEngineIntegrationVersion: "v1-engine-path",
      chartEngineIntegratedAt: new Date().toISOString(),
      chartEngineResult: result,
    };
  } catch (error) {
    return {
      ...report,
      chartEngineIntegrationVersion: "v1-engine-path",
      chartEngineIntegratedAt: new Date().toISOString(),
      chartEngineResult: createFallbackResult(input, error),
    };
  }
}
