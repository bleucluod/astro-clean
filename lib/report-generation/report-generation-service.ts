import { createMockReport } from "@/lib/astrology/mock-engine";
import { enrichReportWithRealEngineCopy } from "@/lib/astrology/real-engine-report-writer";
import { enhanceReportOutputV2 } from "@/lib/report-output/report-v2";
import type {
  AstrologyReport,
  BirthInput,
  RealEngineReportAngle,
  RealEngineReportAngleId,
  RealEngineReportAngles,
  RealEngineReportCalculationQuality,
  RealEngineReportDeferredCalculation,
  RealEngineReportHouse,
  RealEngineReportHouseContext,
  RealEngineReportHouseNumber,
  RealEngineReportCalculatedLilith,
  RealEngineReportLunarNodePoint,
  RealEngineReportLunarNodes,
  RealEngineReportPlacement,
  RealEngineReportRetrogradeStatus,
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
import { getHouseNumberFromCusps } from "../../src/lib/chart/houses";
import {
  buildRealChartWorkbenchResult,
  type RealChartBirthInput,
  type RealChartCalculatedAngle,
  type RealChartCalculatedLilith,
  type RealChartCalculatedLunarNode,
  type RealChartCalculatedPlacement,
  type RealChartWorkbenchResult,
} from "../../src/lib/chart/real-chart-engine";
import {
  buildChartReportEnrichment,
  type ChartReportEnrichment,
} from "../../src/lib/report-output/chart-enrichment";
import {
  calculateNatalToTransitProbe,
  type NatalToTransitCurrentResidenceInput,
} from "../../src/lib/chart/natal-to-transit-calculation-probe";
import { buildPersonalTransitReportDataBridge } from "../../src/lib/report-output/personal-transit-report-data-bridge";
import { buildRealChartReportCopy } from "../../src/lib/report-output/real-chart-report-copy";

export const REPORT_GENERATION_SERVICE_VERSION = "0.1.284c" as const;

const CARDINAL_ANGLE_HOUSE_BY_ID: Record<
  RealEngineReportAngleId,
  RealEngineReportHouseNumber
> = {
  asc: 1,
  dsc: 7,
  mc: 10,
  ic: 4,
};

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
  chartReportEnrichment: ChartReportEnrichment | null = null,
): RealEngineReportSnapshot {
  return {
    version: "real-engine-preview-v2",
    generatedAt,
    cityLabel: input.birthCity,
    utcIso: realChart.utcIso,
    ascendantLongitude: realChart.ascendantLongitude,
    houseSystem:
      chartReportEnrichment?.houseContext.requestedSystem ??
      realChart.normalizedChart.houseContext.requestedSystem,
    houses: toRealEngineReportHouses(realChart, chartReportEnrichment),
    angles: toRealEngineReportAngles(realChart),
    calculationQuality: toRealEngineReportCalculationQuality(
      realChart,
      chartReportEnrichment,
    ),
    retrogrades: buildCalculatedRetrogradeStatus(realChart),
    lunarNodes: buildCalculatedLunarNodes(realChart),
    lilith: buildCalculatedLilith(realChart),
    ...(chartReportEnrichment
      ? { houseContext: toRealEngineReportHouseContext(chartReportEnrichment) }
      : {}),
    placements: realChart.placements.map((placement) =>
      toRealEnginePlacement(placement, chartReportEnrichment),
    ),
    note:
      "این داده محاسبه‌شده از مسیر report generation service ساخته شده و تا قبل از اتصال کامل public/private reports، به‌عنوان preview ذخیره می‌شود.",
  };
}

function toRealEngineReportHouseContext(
  chartReportEnrichment: ChartReportEnrichment,
): RealEngineReportHouseContext {
  const houseContext = chartReportEnrichment.houseContext;

  return {
    requestedSystem: houseContext.requestedSystem,
    appliedSystem: houseContext.appliedSystem,
    availability: houseContext.availability,
    unavailableReason: houseContext.unavailableReason,
    confidence: houseContext.confidence,
    ascendantMethod: houseContext.ascendantMethod,
    ascendantLongitude: houseContext.ascendantLongitude,
    firstHouseCuspLongitude: houseContext.firstHouseCuspLongitude,
    cuspLongitudes: houseContext.cuspLongitudes,
    calculationMethod: houseContext.calculationMethod,
    limitation: houseContext.limitation,
  };
}

