import { NextResponse } from "next/server";
import { buildRealChartWorkbenchResult } from "../../../../src/lib/chart/real-chart-engine";
import { buildChartReportEnrichment } from "../../../../src/lib/report-output/chart-enrichment";
import { buildRealChartReportCopy } from "../../../../src/lib/report-output/real-chart-report-copy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const realChart = buildRealChartWorkbenchResult({
      name: typeof body.name === "string" ? body.name : undefined,
      birthDate: typeof body.birthDate === "string" ? body.birthDate : undefined,
      birthTime: typeof body.birthTime === "string" ? body.birthTime : undefined,
      timezone: typeof body.timezone === "string" ? body.timezone : undefined,
      placeName: typeof body.placeName === "string" ? body.placeName : undefined,
      latitude: typeof body.latitude === "number" ? body.latitude : undefined,
      longitude: typeof body.longitude === "number" ? body.longitude : undefined,
    });
    const chartReportEnrichment = buildChartReportEnrichment(realChart.normalizedChart);
    const copyBlocks = buildRealChartReportCopy(chartReportEnrichment);
    const report = {
      id: `real-chart-workbench-${realChart.input.birthDate}`,
      title: realChart.input.name
        ? `چارت واقعی‌تر ${realChart.input.name}`
        : `چارت واقعی‌تر ${realChart.input.birthDate}`,
      normalizedChart: realChart.normalizedChart,
      chartReportEnrichment,
      engineMetadata: {
        source: "astronomy-engine",
        version: realChart.version,
        calculationNotes: realChart.calculationNotes,
      },
    };

    return NextResponse.json({
      ok: true,
      realChart,
      chartReportEnrichment,
      copyBlocks,
      report,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown real chart workbench error.",
      },
      { status: 400 },
    );
  }
}
