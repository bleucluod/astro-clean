import { NextResponse } from "next/server";
import { generateReportContract } from "@/lib/report-generation";
import type { BirthInput, RealEngineReportSnapshot } from "@/types/astro";
import type { GeneratedReportContract } from "@/types/report-generation";

export const runtime = "nodejs";

type RealChartRouteBody = Record<string, unknown>;

type LegacyRealChartPayload = {
  utcIso: string;
  ascendantLongitude: number;
  calculationNotes: string[];
  placements: RealEngineReportSnapshot["placements"];
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

    return NextResponse.json({
      ok: hasRealChart,
      error: hasRealChart
        ? undefined
        : contract.fallback.safeUserMessage ??
          "Real chart generation fell back to a safe preview report.",
      realChart,
      chartReportEnrichment: contract.engineData.chartReportEnrichment,
      copyBlocks: contract.engineData.copyBlocks,
      report: contract.report,
      reportGeneration: contract,
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
