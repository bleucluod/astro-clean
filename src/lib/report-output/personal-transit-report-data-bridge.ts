import {
  NATAL_TO_TRANSIT_CALCULATION_PROBE_STATUS,
  NATAL_TO_TRANSIT_CALCULATION_PROBE_VERSION,
  NATAL_TO_TRANSIT_MISSING_CURRENT_RESIDENCE_STATUS,
  type NatalToTransitCalculationProbeResult,
  type NatalToTransitMissingCurrentResidenceResult,
  type NatalToTransitProbeAspect,
  type NatalToTransitProbeResult,
} from "../chart/natal-to-transit-calculation-probe";
import { NATAL_TO_TRANSIT_COPY_POLICY } from "../chart/natal-to-transit-contract";
import type { BehavioralAudienceMode } from "@/lib/astrology/report-behavioral-interpretation";
import {
  PERSONAL_TRANSIT_RELEVANCE_VERSION,
  buildPersonalTransitBehavioralInterpretation,
  scorePersonalTransitRelevance,
  selectPersonalTransitHighlights,
  type PersonalTransitBehavioralInterpretation,
  type PersonalTransitSelectionContext,
} from "./personal-transit-relevance";

export const PERSONAL_TRANSIT_REPORT_DATA_BRIDGE_VERSION =
  "v0.1.288-personal-transit-trust-boundary" as const;

export const PERSONAL_TRANSIT_REPORT_DATA_BRIDGE_STATUS =
  "report-data-bridge-visible-report-section" as const;

export type PersonalTransitReportDataBridgeStatus =
  | "ready"
  | "partial-no-aspects"
  | "missing-current-residence";

export type PersonalTransitReportDataBridgeAspectSummary = {
  id: string;
  aspect: NatalToTransitProbeAspect["aspect"];
  transitBody: NatalToTransitProbeAspect["transitBody"];
  natalBody: NatalToTransitProbeAspect["natalBody"];
  orb: number;
  orbLimit: number;
  summaryKey: string;
};

export type PersonalTransitReportDataBridgeSelectedAspectSummary =
  PersonalTransitReportDataBridgeAspectSummary & {
    relevanceScore: number;
    interpretation: PersonalTransitBehavioralInterpretation;
  };

export type PersonalTransitReportDataBridgeLocationSummary = {
  birthPlaceName: string | null;
  birthTimezone: string | null;
  currentResidencePlaceName: string | null;
  currentResidenceTimezone: string | null;
  currentResidenceRequired: true;
  noSilentTehranDefaultForPersonalTransit: true;
};

export type PersonalTransitReportDataBridge = {
  version: typeof PERSONAL_TRANSIT_REPORT_DATA_BRIDGE_VERSION;
  status: PersonalTransitReportDataBridgeStatus;
  source: typeof PERSONAL_TRANSIT_REPORT_DATA_BRIDGE_STATUS;
  sourceProbeVersion: typeof NATAL_TO_TRANSIT_CALCULATION_PROBE_VERSION;
  reportDataPath: "engineData.personalTransitReportData";
  stage: "visible-report-section";
  userVisible: true;
  reportDataBridgeApproval: true;
  visibleReportSectionApproval: true;
  currentResidenceRequired: true;
  noSilentTehranDefaultForPersonalTransit: true;
  publicLabel: typeof NATAL_TO_TRANSIT_COPY_POLICY.publicLabel;
  seoPhrases: typeof NATAL_TO_TRANSIT_COPY_POLICY.seoPhrases;
  transitLocalDate: string | null;
  sampleLocalTime: string | null;
  currentResidenceUtcIso: string | null;
  location: PersonalTransitReportDataBridgeLocationSummary;
  aspectHighlights: PersonalTransitReportDataBridgeAspectSummary[];
  audienceMode?: BehavioralAudienceMode;
  relevanceVersion?: typeof PERSONAL_TRANSIT_RELEVANCE_VERSION;
  visibleAspectHighlights?: PersonalTransitReportDataBridgeSelectedAspectSummary[];
  technicalDisclaimer?: string;
  limitations: string[];
  notes: string[];
  nextMilestone: "post-v0.1.288-personal-transit-refresh";
};

export function buildPersonalTransitReportDataBridge(
  probeResult: NatalToTransitProbeResult,
  context: PersonalTransitSelectionContext = {},
): PersonalTransitReportDataBridge {
  if (probeResult.status === NATAL_TO_TRANSIT_MISSING_CURRENT_RESIDENCE_STATUS) {
    return buildMissingResidenceReportData(probeResult, context);
  }

  return buildReadyReportData(probeResult, context);
}

export function hasPersonalTransitReportAspectData(
  bridge: PersonalTransitReportDataBridge,
): boolean {
  return bridge.aspectHighlights.length > 0;
}