function toRealEngineReportHouses(
  realChart: RealChartWorkbenchResult,
  chartReportEnrichment: ChartReportEnrichment | null,
): RealEngineReportHouse[] {
  const houseContext =
    chartReportEnrichment?.houseContext ?? realChart.normalizedChart.houseContext;

  if (!houseContext.housesReady) {
    return [];
  }

  const houses = realChart.houses.length > 0
    ? realChart.houses
    : realChart.normalizedChart.houses;

  return houses.map((house) => ({
    number: house.number as RealEngineReportHouseNumber,
    signId: toZodiacKey(house.signId),
    cuspLongitude: normalizeReportLongitude(house.cuspLongitude),
    degreeInSign: getReportDegreeInSign(house.cuspLongitude),
    system: house.system,
    method: toRealEngineReportHouseMethod(house.system),
    reliability:
      (house.system === "whole-sign" &&
        houseContext.confidence === "calculated-ascendant") ||
      (house.system === "placidus" &&
        houseContext.confidence === "calculated-cusps")
        ? "calculated"
        : house.system === "placeholder"
          ? "placeholder"
          : "preview",
    planetIds: realChart.placements
      .filter(
        (placement) =>
          getHouseNumberForLongitude(placement.longitude, realChart) === house.number,
      )
      .map((placement) => placement.id),
    angleIds: getAngleIdsForHouse(house.number),
    limitation:
      house.system === "placidus"
        ? "سرخانه با محاسبهٔ محلی پلاسیدوس و سرخانه‌های نامساوی ساخته شده است."
        : house.system === "whole-sign"
          ? "این خانه از نسخهٔ ذخیره‌شدهٔ قدیمی روش نشانه کامل حفظ شده است."
          : "روش خانه در این نسخه هنوز برای خوانش دقیق کامل نشده است.",
  }));
}

function toRealEngineReportHouseMethod(
  system: RealEngineReportHouse["system"],
): RealEngineReportHouse["method"] {
  if (system === "whole-sign") {
    return "whole-sign-from-ascendant";
  }

  if (system === "equal-house") {
    return "equal-house-from-ascendant";
  }

  if (system === "placidus") {
    return "placidus-calculated";
  }

  return "placeholder";
}

function getAngleIdsForHouse(
  houseNumber: RealEngineReportHouseNumber,
): RealEngineReportAngleId[] {
  return (Object.keys(CARDINAL_ANGLE_HOUSE_BY_ID) as RealEngineReportAngleId[])
    .filter((angleId) => CARDINAL_ANGLE_HOUSE_BY_ID[angleId] === houseNumber);
}

function getCardinalAngleHouseNumber(
  angleId: RealEngineReportAngleId,
): RealEngineReportHouseNumber {
  return CARDINAL_ANGLE_HOUSE_BY_ID[angleId];
}

function getHouseNumberForLongitude(
  longitude: number,
  realChart: RealChartWorkbenchResult,
): RealEngineReportHouseNumber | null {
  const houseContext = realChart.normalizedChart.houseContext;

  if (!houseContext.housesReady) {
    return null;
  }

  const houses = realChart.houses.length > 0
    ? realChart.houses
    : realChart.normalizedChart.houses;

  if (houses.length !== 12) {
    return null;
  }

  return getHouseNumberFromCusps(
    normalizeReportLongitude(longitude),
    houses,
  ) as RealEngineReportHouseNumber;
}

function toRealEngineReportAngles(
  realChart: RealChartWorkbenchResult,
): RealEngineReportAngles {
  return {
    asc: toRealEngineReportAngle(realChart.angles.asc),
    dsc: toRealEngineReportAngle(realChart.angles.dsc),
    mc: toRealEngineReportAngle(realChart.angles.mc),
    ic: toRealEngineReportAngle(realChart.angles.ic),
  };
}

function toRealEngineReportAngle(
  angle: RealChartCalculatedAngle,
): RealEngineReportAngle {
  return {
    id: angle.id,
    label: angle.label,
    longitude: angle.longitude,
    signId: toZodiacKey(angle.signId),
    degreeInSign: angle.degreeInSign,
    method: angle.method,
    source: angle.source,
    reliability: angle.reliability,
    house: getCardinalAngleHouseNumber(angle.id as RealEngineReportAngleId),
    limitation: angle.limitation,
  };
}

function normalizeReportLongitude(longitude: number): number {
  const normalized = longitude % 360;

  return normalized < 0 ? normalized + 360 : normalized;
}

function getReportDegreeInSign(longitude: number): number {
  return normalizeReportLongitude(longitude) % 30;
}

