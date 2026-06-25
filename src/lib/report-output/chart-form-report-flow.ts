import { buildNormalizedChart, type NormalizedChartPointInput } from "../chart/normalized-chart";
import {
  buildChartReportEnrichment,
  type ChartReportEnrichment,
} from "./chart-enrichment";
import {
  buildRealChartReportCopy,
  type RealChartReportCopyBlock,
} from "./real-chart-report-copy";

export const CHART_FORM_REPORT_FLOW_VERSION = "0.1.51" as const;

export type ChartFormReportFlowInput = {
  birthDate: string;
  birthTime?: string;
  timezone?: string;
  placeName?: string;
  name?: string;
};

export type ChartFormReportFlowReport = {
  id: string;
  title: string;
  version: typeof CHART_FORM_REPORT_FLOW_VERSION;
  createdAtIso: string;
  calculationMode: "prototype-symbolic-flow";
  inputSummary: {
    name: string | null;
    birthDate: string;
    birthTime: string | null;
    timezone: string;
    placeName: string;
  };
  chartReportEnrichment: ChartReportEnrichment;
  copyBlocks: RealChartReportCopyBlock[];
  engineMetadata: {
    source: "chart-form-report-flow";
    warning: string;
    previewRoute: "/engine/report-flow";
  };
};

export function buildChartFormReportFlow(
  input: ChartFormReportFlowInput,
  createdAtIso = new Date().toISOString(),
): ChartFormReportFlowReport {
  const normalizedInput = normalizeChartFormReportFlowInput(input);
  const seed = buildFlowSeed(normalizedInput);
  const chart = buildNormalizedChart({
    source: "manual",
    time: {
      date: normalizedInput.birthDate,
      time: normalizedInput.birthTime ?? undefined,
      timezone: normalizedInput.timezone,
      placeName: normalizedInput.placeName,
    },
    house: {
      system: "equal-house",
      firstHouseCuspLongitude: buildPrototypeLongitude(seed, 11),
    },
    placements: buildPrototypePlacements(seed),
  });
  const chartReportEnrichment = buildChartReportEnrichment(chart);
  const copyBlocks = buildRealChartReportCopy(chartReportEnrichment);

  return {
    id: buildReportFlowId(normalizedInput, seed),
    title: buildReportFlowTitle(normalizedInput),
    version: CHART_FORM_REPORT_FLOW_VERSION,
    createdAtIso,
    calculationMode: "prototype-symbolic-flow",
    inputSummary: normalizedInput,
    chartReportEnrichment,
    copyBlocks,
    engineMetadata: {
      source: "chart-form-report-flow",
      warning:
        "This flow is a product preview. It connects birth input to the report pipeline, but final astronomy-grade calculation is still being integrated.",
      previewRoute: "/engine/report-flow",
    },
  };
}

export function normalizeChartFormReportFlowInput(
  input: ChartFormReportFlowInput,
): ChartFormReportFlowReport["inputSummary"] {
  return {
    name: normalizeOptionalText(input.name),
    birthDate: normalizeRequiredDate(input.birthDate),
    birthTime: normalizeOptionalText(input.birthTime),
    timezone: normalizeOptionalText(input.timezone) ?? "Asia/Baku",
    placeName: normalizeOptionalText(input.placeName) ?? "Unknown place",
  };
}

export function buildPrototypePlacements(seed: number): NormalizedChartPointInput[] {
  return [
    {
      id: "sun",
      label: "Sun",
      pointType: "luminary",
      longitude: buildPrototypeLongitude(seed, 0),
    },
    {
      id: "moon",
      label: "Moon",
      pointType: "luminary",
      longitude: buildPrototypeLongitude(seed, 57),
    },
    {
      id: "mercury",
      label: "Mercury",
      pointType: "personal-planet",
      longitude: buildPrototypeLongitude(seed, 88),
    },
    {
      id: "venus",
      label: "Venus",
      pointType: "personal-planet",
      longitude: buildPrototypeLongitude(seed, 131),
    },
    {
      id: "mars",
      label: "Mars",
      pointType: "personal-planet",
      longitude: buildPrototypeLongitude(seed, 172),
    },
    {
      id: "jupiter",
      label: "Jupiter",
      pointType: "social-planet",
      longitude: buildPrototypeLongitude(seed, 239),
    },
    {
      id: "saturn",
      label: "Saturn",
      pointType: "social-planet",
      longitude: buildPrototypeLongitude(seed, 301),
    },
  ];
}

export function buildPrototypeLongitude(seed: number, offset: number): number {
  const raw = (seed * 37 + offset * 17) % 360;

  return raw < 0 ? raw + 360 : raw;
}

export function buildFlowSeed(
  input: ChartFormReportFlowReport["inputSummary"],
): number {
  const text = [
    input.birthDate,
    input.birthTime ?? "",
    input.timezone,
    input.placeName,
    input.name ?? "",
  ].join("|");

  let hash = 0;

  for (const char of text) {
    hash = (hash * 31 + char.charCodeAt(0)) % 100000;
  }

  return hash;
}

export function buildReportFlowTitle(
  input: ChartFormReportFlowReport["inputSummary"],
): string {
  return input.name
    ? `گزارش نمونه‌ی ${input.name}`
    : `گزارش نمونه‌ی ${input.birthDate}`;
}

export function buildReportFlowId(
  input: ChartFormReportFlowReport["inputSummary"],
  seed: number,
): string {
  return `chart-flow-${input.birthDate.replaceAll("-", "")}-${seed}`;
}

export function getChartFormReportFlowManualQaSteps(): string[] {
  return [
    "Open /engine/report-flow.",
    "Enter a birth date, optional time, timezone, place, and name.",
    "Click the preview button.",
    "Confirm the real chart bridge panel renders.",
    "Confirm Persian report copy blocks render below it.",
    "Confirm the page clearly says this is a prototype symbolic flow.",
  ];
}

function normalizeRequiredDate(date: string): string {
  const normalized = normalizeOptionalText(date);

  if (!normalized) {
    return "2000-01-01";
  }

  return normalized;
}

function normalizeOptionalText(value?: string): string | null {
  const normalized = value?.trim();

  return normalized && normalized.length > 0 ? normalized : null;
}
