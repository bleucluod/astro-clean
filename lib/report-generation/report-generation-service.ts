import { createMockReport } from "@/lib/astrology/mock-engine";
import { enrichReportWithRealEngineCopy } from "@/lib/astrology/real-engine-report-writer";
import { enhanceReportOutputV2 } from "@/lib/report-output/report-v2";
import type {
  AstrologyReport,
  BirthInput,
  RealEngineReportPlacement,
  RealEngineReportSnapshot,
  ZodiacKey,
} from "@/types/astro";
import type {
  ReportOutputQuality,
  ReportOutputSection,
} from "@/types/report-output";
import {
  REPORT_GENERATION_CONTRACT_VERSION,
  createEmptySeoDraft,
  createPrivatePreviewVisibility,
  type GeneratedReportContract,
  type GeneratedReportVisibility,
  type ReportGenerationInput,
  type ReportGenerationResult,
  type ReportGenerationStatus,
} from "@/types/report-generation";
import type { NormalizedChart } from "../../src/lib/chart/normalized-chart";
import {
  buildRealChartWorkbenchResult,
  type RealChartBirthInput,
  type RealChartCalculatedPlacement,
  type RealChartWorkbenchResult,
} from "../../src/lib/chart/real-chart-engine";
import {
  buildChartReportEnrichment,
  type ChartReportEnrichment,
} from "../../src/lib/report-output/chart-enrichment";
import { buildRealChartReportCopy } from "../../src/lib/report-output/real-chart-report-copy";

export const REPORT_GENERATION_SERVICE_VERSION = "0.1.94" as const;

type SectionedAstrologyReport = AstrologyReport & {
  interpretationSections: ReportOutputSection[];
  outputQuality: ReportOutputQuality;
};

type RealChartAttempt =
  | {
      ok: true;
      realChart: RealChartWorkbenchResult;
      warning: string | null;
    }
  | {
      ok: false;
      realChart: null;
      warning: string;
    };

export type ReportGenerationServiceOptions = {
  generatedAt?: string;
  realChart?: RealChartWorkbenchResult | null;
  fallbackReason?: string | null;
};

export type ReportGenerationServiceContract =
  GeneratedReportContract<NormalizedChart>;

export function generateReportContract(
  request: ReportGenerationInput,
  options: ReportGenerationServiceOptions = {},
): ReportGenerationResult<NormalizedChart> {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const issues = validateReportGenerationInput(request.input);

  if (issues.length > 0) {
    return {
      ok: false,
      status: "blocked-invalid-input",
      message: "Report generation input is incomplete.",
      issues,
    };
  }

  const baseReport = buildBaseReport(request.input);
  const realChartAttempt = resolveRealChartAttempt(request.input, options);

  if (realChartAttempt.ok) {
    return {
      ok: true,
      contract: buildRealChartContract({
        request,
        generatedAt,
        baseReport,
        realChart: realChartAttempt.realChart,
        warning: realChartAttempt.warning,
      }),
    };
  }

  return {
    ok: true,
    contract: buildFallbackContract({
      request,
      generatedAt,
      baseReport,
      reason: options.fallbackReason ?? realChartAttempt.warning,
    }),
  };
}

export function validateReportGenerationInput(input: BirthInput): string[] {
  const issues: string[] = [];

  if (!hasText(input.birthDate)) {
    issues.push("birthDate is required.");
  }

  if (!hasText(input.birthTime)) {
    issues.push("birthTime is required.");
  }

  if (!hasText(input.birthCity)) {
    issues.push("birthCity is required.");
  }

  if (!hasText(input.birthCountry)) {
    issues.push("birthCountry is required.");
  }

  return issues;
}

export function canBuildRealChart(input: BirthInput): boolean {
  return (
    hasText(input.birthDate) &&
    hasText(input.birthTime) &&
    hasText(input.birthTimezone) &&
    typeof input.birthLatitude === "number" &&
    Number.isFinite(input.birthLatitude) &&
    typeof input.birthLongitude === "number" &&
    Number.isFinite(input.birthLongitude)
  );
}

export function buildRealChartBirthInput(input: BirthInput): RealChartBirthInput {
  if (!canBuildRealChart(input)) {
    throw new Error(
      "Real chart generation needs birthDate, birthTime, birthTimezone, birthLatitude, and birthLongitude.",
    );
  }

  return {
    name: normalizeNullableText(input.name) ?? undefined,
    birthDate: input.birthDate,
    birthTime: input.birthTime,
    timezone: input.birthTimezone as string,
    placeName: input.birthCity,
    latitude: input.birthLatitude as number,
    longitude: input.birthLongitude as number,
  };
}

export function buildRealEngineSnapshot(
  realChart: RealChartWorkbenchResult,
  input: BirthInput,
  generatedAt: string,
): RealEngineReportSnapshot {
  return {
    version: "real-engine-preview-v1",
    generatedAt,
    cityLabel: input.birthCity,
    utcIso: realChart.utcIso,
    ascendantLongitude: realChart.ascendantLongitude,
    placements: realChart.placements.map(toRealEnginePlacement),
    note:
      "این داده محاسبه‌شده از مسیر report generation service ساخته شده و تا قبل از اتصال کامل public/private reports، به‌عنوان preview ذخیره می‌شود.",
  };
}

