import {
  LILITH_MODEL_DECISION_SCOPE,
  LILITH_MODEL_DECISION_STATUS,
  LILITH_PRODUCTION_OUTPUT_STATUS,
} from "./lilith-model-decision-contract";

export const LILITH_SOURCE_FEASIBILITY_VERSION = "v0.1.236" as const;
export const LILITH_SOURCE_FEASIBILITY_STATUS = "no-approved-production-source" as const;
export const LILITH_SOURCE_FEASIBILITY_SCOPE = "local-runtime-source-feasibility-probe-only" as const;
export const LILITH_SOURCE_FEASIBILITY_RUNTIME = "astronomy-engine@2.1.19" as const;
export const LILITH_SOURCE_FEASIBILITY_APPROVED_FOR_OUTPUT = false as const;

export const LILITH_SOURCE_FEASIBILITY_RESEARCH_ONLY_APIS = [
  "GeoMoonState",
  "RotateState",
  "Rotation_EQJ_ECT",
  "SearchLunarApsis",
  "NextLunarApsis",
] as const;

export const LILITH_SOURCE_FEASIBILITY_REJECTED_SUBSTITUTES = [
  "SearchLunarApsis",
  "NextLunarApsis",
  "lunar-apsis-event-time",
  "moon-apogee-event-as-natal-longitude",
] as const;

export const LILITH_SOURCE_FEASIBILITY_REQUIRED_BEFORE_OUTPUT = [
  "select True/Osculating Black Moon Lilith as the first self-built probe model",
  "derive a local osculating lunar apogee longitude from Moon position and velocity state vectors",
  "add offline reference fixtures before any engine output",
  "keep ReportCard, report writer, and chart wheel deferred until calculated longitude data exists",
] as const;

export type LilithSourceFeasibilityStatus = typeof LILITH_SOURCE_FEASIBILITY_STATUS;
export type LilithSourceFeasibilityRuntime = typeof LILITH_SOURCE_FEASIBILITY_RUNTIME;

export type LilithSourceFeasibilityProbe = {
  version: typeof LILITH_SOURCE_FEASIBILITY_VERSION;
  status: LilithSourceFeasibilityStatus;
  scope: typeof LILITH_SOURCE_FEASIBILITY_SCOPE;
  runtime: LilithSourceFeasibilityRuntime;
  approvedForProductionOutput: typeof LILITH_SOURCE_FEASIBILITY_APPROVED_FOR_OUTPUT;
  decisionContractStatus: typeof LILITH_MODEL_DECISION_STATUS;
  decisionContractScope: typeof LILITH_MODEL_DECISION_SCOPE;
  productionOutputStatus: typeof LILITH_PRODUCTION_OUTPUT_STATUS;
  researchOnlyApis: readonly (typeof LILITH_SOURCE_FEASIBILITY_RESEARCH_ONLY_APIS)[number][];
  rejectedSubstitutes: readonly (typeof LILITH_SOURCE_FEASIBILITY_REJECTED_SUBSTITUTES)[number][];
  requiredBeforeOutput: readonly (typeof LILITH_SOURCE_FEASIBILITY_REQUIRED_BEFORE_OUTPUT)[number][];
  notes: readonly string[];
};

export const LILITH_SOURCE_FEASIBILITY_NOTES = [
  "The current local runtime does not provide an approved Black Moon Lilith production longitude source.",
  "SearchLunarApsis and NextLunarApsis are event-time helpers, not natal Black Moon Lilith longitude sources.",
  "Do not approximate Black Moon Lilith from lunar apsis events or reuse lunar-node vector code under a Lilith label.",
  "This probe keeps Black Moon Lilith deferred and not-calculated until a separate source/fixture batch proves one model.",
  "The preferred next path is self-built True/Osculating Black Moon Lilith from Moon state vectors, not a new runtime dependency.",
  "Mean Black Moon Lilith remains later-only until a public/permissive mean-apogee formula is selected.",
] as const;

export function getLilithSourceFeasibilityProbe(): LilithSourceFeasibilityProbe {
  return {
    version: LILITH_SOURCE_FEASIBILITY_VERSION,
    status: LILITH_SOURCE_FEASIBILITY_STATUS,
    scope: LILITH_SOURCE_FEASIBILITY_SCOPE,
    runtime: LILITH_SOURCE_FEASIBILITY_RUNTIME,
    approvedForProductionOutput: LILITH_SOURCE_FEASIBILITY_APPROVED_FOR_OUTPUT,
    decisionContractStatus: LILITH_MODEL_DECISION_STATUS,
    decisionContractScope: LILITH_MODEL_DECISION_SCOPE,
    productionOutputStatus: LILITH_PRODUCTION_OUTPUT_STATUS,
    researchOnlyApis: LILITH_SOURCE_FEASIBILITY_RESEARCH_ONLY_APIS,
    rejectedSubstitutes: LILITH_SOURCE_FEASIBILITY_REJECTED_SUBSTITUTES,
    requiredBeforeOutput: LILITH_SOURCE_FEASIBILITY_REQUIRED_BEFORE_OUTPUT,
    notes: LILITH_SOURCE_FEASIBILITY_NOTES,
  };
}

export function assertLilithSourceFeasibilityIsSafe(probe: LilithSourceFeasibilityProbe): void {
  if (probe.status !== "no-approved-production-source") {
    throw new Error("Lilith source feasibility status changed without an approval batch.");
  }

  if (probe.approvedForProductionOutput !== false) {
    throw new Error("Lilith source feasibility must not approve production output yet.");
  }

  if (probe.productionOutputStatus !== "not-calculated") {
    throw new Error("Lilith must remain not-calculated after the source feasibility probe.");
  }

  for (const rejected of ["SearchLunarApsis", "NextLunarApsis"] as const) {
    if (!probe.rejectedSubstitutes.includes(rejected)) {
      throw new Error(`Lilith source feasibility must reject ${rejected} as a production longitude substitute.`);
    }
  }
}
