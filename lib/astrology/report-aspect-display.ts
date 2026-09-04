// HALLEUS_DEEP_NARRATIVE_SLICE1_EXACT_ANGLE_FACT_CONTRACT_R4_20260902
import type { RealEngineReportAspectKind } from "@/types/astro";

export const REPORT_ASPECT_DISPLAY_VERSION =
  "slice1-unified-report-aspect-display-20260830" as const;
// HALLEUS_ADVANCED_ASTROLOGY_ROADMAP_SLICE1_20260830

export type ReportAspectDisplay = {
  symbol: "☌" | "⚹" | "□" | "△" | "☍";
  degree: 0 | 60 | 90 | 120 | 180;
  degreeLabel: "۰°" | "۶۰°" | "۹۰°" | "۱۲۰°" | "۱۸۰°";
};

export const REPORT_ASPECT_DISPLAY: Record<
  RealEngineReportAspectKind,
  ReportAspectDisplay
> = {
  conjunction: { symbol: "☌", degree: 0, degreeLabel: "۰°" },
  sextile: { symbol: "⚹", degree: 60, degreeLabel: "۶۰°" },
  square: { symbol: "□", degree: 90, degreeLabel: "۹۰°" },
  trine: { symbol: "△", degree: 120, degreeLabel: "۱۲۰°" },
  opposition: { symbol: "☍", degree: 180, degreeLabel: "۱۸۰°" },
};

export function getReportAspectDisplay(
  aspectId: RealEngineReportAspectKind,
): ReportAspectDisplay {
  return REPORT_ASPECT_DISPLAY[aspectId];
}

export function formatReportAspectDisplay(
  aspectId: RealEngineReportAspectKind,
): string {
  const display = getReportAspectDisplay(aspectId);
  return `${display.symbol} ${display.degreeLabel}`;
}
// HALLEUS_DEEP_NARRATIVE_SLICE1_EXACT_ANGLE_FACT_CONTRACT_R4_20260902
export type ReportAspectGeometryFactInput = {
  aspectId: RealEngineReportAspectKind;
  referenceAngle?: number | null;
  separation?: number | null;
  distanceFromExact?: number | null;
};

export type ReportAspectGeometryFacts = {
  aspectId: RealEngineReportAspectKind;
  symbol: ReportAspectDisplay["symbol"];
  referenceAngle: number;
  actualSeparation: number | null;
  distanceFromExact: number | null;
};

function finiteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function buildReportAspectGeometryFacts(
  input: ReportAspectGeometryFactInput,
): ReportAspectGeometryFacts {
  const display = getReportAspectDisplay(input.aspectId);
  return {
    aspectId: input.aspectId,
    symbol: display.symbol,
    referenceAngle: finiteNumber(input.referenceAngle)
      ? input.referenceAngle
      : display.degree,
    actualSeparation: finiteNumber(input.separation) ? input.separation : null,
    distanceFromExact: finiteNumber(input.distanceFromExact)
      ? input.distanceFromExact
      : null,
  };
}

function formatPersianDegree(
  value: number,
  minimumFractionDigits: number,
  maximumFractionDigits: number,
): string {
  return (
    value.toLocaleString("fa-IR", {
      minimumFractionDigits,
      maximumFractionDigits,
      useGrouping: false,
    }) + "°"
  );
}

export function formatReportReferenceAngle(value: number): string {
  return formatPersianDegree(value, 0, 2);
}

export function formatReportNarrativeAngle(value: number): string {
  return formatPersianDegree(value, 1, 1);
}

export function formatReportTechnicalAngle(value: number): string {
  return formatPersianDegree(value, 2, 2);
}

export function formatReportNarrativeAspectGeometry(
  input: ReportAspectGeometryFactInput,
): string {
  const facts = buildReportAspectGeometryFacts(input);

  if (facts.actualSeparation !== null) {
    return `${facts.symbol} ${formatReportNarrativeAngle(facts.actualSeparation)}`;
  }

  const reference = formatReportReferenceAngle(facts.referenceAngle);
  if (facts.distanceFromExact !== null) {
    return `${facts.symbol} زاویهٔ مرجع ${reference} · فاصله از دقیق ${formatReportNarrativeAngle(
      facts.distanceFromExact,
    )}`;
  }

  return `${facts.symbol} زاویهٔ مرجع ${reference}`;
}