export function buildDefaultReportVisibility(
  request: ReportGenerationInput,
): GeneratedReportVisibility {
  const nickname = normalizeNullableText(request.nickname ?? null);
  const requestedVisibility = request.requestedVisibility;

  if (!requestedVisibility || requestedVisibility === "local-private-preview") {
    return createPrivatePreviewVisibility(nickname);
  }

  const requiresPublicConsent = requestedVisibility.startsWith("free-public");
  const visibility = createPrivatePreviewVisibility(nickname);

  return {
    ...visibility,
    kind: requestedVisibility,
    indexingPolicy: "noindex",
    consent: {
      ...visibility.consent,
      required: requiresPublicConsent,
      copyVersion: "visibility-consent-not-yet-active",
      userFacingSummary:
        "Requested visibility is recorded, but public indexing is disabled until explicit consent, slugs, and storage rules are implemented.",
    },
    notes: [
      ...visibility.notes,
      "Visibility request is metadata only in v0.1.94; public routes and paid privacy rules are not active yet.",
    ],
  };
}

function buildRealChartContract({
  request,
  generatedAt,
  baseReport,
  realChart,
  warning,
}: {
  request: ReportGenerationInput;
  generatedAt: string;
  baseReport: SectionedAstrologyReport;
  realChart: RealChartWorkbenchResult;
  warning: string | null;
}): ReportGenerationServiceContract {
  const chartReportEnrichment = buildChartReportEnrichment(
    realChart.normalizedChart,
  );
  const copyBlocks = buildRealChartReportCopy(chartReportEnrichment);
  const realEngineSnapshot = buildRealEngineSnapshot(
    realChart,
    request.input,
    generatedAt,
  );
  const report = enrichReportWithRealEngineCopy(
    {
      ...baseReport,
      realEngine: realEngineSnapshot,
    },
    realEngineSnapshot,
  ) as SectionedAstrologyReport;
  const status = getRealChartGenerationStatus(chartReportEnrichment);
  const limitations = [
    ...chartReportEnrichment.limitations,
    ...realChart.calculationNotes,
  ];
  const warnings = [
    warning,
    "House and ascendant data are still preview/hardening layers, not final paid-report guarantees.",
  ].filter((item): item is string => Boolean(item));

  return {
    contractVersion: REPORT_GENERATION_CONTRACT_VERSION,
    generatedAt,
    status,
    input: request.input,
    report,
    engineData: {
      source: "astronomy-engine",
      status,
      generatedAt,
      realEngineSnapshot,
      normalizedChart: realChart.normalizedChart,
      chartReportEnrichment,
      copyBlocks,
      limitations,
      warnings,
    },
    interpretationSections: report.interpretationSections,
    outputQuality: report.outputQuality,
    visibility: buildDefaultReportVisibility(request),
    seoDraft: createEmptySeoDraft(),
    fallback: {
      used: false,
      reason: null,
      safeUserMessage: null,
    },
  };
}

function buildFallbackContract({
  request,
  generatedAt,
  baseReport,
  reason,
}: {
  request: ReportGenerationInput;
  generatedAt: string;
  baseReport: SectionedAstrologyReport;
  reason: string;
}): ReportGenerationServiceContract {
  const status: ReportGenerationStatus = "fallback-preview";

  return {
    contractVersion: REPORT_GENERATION_CONTRACT_VERSION,
    generatedAt,
    status,
    input: request.input,
    report: baseReport,
    engineData: {
      source: "mock-fallback",
      status,
      generatedAt,
      realEngineSnapshot: null,
      normalizedChart: null,
      chartReportEnrichment: null,
      copyBlocks: [],
      limitations: [
        "Real chart data was not available for this generation attempt.",
      ],
      warnings: [reason],
    },
    interpretationSections: baseReport.interpretationSections,
    outputQuality: baseReport.outputQuality,
    visibility: buildDefaultReportVisibility(request),
    seoDraft: createEmptySeoDraft(),
    fallback: {
      used: true,
      reason,
      safeUserMessage:
        "Halleus kept a safe preview report instead of blocking the report flow.",
    },
  };
}

function buildBaseReport(input: BirthInput): SectionedAstrologyReport {
  return enhanceReportOutputV2(createMockReport(input)) as SectionedAstrologyReport;
}

function resolveRealChartAttempt(
  input: BirthInput,
  options: ReportGenerationServiceOptions,
): RealChartAttempt {
  if (options.realChart) {
    return {
      ok: true,
      realChart: options.realChart,
      warning: null,
    };
  }

  if (!canBuildRealChart(input)) {
    return {
      ok: false,
      realChart: null,
      warning:
        "Real chart generation skipped because timezone or coordinates are missing.",
    };
  }

  try {
    return {
      ok: true,
      realChart: buildRealChartWorkbenchResult(buildRealChartBirthInput(input)),
      warning: null,
    };
  } catch (error) {
    return {
      ok: false,
      realChart: null,
      warning:
        error instanceof Error
          ? error.message
          : "Real chart generation failed for an unknown reason.",
    };
  }
}

function getRealChartGenerationStatus(
  enrichment: ChartReportEnrichment,
): ReportGenerationStatus {
  return enrichment.status === "ready"
    ? "real-chart-ready"
    : "real-chart-partial";
}

function toRealEnginePlacement(
  placement: RealChartCalculatedPlacement,
): RealEngineReportPlacement {
  return {
    id: placement.id,
    label: placement.label,
    longitude: placement.longitude,
    signId: toZodiacKey(placement.signId),
    degreeInSign: placement.degreeInSign,
    method: placement.method,
  };
}

function toZodiacKey(value: string): ZodiacKey {
  if (ZODIAC_KEYS.includes(value as ZodiacKey)) {
    return value as ZodiacKey;
  }

  return "aries";
}

function normalizeNullableText(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  return normalized && normalized.length > 0 ? normalized : null;
}

function hasText(value: string | null | undefined): value is string {
  return normalizeNullableText(value) !== null;
}

const ZODIAC_KEYS = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
] as const satisfies readonly ZodiacKey[];
