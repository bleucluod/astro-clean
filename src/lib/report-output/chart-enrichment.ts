import type { CalculatedAspect } from "../chart/aspects";
import {
  getChartReadinessLabel,
  type NormalizedChart,
  type NormalizedChartPlacement,
} from "../chart/normalized-chart";

export const CHART_REPORT_ENRICHMENT_VERSION = "0.1.137b" as const;

export type ChartReportEnrichmentStatus = "ready" | "partial" | "blocked";

export type ChartReportPlacementSummary = {
  id: string;
  label: string;
  pointType: string;
  signId: string;
  degreeWithinSign: number;
  house: number | null;
  summaryKey: string;
};

export type ChartReportAspectSummary = {
  id: string;
  pointA: string;
  pointB: string;
  orb: number;
  polarity: string;
  summaryKey: string;
};

export type ChartReportEnrichmentSection = {
  id: string;
  title: string;
  status: ChartReportEnrichmentStatus;
  summaryKeys: string[];
};

export type ChartReportHouseContextSummary = {
  requestedSystem: NormalizedChart["houseContext"]["requestedSystem"];
  appliedSystem: NormalizedChart["houseContext"]["appliedSystem"];
  confidence: NormalizedChart["houseContext"]["confidence"];
  ascendantMethod: NormalizedChart["houseContext"]["ascendantMethod"];
  ascendantLongitude: number | null;
  firstHouseCuspLongitude: number;
  limitation: string | null;
};

export type ChartReportEnrichment = {
  version: typeof CHART_REPORT_ENRICHMENT_VERSION;
  status: ChartReportEnrichmentStatus;
  source: NormalizedChart["source"];
  readinessLabel: string;
  houseContext: ChartReportHouseContextSummary;
  placements: ChartReportPlacementSummary[];
  aspects: ChartReportAspectSummary[];
  sections: ChartReportEnrichmentSection[];
  limitations: string[];
};

export function buildChartReportEnrichment(
  chart: NormalizedChart,
): ChartReportEnrichment {
  const placements = chart.placements.map(toPlacementSummary);
  const aspects = chart.aspects.map(toAspectSummary);
  const status = getChartReportEnrichmentStatus(chart);

  return {
    version: CHART_REPORT_ENRICHMENT_VERSION,
    status,
    source: chart.source,
    readinessLabel: getChartReadinessLabel(chart),
    houseContext: toHouseContextSummary(chart),
    placements,
    aspects,
    sections: buildChartReportEnrichmentSections(status, placements, aspects),
    limitations: chart.quality.limitations,
  };
}

export function getChartReportEnrichmentStatus(
  chart: NormalizedChart,
): ChartReportEnrichmentStatus {
  if (chart.placements.length === 0) {
    return "blocked";
  }

  if (
    chart.quality.hasTimezone &&
    chart.quality.hasReadyHouses &&
    chart.quality.limitations.length === 0
  ) {
    return "ready";
  }

  return "partial";
}

export function toHouseContextSummary(
  chart: NormalizedChart,
): ChartReportHouseContextSummary {
  const houseContext = chart.houseContext;

  return {
    requestedSystem: houseContext.requestedSystem,
    appliedSystem: houseContext.appliedSystem,
    confidence: houseContext.confidence,
    ascendantMethod: houseContext.ascendantMethod,
    ascendantLongitude: houseContext.ascendantLongitude,
    firstHouseCuspLongitude: houseContext.firstHouseCuspLongitude,
    limitation: houseContext.limitation,
  };
}

export function toPlacementSummary(
  placement: NormalizedChartPlacement,
): ChartReportPlacementSummary {
  const signId = readZodiacSignId(placement);
  const degreeWithinSign = readDegreeWithinSign(placement);
  const houseNumber = readHouseNumber(placement);

  return {
    id: placement.id,
    label: placement.label,
    pointType: placement.pointType,
    signId,
    degreeWithinSign,
    house: houseNumber,
    summaryKey: buildPlacementSummaryKey(placement.id, signId, houseNumber),
  };
}

export function toAspectSummary(
  aspect: CalculatedAspect,
): ChartReportAspectSummary {
  return {
    id: aspect.id,
    pointA: aspect.pointA,
    pointB: aspect.pointB,
    orb: aspect.orb,
    polarity: aspect.polarity,
    summaryKey: buildAspectSummaryKey(aspect.pointA, aspect.id, aspect.pointB),
  };
}

export function buildChartReportEnrichmentSections(
  status: ChartReportEnrichmentStatus,
  placements: ChartReportPlacementSummary[],
  aspects: ChartReportAspectSummary[],
): ChartReportEnrichmentSection[] {
  return [
    {
      id: "chart-readiness",
      title: "Chart readiness",
      status,
      summaryKeys: [status],
    },
    {
      id: "placement-highlights",
      title: "Placement highlights",
      status: placements.length > 0 ? status : "blocked",
      summaryKeys: placements.slice(0, 5).map((placement) => placement.summaryKey),
    },
    {
      id: "aspect-highlights",
      title: "Aspect highlights",
      status: aspects.length > 0 ? status : "partial",
      summaryKeys: aspects.slice(0, 5).map((aspect) => aspect.summaryKey),
    },
  ];
}

export function buildPlacementSummaryKey(
  pointId: string,
  signId: string,
  houseNumber: number | null,
): string {
  const houseKey = houseNumber === null ? "house-unknown" : `house-${houseNumber}`;

  return `placement:${pointId}:sign-${signId}:${houseKey}`;
}

export function buildAspectSummaryKey(
  pointA: string,
  aspectId: string,
  pointB: string,
): string {
  return `aspect:${pointA}:${aspectId}:${pointB}`;
}

export function hasReportReadyChartEnrichment(
  enrichment: ChartReportEnrichment,
): boolean {
  return enrichment.status === "ready" && enrichment.placements.length > 0;
}

function readZodiacSignId(placement: NormalizedChartPlacement): string {
  const zodiac = placement.zodiac as unknown as {
    signId?: string;
    sign?: {
      id?: string;
    };
  };

  return zodiac.signId ?? zodiac.sign?.id ?? "unknown";
}

function readDegreeWithinSign(placement: NormalizedChartPlacement): number {
  const zodiac = placement.zodiac as unknown as {
    degreeWithinSign?: number;
    degreeInSign?: number;
  };

  const value = zodiac.degreeWithinSign ?? zodiac.degreeInSign ?? 0;

  return Number.isFinite(value) ? value : 0;
}

function readHouseNumber(placement: NormalizedChartPlacement): number | null {
  const house = placement.house as unknown as {
    house?: number;
    number?: number;
  };

  const value = house.house ?? house.number ?? null;

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
