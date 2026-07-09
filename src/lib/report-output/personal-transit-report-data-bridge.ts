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

export const PERSONAL_TRANSIT_REPORT_DATA_BRIDGE_VERSION =
  "v0.1.254-personal-transit-report-data-bridge" as const;

export const PERSONAL_TRANSIT_REPORT_DATA_BRIDGE_STATUS =
  "report-data-bridge-not-visible-ui" as const;

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
  stage: "data-bridge";
  userVisible: false;
  reportDataBridgeApproval: true;
  visibleReportSectionApproval: false;
  currentResidenceRequired: true;
  noSilentTehranDefaultForPersonalTransit: true;
  publicLabel: typeof NATAL_TO_TRANSIT_COPY_POLICY.publicLabel;
  seoPhrases: typeof NATAL_TO_TRANSIT_COPY_POLICY.seoPhrases;
  location: PersonalTransitReportDataBridgeLocationSummary;
  aspectHighlights: PersonalTransitReportDataBridgeAspectSummary[];
  limitations: string[];
  notes: string[];
  nextMilestone: "v0.1.255-personal-transit-first-visible-report-section";
};

export function buildPersonalTransitReportDataBridge(
  probeResult: NatalToTransitProbeResult,
): PersonalTransitReportDataBridge {
  if (probeResult.status === NATAL_TO_TRANSIT_MISSING_CURRENT_RESIDENCE_STATUS) {
    return buildMissingResidenceReportData(probeResult);
  }

  return buildReadyReportData(probeResult);
}

export function hasPersonalTransitReportAspectData(
  bridge: PersonalTransitReportDataBridge,
): boolean {
  return bridge.aspectHighlights.length > 0;
}

function buildReadyReportData(
  probeResult: NatalToTransitCalculationProbeResult,
): PersonalTransitReportDataBridge {
  return {
    version: PERSONAL_TRANSIT_REPORT_DATA_BRIDGE_VERSION,
    status: probeResult.aspects.length > 0 ? "ready" : "partial-no-aspects",
    source: PERSONAL_TRANSIT_REPORT_DATA_BRIDGE_STATUS,
    sourceProbeVersion: probeResult.version,
    reportDataPath: "engineData.personalTransitReportData",
    stage: "data-bridge",
    userVisible: false,
    reportDataBridgeApproval: true,
    visibleReportSectionApproval: false,
    currentResidenceRequired: true,
    noSilentTehranDefaultForPersonalTransit: true,
    publicLabel: NATAL_TO_TRANSIT_COPY_POLICY.publicLabel,
    seoPhrases: NATAL_TO_TRANSIT_COPY_POLICY.seoPhrases,
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
    limitations: [
      "Personal transit data is bridged into report data, but visible report UI remains deferred to v0.1.255.",
      "Phase one uses calculated natal bodies and calculated current-residence transit bodies only; houses, angles, lunar nodes, and Lilith transits remain deferred.",
    ],
    notes: [
      "Report data bridge only: do not show a personal transit section before the next milestone.",
      "Natal chart uses the user birth place/time; transit context uses the user current residence.",
      "No silent Tehran default is allowed for personal reports.",
      `Probe status: ${NATAL_TO_TRANSIT_CALCULATION_PROBE_STATUS}`,
    ],
    nextMilestone: "v0.1.255-personal-transit-first-visible-report-section",
  };
}

function buildMissingResidenceReportData(
  probeResult: NatalToTransitMissingCurrentResidenceResult,
): PersonalTransitReportDataBridge {
  return {
    version: PERSONAL_TRANSIT_REPORT_DATA_BRIDGE_VERSION,
    status: "missing-current-residence",
    source: PERSONAL_TRANSIT_REPORT_DATA_BRIDGE_STATUS,
    sourceProbeVersion: probeResult.version,
    reportDataPath: "engineData.personalTransitReportData",
    stage: "data-bridge",
    userVisible: false,
    reportDataBridgeApproval: true,
    visibleReportSectionApproval: false,
    currentResidenceRequired: true,
    noSilentTehranDefaultForPersonalTransit: true,
    publicLabel: NATAL_TO_TRANSIT_COPY_POLICY.publicLabel,
    seoPhrases: NATAL_TO_TRANSIT_COPY_POLICY.seoPhrases,
    location: {
      birthPlaceName: null,
      birthTimezone: null,
      currentResidencePlaceName: null,
      currentResidenceTimezone: null,
      currentResidenceRequired: true,
      noSilentTehranDefaultForPersonalTransit: true,
    },
    aspectHighlights: [],
    limitations: [
      "Current residence is required before Halleus can add personal transit report data with precision.",
      "The bridge must not silently use Tehran for personal reports when current residence is missing.",
    ],
    notes: probeResult.notes.concat([
      "Report data bridge stores a missing-current-residence state instead of inventing personal transit claims.",
    ]),
    nextMilestone: "v0.1.255-personal-transit-first-visible-report-section",
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
