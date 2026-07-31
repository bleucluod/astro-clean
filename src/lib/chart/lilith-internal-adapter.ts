import {
  LILITH_OSCULATING_PROBE_APPROVED_FOR_PRODUCTION_OUTPUT,
  LILITH_OSCULATING_PROBE_LIMITATIONS,
  LILITH_OSCULATING_PROBE_METHOD,
  LILITH_OSCULATING_PROBE_MODEL_ID,
  LILITH_OSCULATING_PROBE_SCOPE,
  LILITH_OSCULATING_PROBE_SOURCE,
  LILITH_OSCULATING_PROBE_STATUS,
  assertLilithOsculatingProbeResultIsSafe,
  calculateLilithOsculatingProbe,
  normalizeLilithOsculatingProbeLongitude,
  type LilithOsculatingProbeResult,
} from "./lilith-osculating-probe";
import {
  LILITH_VALIDATION_HARNESS_APPROVED_FOR_PRODUCTION_OUTPUT,
  LILITH_VALIDATION_HARNESS_STATUS,
} from "./lilith-validation-harness";
import {
  LILITH_REFERENCE_FIXTURE_SOURCE,
  LILITH_REFERENCE_MAX_ANGULAR_DELTA_DEGREES,
} from "./lilith-reference-fixtures";

export const LILITH_INTERNAL_ADAPTER_VERSION = "v0.1.370" as const;
export const LILITH_INTERNAL_ADAPTER_STATUS = "validated-report-output-approved" as const;
export const LILITH_INTERNAL_ADAPTER_SCOPE = "self-built-osculating-black-moon-lilith-internal-adapter" as const;
export const LILITH_INTERNAL_ADAPTER_METHOD =
  "local-osculating-black-moon-lilith-from-validated-probe" as const;
export const LILITH_INTERNAL_ADAPTER_MODEL_ID = LILITH_OSCULATING_PROBE_MODEL_ID;
export const LILITH_INTERNAL_ADAPTER_SOURCE = LILITH_OSCULATING_PROBE_SOURCE;
export const LILITH_INTERNAL_ADAPTER_APPROVED_FOR_ENGINE_OUTPUT = true as const;
export const LILITH_INTERNAL_ADAPTER_APPROVED_FOR_REPORT_OUTPUT = true as const;

export const LILITH_INTERNAL_ADAPTER_FORBIDDEN_USES = [
  "chart wheel Lilith point",
  "transit or Sky Pulse Lilith",
  "public SEO Lilith claim",
  "Mean Lilith substitution",
  "Dark Moon/Waldemath substitution",
  "asteroid 1181 substitution",
] as const;

export type LilithInternalAdapterResult = {
  version: typeof LILITH_INTERNAL_ADAPTER_VERSION;
  status: typeof LILITH_INTERNAL_ADAPTER_STATUS;
  scope: typeof LILITH_INTERNAL_ADAPTER_SCOPE;
  source: typeof LILITH_INTERNAL_ADAPTER_SOURCE;
  method: typeof LILITH_INTERNAL_ADAPTER_METHOD;
  modelId: typeof LILITH_INTERNAL_ADAPTER_MODEL_ID;
  approvedForEngineOutput: typeof LILITH_INTERNAL_ADAPTER_APPROVED_FOR_ENGINE_OUTPUT;
  approvedForReportOutput: typeof LILITH_INTERNAL_ADAPTER_APPROVED_FOR_REPORT_OUTPUT;
  probeStatus: typeof LILITH_OSCULATING_PROBE_STATUS;
  probeScope: typeof LILITH_OSCULATING_PROBE_SCOPE;
  probeMethod: typeof LILITH_OSCULATING_PROBE_METHOD;
  probeApprovedForProductionOutput: typeof LILITH_OSCULATING_PROBE_APPROVED_FOR_PRODUCTION_OUTPUT;
  validationStatus: typeof LILITH_VALIDATION_HARNESS_STATUS;
  validationApprovedForProductionOutput: typeof LILITH_VALIDATION_HARNESS_APPROVED_FOR_PRODUCTION_OUTPUT;
  validationReference: typeof LILITH_REFERENCE_FIXTURE_SOURCE;
  validationToleranceDegrees: typeof LILITH_REFERENCE_MAX_ANGULAR_DELTA_DEGREES;
  longitude: number;
  apogeeLongitude: number;
  perigeeLongitude: number;
  eccentricity: number;
  angularMomentumLength: number;
  frame: LilithOsculatingProbeResult["frame"];
  forbiddenUses: readonly (typeof LILITH_INTERNAL_ADAPTER_FORBIDDEN_USES)[number][];
  limitations: readonly string[];
};

