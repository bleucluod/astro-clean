import {
  LILITH_MODEL_DECISION_SCOPE,
  LILITH_MODEL_DECISION_STATUS,
  LILITH_PRODUCTION_OUTPUT_STATUS,
} from "./lilith-model-decision-contract";
import {
  LILITH_REFERENCE_FIXTURE_RUNTIME_POLICY,
  LILITH_REFERENCE_FIXTURE_SOURCE,
} from "./lilith-reference-fixtures";

export const LILITH_SOURCE_FEASIBILITY_VERSION = "v0.1.370" as const;
export const LILITH_SOURCE_FEASIBILITY_STATUS = "local-source-validated-for-natal-report" as const;
export const LILITH_SOURCE_FEASIBILITY_SCOPE = "local-runtime-source-validation" as const;
export const LILITH_SOURCE_FEASIBILITY_RUNTIME = "astronomy-engine@2.1.19" as const;
export const LILITH_SOURCE_FEASIBILITY_APPROVED_FOR_OUTPUT = true as const;

export const LILITH_SOURCE_FEASIBILITY_RUNTIME_APIS = [
  "GeoMoonState",
  "RotateState",
  "Rotation_EQJ_ECT",
] as const;

export const LILITH_SOURCE_FEASIBILITY_REJECTED_SUBSTITUTES = [
  "SearchLunarApsis",
  "NextLunarApsis",
  "lunar-apsis-event-time",
  "moon-apogee-event-as-natal-longitude",
  "external-api-lilith",
  "swiss-runtime-lilith",
] as const;

export type LilithSourceFeasibilityProbe = {
  version: typeof LILITH_SOURCE_FEASIBILITY_VERSION;
  status: typeof LILITH_SOURCE_FEASIBILITY_STATUS;
  scope: typeof LILITH_SOURCE_FEASIBILITY_SCOPE;
  runtime: typeof LILITH_SOURCE_FEASIBILITY_RUNTIME;
  approvedForProductionOutput: typeof LILITH_SOURCE_FEASIBILITY_APPROVED_FOR_OUTPUT;
  decisionContractStatus: typeof LILITH_MODEL_DECISION_STATUS;
  decisionContractScope: typeof LILITH_MODEL_DECISION_SCOPE;
  productionOutputStatus: typeof LILITH_PRODUCTION_OUTPUT_STATUS;
  validationReference: typeof LILITH_REFERENCE_FIXTURE_SOURCE;
  referenceRuntimePolicy: typeof LILITH_REFERENCE_FIXTURE_RUNTIME_POLICY;
  runtimeApis: readonly (typeof LILITH_SOURCE_FEASIBILITY_RUNTIME_APIS)[number][];
  rejectedSubstitutes: readonly (typeof LILITH_SOURCE_FEASIBILITY_REJECTED_SUBSTITUTES)[number][];
  notes: readonly string[];
};

export const LILITH_SOURCE_FEASIBILITY_NOTES = [
  "Production uses the existing local Astronomy Engine Moon state vector; no external API or new ephemeris dependency is added.",
  "Fixed Swiss Ephemeris osculating-apogee values are committed only as offline validation evidence.",
  "SearchLunarApsis and NextLunarApsis remain event-time helpers and are not used as natal longitude substitutes.",
  "Approval is bounded to natal report interpretation and does not approve Lilith transit or chart-wheel output.",
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
    validationReference: LILITH_REFERENCE_FIXTURE_SOURCE,
    referenceRuntimePolicy: LILITH_REFERENCE_FIXTURE_RUNTIME_POLICY,
    runtimeApis: LILITH_SOURCE_FEASIBILITY_RUNTIME_APIS,
    rejectedSubstitutes: LILITH_SOURCE_FEASIBILITY_REJECTED_SUBSTITUTES,
    notes: LILITH_SOURCE_FEASIBILITY_NOTES,
  };
}

export function assertLilithSourceFeasibilityIsSafe(probe: LilithSourceFeasibilityProbe): void {
  if (probe.status !== "local-source-validated-for-natal-report") {
    throw new Error("Lilith source must retain validated local status.");
  }
  if (probe.approvedForProductionOutput !== true) {
    throw new Error("Validated Lilith natal output must remain approved.");
  }
  if (probe.referenceRuntimePolicy !== "reference-values-only-no-swiss-runtime-dependency") {
    throw new Error("Swiss Ephemeris must remain fixture-only and absent from runtime.");
  }
  for (const rejected of ["SearchLunarApsis", "NextLunarApsis", "external-api-lilith"] as const) {
    if (!probe.rejectedSubstitutes.includes(rejected)) {
      throw new Error(`Lilith source must reject ${rejected}.`);
    }
  }
}