function toRealEngineReportCalculationQuality(
  realChart: RealChartWorkbenchResult,
  chartReportEnrichment: ChartReportEnrichment | null,
): RealEngineReportCalculationQuality {
  return {
    status: "partial",
    houseSystemStatus:
      chartReportEnrichment?.houseContext.availability === "unavailable"
        ? "not-calculated"
        : chartReportEnrichment?.houseContext.confidence === "calculated-ascendant" ||
            chartReportEnrichment?.houseContext.confidence === "calculated-cusps"
          ? "calculated"
          : "preview",
    anglesStatus: realChart.angles ? "calculated" : "preview",
    retrogradeStatus: "calculated",
    nodesStatus: realChart.lunarNodes?.status === "calculated" ? "calculated" : "not-calculated",
    lilithStatus: realChart.lilith?.status === "calculated" ? "calculated" : "not-calculated",
    limitations: [
      ...(chartReportEnrichment?.limitations ?? []),
      "حرکت برگشتی از تغییر جایگاه ظاهری سیاره‌ها نزدیک زمان تولد محاسبه می‌شود؛ اگر سیاره نزدیک ایستایی باشد، خوانش باید ملایم و محتاط باشد.",
      "دست‌های ماه در این نسخه با مدل نوسانی/واقعی محلی محاسبه می‌شوند؛ منبع خارجی یا Swiss runtime استفاده نشده است.",
      "جایگاه لیلیت نوسانی/واقعی محلی در داده و بخش فنی گزارش ذخیره می‌شود، اما تا وقتی مجوز خروجی فعال نیست وارد روایت تفسیری نمی‌شود.",
    ],
    warnings: [
      "اگر ساعت تولد تقریبی یا نامشخص باشد، خانه‌ها، محورها، حرکت برگشتی و زبان نهایی گزارش باید محتاطانه‌تر خوانده شوند.",
    ],
  };
}

function buildCalculatedRetrogradeStatus(
  realChart: RealChartWorkbenchResult,
): RealEngineReportRetrogradeStatus {
  const planetIds = Array.isArray(realChart.retrogradePlanetIds)
    ? realChart.retrogradePlanetIds
    : realChart.placements
        .filter((placement) => placement.motion?.status === "retrograde")
        .map((placement) => placement.id);

  return {
    status: "calculated",
    method: "astronomy-engine-geocentric-ecliptic-daily-motion",
    planetIds,
    limitation:
      planetIds.length > 0
        ? "سیاره‌های برگشتی از حرکت ظاهری آن‌ها نزدیک زمان تولد تشخیص داده شده‌اند؛ اگر سیاره نزدیک ایستایی باشد، خوانش باید ملایم باشد."
        : "در زمان تولد، برای سیاره‌های محاسبه‌شده حرکت برگشتی ثبت نشده است.",
  };
}

function buildCalculatedLunarNodes(
  realChart: RealChartWorkbenchResult,
): RealEngineReportLunarNodes {
  const nodes = realChart.lunarNodes;

  return {
    status: "calculated",
    method: nodes.method,
    nodeType: nodes.nodeType,
    northNode: toRealEngineReportLunarNodePoint(nodes.northNode, realChart),
    southNode: toRealEngineReportLunarNodePoint(nodes.southNode, realChart),
    limitation: nodes.limitation,
  };
}

function toRealEngineReportLunarNodePoint(
  node: RealChartCalculatedLunarNode,
  realChart: RealChartWorkbenchResult,
): RealEngineReportLunarNodePoint {
  return {
    id: node.id,
    label: node.label,
    longitude: node.longitude,
    signId: toZodiacKey(node.signId),
    degreeInSign: node.degreeInSign,
    house: getHouseNumberForLongitude(node.longitude, realChart),
    method: node.method,
    source: node.source,
    reliability: node.source === "calculated" ? "calculated" : "derived",
    limitation: node.limitation,
  };
}

function buildCalculatedLilith(
  realChart: RealChartWorkbenchResult,
): RealEngineReportCalculatedLilith {
  const lilith = realChart.lilith;

  return toRealEngineReportLilith(lilith, realChart);
}

function toRealEngineReportLilith(
  lilith: RealChartCalculatedLilith,
  realChart: RealChartWorkbenchResult,
): RealEngineReportCalculatedLilith {
  return {
    status: "calculated",
    id: lilith.id,
    label: lilith.label,
    longitude: normalizeReportLongitude(lilith.longitude),
    signId: toZodiacKey(lilith.signId),
    degreeInSign: lilith.degreeInSign,
    house: getHouseNumberForLongitude(lilith.longitude, realChart),
    method: lilith.method,
    modelId: lilith.modelId,
    lilithType: lilith.lilithType,
    source: lilith.source,
    reliability: "calculated",
    approvedForReportOutput: lilith.approvedForReportOutput,
    limitation: lilith.limitation,
  };
}