export function assertLilithInternalAdapterCanRun(): void {
  if (
    LILITH_OSCULATING_PROBE_APPROVED_FOR_PRODUCTION_OUTPUT !== true ||
    LILITH_VALIDATION_HARNESS_APPROVED_FOR_PRODUCTION_OUTPUT !== true
  ) {
    throw new Error("Lilith adapter cannot run without validated probe and reference approval.");
  }
}

export function calculateLocalOsculatingBlackMoonLilith(utcDate: Date): LilithInternalAdapterResult {
  assertLilithInternalAdapterCanRun();
  const probe = calculateLilithOsculatingProbe(utcDate);
  assertLilithOsculatingProbeResultIsSafe(probe);
  const longitude = normalizeLilithOsculatingProbeLongitude(probe.apogeeLongitude);
  return {
    version: LILITH_INTERNAL_ADAPTER_VERSION,
    status: LILITH_INTERNAL_ADAPTER_STATUS,
    scope: LILITH_INTERNAL_ADAPTER_SCOPE,
    source: LILITH_INTERNAL_ADAPTER_SOURCE,
    method: LILITH_INTERNAL_ADAPTER_METHOD,
    modelId: LILITH_INTERNAL_ADAPTER_MODEL_ID,
    approvedForEngineOutput: LILITH_INTERNAL_ADAPTER_APPROVED_FOR_ENGINE_OUTPUT,
    approvedForReportOutput: LILITH_INTERNAL_ADAPTER_APPROVED_FOR_REPORT_OUTPUT,
    probeStatus: probe.status,
    probeScope: probe.scope,
    probeMethod: probe.method,
    probeApprovedForProductionOutput: probe.approvedForProductionOutput,
    validationStatus: LILITH_VALIDATION_HARNESS_STATUS,
    validationApprovedForProductionOutput: LILITH_VALIDATION_HARNESS_APPROVED_FOR_PRODUCTION_OUTPUT,
    validationReference: LILITH_REFERENCE_FIXTURE_SOURCE,
    validationToleranceDegrees: LILITH_REFERENCE_MAX_ANGULAR_DELTA_DEGREES,
    longitude,
    apogeeLongitude: probe.apogeeLongitude,
    perigeeLongitude: probe.perigeeLongitude,
    eccentricity: probe.eccentricity,
    angularMomentumLength: probe.angularMomentumLength,
    frame: probe.frame,
    forbiddenUses: LILITH_INTERNAL_ADAPTER_FORBIDDEN_USES,
    limitations: [
      ...LILITH_OSCULATING_PROBE_LIMITATIONS,
      "Natal-report interpretation is approved only when approvedForReportOutput remains true.",
    ],
  };
}

export function assertLilithInternalAdapterResultIsSafe(result: LilithInternalAdapterResult): void {
  if (result.status !== "validated-report-output-approved") {
    throw new Error("Lilith internal adapter status must retain validated report approval.");
  }
  if (result.approvedForEngineOutput !== true || result.approvedForReportOutput !== true) {
    throw new Error("Lilith adapter must approve both engine and bounded natal-report output.");
  }
  if (result.probeApprovedForProductionOutput !== true || result.validationApprovedForProductionOutput !== true) {
    throw new Error("Lilith adapter must preserve probe and independent-reference approval.");
  }
  if (!Number.isFinite(result.longitude) || result.longitude < 0 || result.longitude >= 360) {
    throw new Error("Lilith internal adapter longitude must be normalized.");
  }
  if (Math.abs(result.longitude - result.apogeeLongitude) > 1e-9) {
    throw new Error("Lilith internal adapter longitude must equal the apogee longitude.");
  }
  if (result.modelId !== "true-osculating-black-moon-lilith") {
    throw new Error("Lilith adapter must stay on the True/Osculating Black Moon Lilith model.");
  }
}
