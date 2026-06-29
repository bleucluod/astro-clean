import { NextResponse } from "next/server";
import { generateReportContract } from "@/lib/report-generation";
import type { BirthInput, RealEngineReportSnapshot } from "@/types/astro";
import type {
  GeneratedReportContract,
  ReportCalculationSource,
} from "@/types/report-generation";

export const runtime = "nodejs";

type RealChartRouteBody = Record<string, unknown>;

type LegacyRealChartPayload = {
  utcIso: string;
  ascendantLongitude: number;
  calculationNotes: string[];
  placements: RealEngineReportSnapshot["placements"];
};

type ReportOutputQualityLike = {
  warnings?: string[];
  [key: string]: unknown;
};

type RouteReportResponse = NonNullable<GeneratedReportContract["report"]> & {
  title: string;
  subjectName: string | null;
  calculationSource: ReportCalculationSource;
  outputQuality?: ReportOutputQualityLike;
};

type RouteReportGenerationResponse = GeneratedReportContract & {
  title: string;
  reportTitle: string;
  calculationSource: ReportCalculationSource;
  report: RouteReportResponse | null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RealChartRouteBody;
    const input = buildBirthInputFromRequest(body);
    const generation = generateReportContract({
      input,
      nickname: readString(body.nickname),
    });

    if (!generation.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: generation.message,
          issues: generation.issues,
          reportGeneration: generation,
        },
        { status: 400 },
      );
    }

    const contract = generation.contract;
    const realChart = buildLegacyRealChartPayload(contract);
    const hasRealChart = realChart !== null;
    const report = buildRouteReportResponse(contract);
    const reportTitle = report?.title ?? buildReportTitle(contract);
    const reportGeneration = buildRouteReportGenerationResponse(
      contract,
      report,
      reportTitle,
    );

    return NextResponse.json({
      ok: hasRealChart,
      error: hasRealChart
        ? undefined
        : contract.fallback.safeUserMessage ??
          "Real chart generation fell back to a safe preview report.",
      realChart,
      chartReportEnrichment: contract.engineData.chartReportEnrichment,
      copyBlocks: contract.engineData.copyBlocks,
      report,
      reportGeneration,
      fallback: contract.fallback,
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

function buildBirthInputFromRequest(body: RealChartRouteBody): BirthInput {
  const placeName =
    readString(body.placeName) ?? readString(body.birthCity) ?? "Unknown place";

  return {
    name: readString(body.name) ?? undefined,
    birthDate: readString(body.birthDate) ?? "",
    birthTime: readString(body.birthTime) ?? "",
    birthCity: placeName,
    birthCountry: readString(body.birthCountry) ?? "ایران",
    birthCityId: readString(body.birthCityId) ?? undefined,
    birthLatitude: readNumber(body.latitude) ?? readNumber(body.birthLatitude),
    birthLongitude:
      readNumber(body.longitude) ?? readNumber(body.birthLongitude),
    birthTimezone:
      readString(body.timezone) ?? readString(body.birthTimezone) ?? undefined,
  };
}

function buildLegacyRealChartPayload(
  contract: GeneratedReportContract,
): LegacyRealChartPayload | null {
  const snapshot = contract.engineData.realEngineSnapshot;

  if (!snapshot) {
    return null;
  }

  return {
    utcIso: snapshot.utcIso,
    ascendantLongitude: snapshot.ascendantLongitude,
    calculationNotes: [
      ...contract.engineData.limitations,
      ...contract.engineData.warnings,
    ],
    placements: snapshot.placements,
  };
}

function buildRouteReportResponse(
  contract: GeneratedReportContract,
): RouteReportResponse | null {
  if (!contract.report) {
    return null;
  }

  const title = buildReportTitle(contract);

  return {
    ...contract.report,
    title,
    subjectName: readString(contract.input.name),
    calculationSource: contract.engineData.source,
    outputQuality: buildRouteOutputQuality(contract),
  };
}

function buildRouteReportGenerationResponse(
  contract: GeneratedReportContract,
  report: RouteReportResponse | null,
  title: string,
): RouteReportGenerationResponse {
  return {
    ...contract,
    title,
    reportTitle: title,
    calculationSource: contract.engineData.source,
    report,
  };
}

function buildReportTitle(contract: GeneratedReportContract): string {
  const name = readString(contract.input.name);
  const city = readString(contract.input.birthCity);

  if (name && city) {
    return `گزارش چارت تولد ${name} - ${city}`;
  }

  if (name) {
    return `گزارش چارت تولد ${name}`;
  }

  if (city) {
    return `گزارش چارت تولد - ${city}`;
  }

  return "گزارش چارت تولد Halleus";
}

function buildRouteOutputQuality(
  contract: GeneratedReportContract,
): ReportOutputQualityLike | undefined {
  const outputQuality = (
    contract.report as { outputQuality?: ReportOutputQualityLike } | null
  )?.outputQuality;

  if (!outputQuality) {
    return undefined;
  }

  const warnings = Array.isArray(outputQuality.warnings)
    ? outputQuality.warnings.filter((warning) => !isOutdatedOutputWarning(warning))
    : [];

  if (contract.engineData.realEngineSnapshot) {
    warnings.push(
      "Real chart placements are active through the report generation service; house and ascendant data remain preview/hardening layers.",
    );
  }

  return {
    ...outputQuality,
    warnings,
  };
}

function isOutdatedOutputWarning(value: string): boolean {
  const normalized = value.toLowerCase();

  return (
    normalized.includes("real chart placements are not active yet") ||
    normalized.includes("real chart placements are not active")
  );
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return value;
}