function buildDeferredCalculation(
  method: string,
  limitation: string,
): RealEngineReportDeferredCalculation {
  return {
    status: "not-calculated",
    method,
    limitation,
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
        "درخواست نوع نمایش فقط ذخیره شده است؛ انتشار عمومی تا زمان رضایت صریح، مسیر امن و قوانین ذخیره‌سازی فعال نمی‌شود.",
    },
    notes: [
      ...visibility.notes,
      "درخواست نوع نمایش فعلاً فقط داده کمکی است؛ مسیر عمومی و مدل خصوصی/پرداختی هنوز فعال نیست.",
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
    chartReportEnrichment,
  );
  const personalTransitReportData = buildPersonalTransitReportData(
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
  const houseReadinessWarning =
    chartReportEnrichment.houseContext.availability === "unavailable"
      ? "خانه‌های پلاسیدوس برای این چارت در دسترس نیستند و هیچ روش خانهٔ جایگزینی اعمال نشده است؛ جایگاه‌های سیاره‌ای، روابط و محورها همچنان در دسترس‌اند."
      : chartReportEnrichment.houseContext.appliedSystem === "placidus" &&
          chartReportEnrichment.houseContext.confidence === "calculated-cusps" &&
          chartReportEnrichment.status === "ready"
        ? "سرخانه‌های محلی پلاسیدوس برای این گزارش فعال‌اند؛ تضمین نهایی گزارش پولی هنوز به بررسی نمونه‌های گسترده‌تر نیاز دارد."
        : chartReportEnrichment.houseContext.appliedSystem === "whole-sign" &&
            chartReportEnrichment.houseContext.confidence === "calculated-ascendant"
          ? "این نسخهٔ ذخیره‌شدهٔ قدیمی، خانه‌های روش نشانه کامل را بدون تغییر حفظ می‌کند."
          : "داده‌های خانه و رایزینگ هنوز در مرحلهٔ سخت‌گیری و بازبینی‌اند و تضمین نهایی گزارش پولی محسوب نمی‌شوند.";
  const warnings = [warning, houseReadinessWarning].filter(
    (item): item is string => Boolean(item),
  );

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
      personalTransitReportData,
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

function buildPersonalTransitReportData(
  input: BirthInput,
  generatedAt: string,
) {
  const probeResult = calculateNatalToTransitProbe({
    birthInput: buildRealChartBirthInput(input),
    currentResidence: buildCurrentResidenceInput(input),
    currentLocalDate: getCurrentTransitLocalDate(generatedAt),
  });

  return buildPersonalTransitReportDataBridge(probeResult);
}

function buildCurrentResidenceInput(
  input: BirthInput,
): NatalToTransitCurrentResidenceInput | null {
  if (
    !hasText(input.currentResidenceCity) ||
    !hasText(input.currentResidenceTimezone) ||
    typeof input.currentResidenceLatitude !== "number" ||
    !Number.isFinite(input.currentResidenceLatitude) ||
    typeof input.currentResidenceLongitude !== "number" ||
    !Number.isFinite(input.currentResidenceLongitude)
  ) {
    return null;
  }

  return {
    placeName: input.currentResidenceCity,
    countryCode: "IR",
    timezone: input.currentResidenceTimezone,
    latitude: input.currentResidenceLatitude,
    longitude: input.currentResidenceLongitude,
  };
}

function getCurrentTransitLocalDate(generatedAt: string): string {
  const isoDate = generatedAt.slice(0, 10);

  return /^\d{4}-\d{2}-\d{2}$/.test(isoDate)
    ? isoDate
    : new Date().toISOString().slice(0, 10);
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
        "ساخت چارت واقعی انجام نشد چون منطقه زمانی یا مختصات شهر کامل نیست.",
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
  chartReportEnrichment: ChartReportEnrichment | null = null,
): RealEngineReportPlacement {
  const enrichmentPlacement = chartReportEnrichment?.placements.find(
    (summary) => summary.id === placement.id,
  );
  const house =
    typeof enrichmentPlacement?.house === "number" &&
    Number.isFinite(enrichmentPlacement.house)
      ? enrichmentPlacement.house
      : null;

  return {
    id: placement.id,
    label: placement.label,
    longitude: placement.longitude,
    signId: toZodiacKey(placement.signId),
    degreeInSign: placement.degreeInSign,
    house,
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