function buildReadyReportData(
  probeResult: NatalToTransitCalculationProbeResult,
  context: PersonalTransitSelectionContext,
): PersonalTransitReportDataBridge {
  const audienceMode = context.audienceMode ?? "adult";
  const selectedAspects = selectPersonalTransitHighlights(
    probeResult.aspects,
    context,
  );

  return {
    version: PERSONAL_TRANSIT_REPORT_DATA_BRIDGE_VERSION,
    status: probeResult.aspects.length > 0 ? "ready" : "partial-no-aspects",
    source: PERSONAL_TRANSIT_REPORT_DATA_BRIDGE_STATUS,
    sourceProbeVersion: probeResult.version,
    reportDataPath: "engineData.personalTransitReportData",
    stage: "visible-report-section",
    userVisible: true,
    reportDataBridgeApproval: true,
    visibleReportSectionApproval: true,
    currentResidenceRequired: true,
    noSilentTehranDefaultForPersonalTransit: true,
    publicLabel: NATAL_TO_TRANSIT_COPY_POLICY.publicLabel,
    seoPhrases: NATAL_TO_TRANSIT_COPY_POLICY.seoPhrases,
    transitLocalDate: probeResult.localDate,
    sampleLocalTime: probeResult.sampleLocalTime,
    currentResidenceUtcIso: probeResult.currentResidenceUtcIso,
    location: {
      birthPlaceName: probeResult.locationContext.birthPlaceName,
      birthTimezone: probeResult.locationContext.birthTimezone,
      currentResidencePlaceName:
        probeResult.locationContext.currentResidencePlaceName,
      currentResidenceTimezone:
        probeResult.locationContext.currentResidenceTimezone,
      currentResidenceRequired: true,
      noSilentTehranDefaultForPersonalTransit: true,
    },
    aspectHighlights: probeResult.aspects.slice(0, 8).map(toAspectSummary),
    audienceMode,
    relevanceVersion: PERSONAL_TRANSIT_RELEVANCE_VERSION,
    visibleAspectHighlights: selectedAspects.map((aspect) => ({
      ...toAspectSummary(aspect),
      relevanceScore: roundToTwo(scorePersonalTransitRelevance(aspect, context)),
      interpretation: buildPersonalTransitBehavioralInterpretation(
        aspect,
        audienceMode,
      ),
    })),
    technicalDisclaimer:
      "این کارت‌ها از همان snapshot ذخیره‌شده انتخاب شده‌اند؛ اورب فقط نزدیکی هندسی را نشان می‌دهد و هیچ رویداد یا پیش‌بینی قطعی نمی‌سازد.",
    limitations: [
      "The stored personal-transit snapshot belongs to transitLocalDate/sampleLocalTime and must not be relabeled as today on later report views.",
      "Phase one uses calculated natal bodies and calculated current-residence transit bodies only; houses, angles, lunar nodes, and Lilith transits remain outside this comparison.",
    ],
    notes: [
      "The visible report section reads this stored bridge; it does not recalculate when an older report is opened.",
      "Natal chart uses the user birth place/time; transit context uses the user current residence.",
      "No silent Tehran default is allowed for personal reports.",
      `Probe status: ${NATAL_TO_TRANSIT_CALCULATION_PROBE_STATUS}`,
    ],
    nextMilestone: "post-v0.1.288-personal-transit-refresh",
  };
}

function buildMissingResidenceReportData(
  probeResult: NatalToTransitMissingCurrentResidenceResult,
  context: PersonalTransitSelectionContext,
): PersonalTransitReportDataBridge {
  return {
    version: PERSONAL_TRANSIT_REPORT_DATA_BRIDGE_VERSION,
    status: "missing-current-residence",
    source: PERSONAL_TRANSIT_REPORT_DATA_BRIDGE_STATUS,
    sourceProbeVersion: probeResult.version,
    reportDataPath: "engineData.personalTransitReportData",
    stage: "visible-report-section",
    userVisible: true,
    reportDataBridgeApproval: true,
    visibleReportSectionApproval: true,
    currentResidenceRequired: true,
    noSilentTehranDefaultForPersonalTransit: true,
    publicLabel: NATAL_TO_TRANSIT_COPY_POLICY.publicLabel,
    seoPhrases: NATAL_TO_TRANSIT_COPY_POLICY.seoPhrases,
    transitLocalDate: null,
    sampleLocalTime: null,
    currentResidenceUtcIso: null,
    location: {
      birthPlaceName: null,
      birthTimezone: null,
      currentResidencePlaceName: null,
      currentResidenceTimezone: null,
      currentResidenceRequired: true,
      noSilentTehranDefaultForPersonalTransit: true,
    },
    aspectHighlights: [],
    audienceMode: context.audienceMode ?? "adult",
    relevanceVersion: PERSONAL_TRANSIT_RELEVANCE_VERSION,
    visibleAspectHighlights: [],
    technicalDisclaimer:
      "این بخش بدون محل زندگی فعلی هیچ تماس شخصی یا رویداد احتمالی نمی‌سازد.",
    limitations: [
      "Current residence is required before Halleus can add personal transit report data with precision.",
      "The bridge must not silently use Tehran for personal reports when current residence is missing.",
    ],
    notes: probeResult.notes.concat([
      "The visible report section stores a missing-current-residence state instead of inventing personal transit claims.",
    ]),
    nextMilestone: "post-v0.1.288-personal-transit-refresh",
  };
}

function toAspectSummary(
  aspect: NatalToTransitProbeAspect,
): PersonalTransitReportDataBridgeAspectSummary {
  return {
    id: aspect.id,
    aspect: aspect.aspect,
    transitBody: aspect.transitBody,
    natalBody: aspect.natalBody,
    orb: roundToTwo(aspect.orb),
    orbLimit: aspect.orbLimit,
    summaryKey: `personal-transit:${aspect.transitBody}:${aspect.aspect}:natal-${aspect.natalBody}`,
  };
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}
