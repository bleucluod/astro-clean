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
  validateLilithOsculatingProbeHarness,
} from "./lilith-validation-harness";

export const LILITH_INTERNAL_ADAPTER_VERSION = "v0.1.240" as const;
export const LILITH_INTERNAL_ADAPTER_STATUS = "internal-adapter-not-approved-for-engine-output" as const;
export const LILITH_INTERNAL_ADAPTER_SCOPE = "self-built-osculating-black-moon-lilith-internal-adapter" as const;
export const LILITH_INTERNAL_ADAPTER_METHOD =
  "local-osculating-black-moon-lilith-from-validated-probe" as const;
export const LILITH_INTERNAL_ADAPTER_MODEL_ID = LILITH_OSCULATING_PROBE_MODEL_ID;
export const LILITH_INTERNAL_ADAPTER_SOURCE = LILITH_OSCULATING_PROBE_SOURCE;
export const LILITH_INTERNAL_ADAPTER_APPROVED_FOR_ENGINE_OUTPUT = false as const;
export const LILITH_INTERNAL_ADAPTER_APPROVED_FOR_REPORT_OUTPUT = false as const;

export const LILITH_INTERNAL_ADAPTER_REQUIRED_GATES = [
  "lilith-model-decision-contract",
  "lilith-source-feasibility-probe",
  "lilith-self-built-osculating-decision",
  "lilith-osculating-probe",
  "lilith-validation-harness",
] as const;

export const LILITH_INTERNAL_ADAPTER_FORBIDDEN_USES = [
  "realChart.lilith calculated output",
  "report generation calculated Lilith",
  "ReportCard calculated Lilith",
  "chart wheel Lilith point",
  "transit or Sky Pulse Lilith",
  "public SEO Lilith claim",
] as const;

export const LILITH_INTERNAL_ADAPTER_LIMITATIONS = [
  "Internal adapter only; not approved for realChart output.",
  "Wraps the validated probe shape without changing the probe calculation.",
  "Keeps Black Moon Lilith as True/Osculating, not Mean Lilith.",
  "Keeps Dark Moon/Waldemath and asteroid 1181 Lilith out of scope.",
  "Requires external/offline reference fixtures before engine output approval.",
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
  longitude: number;
  apogeeLongitude: number;
  perigeeLongitude: number;
  eccentricity: number;
  angularMomentumLength: number;
  frame: LilithOsculatingProbeResult["frame"];
  requiredGates: readonly (typeof LILITH_INTERNAL_ADAPTER_REQUIRED_GATES)[number][];
  forbiddenUses: readonly (typeof LILITH_INTERNAL_ADAPTER_FORBIDDEN_USES)[number][];
  limitations: readonly string[];
};

export function assertLilithInternalAdapterCanRun(): void {
  const summary = validateLilithOsculatingProbeHarness();

  if (summary.approvedForProductionOutput !== false || summary.probeApprovedForProductionOutput !== false) {
    throw new Error("Lilith internal adapter must not approve production output.");
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
    longitude,
    apogeeLongitude: probe.apogeeLongitude,
    perigeeLongitude: probe.perigeeLongitude,
    eccentricity: probe.eccentricity,
    angularMomentumLength: probe.angularMomentumLength,
    frame: probe.frame,
    requiredGates: LILITH_INTERNAL_ADAPTER_REQUIRED_GATES,
    forbiddenUses: LILITH_INTERNAL_ADAPTER_FORBIDDEN_USES,
    limitations: [...LILITH_OSCULATING_PROBE_LIMITATIONS, ...LILITH_INTERNAL_ADAPTER_LIMITATIONS],
  };
}

export function assertLilithInternalAdapterResultIsSafe(result: LilithInternalAdapterResult): void {
  if (result.status !== "internal-adapter-not-approved-for-engine-output") {
    throw new Error("Lilith internal adapter status must remain non-production.");
  }

  if (result.approvedForEngineOutput !== false || result.approvedForReportOutput !== false) {
    throw new Error("Lilith internal adapter must not approve engine or report output.");
  }

  if (result.probeApprovedForProductionOutput !== false || result.validationApprovedForProductionOutput !== false) {
    throw new Error("Lilith internal adapter must preserve probe and validation no-output gates.");
  }

  if (!Number.isFinite(result.longitude) || result.longitude < 0 || result.longitude >= 360) {
    throw new Error("Lilith internal adapter longitude must be normalized.");
  }

  if (Math.abs(result.longitude - result.apogeeLongitude) > 1e-9) {
    throw new Error("Lilith internal adapter longitude must equal the apogee longitude.");
  }

  if (result.modelId !== "true-osculating-black-moon-lilith") {
    throw new Error("Lilith internal adapter must stay on the True/Osculating Black Moon Lilith model.");
  }
}
