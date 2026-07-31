import {
  LILITH_MODEL_DECISION_SCOPE,
  LILITH_MODEL_DECISION_STATUS,
  LILITH_PRODUCTION_OUTPUT_STATUS,
} from "./lilith-model-decision-contract";
import {
  LILITH_SOURCE_FEASIBILITY_APPROVED_FOR_OUTPUT,
  LILITH_SOURCE_FEASIBILITY_RUNTIME,
  LILITH_SOURCE_FEASIBILITY_STATUS,
} from "./lilith-source-feasibility-probe";

export const LILITH_SELF_BUILT_OSCULATING_DECISION_VERSION = "v0.1.370" as const;
export const LILITH_SELF_BUILT_OSCULATING_DECISION_STATUS = "validated-natal-report-path-approved" as const;
export const LILITH_SELF_BUILT_OSCULATING_DECISION_SCOPE = "self-built-true-osculating-black-moon-lilith" as const;
export const LILITH_SELF_BUILT_OSCULATING_MODEL_ID = "true-osculating-black-moon-lilith" as const;
export const LILITH_SELF_BUILT_OSCULATING_API_POLICY = "no-external-api" as const;
export const LILITH_SELF_BUILT_OSCULATING_RUNTIME_DEPENDENCY_POLICY = "no-new-lilith-runtime-dependency" as const;
export const LILITH_SELF_BUILT_OSCULATING_PRODUCTION_OUTPUT_ALLOWED = true as const;

export const LILITH_SELF_BUILT_OSCULATING_INPUTS = [
  "geocentric Moon position state vector",
  "geocentric Moon velocity state vector",
  "ecliptic-of-date rotation from the existing local astronomy runtime",
] as const;

export const LILITH_SELF_BUILT_OSCULATING_REJECTED_SHORTCUTS = [
  "external-api-lilith",
  "new-swiss-runtime-dependency",
  "SearchLunarApsis-as-natal-longitude",
  "NextLunarApsis-as-natal-longitude",
  "mean-lilith-without-separate-validation",
  "dark-moon-lilith-waldemath",
  "asteroid-1181-lilith",
] as const;

export type LilithSelfBuiltOsculatingDecision = {
  version: typeof LILITH_SELF_BUILT_OSCULATING_DECISION_VERSION;
  status: typeof LILITH_SELF_BUILT_OSCULATING_DECISION_STATUS;
  scope: typeof LILITH_SELF_BUILT_OSCULATING_DECISION_SCOPE;
  modelId: typeof LILITH_SELF_BUILT_OSCULATING_MODEL_ID;
  apiPolicy: typeof LILITH_SELF_BUILT_OSCULATING_API_POLICY;
  runtimeDependencyPolicy: typeof LILITH_SELF_BUILT_OSCULATING_RUNTIME_DEPENDENCY_POLICY;
  productionOutputAllowed: typeof LILITH_SELF_BUILT_OSCULATING_PRODUCTION_OUTPUT_ALLOWED;
  decisionContractStatus: typeof LILITH_MODEL_DECISION_STATUS;
  decisionContractScope: typeof LILITH_MODEL_DECISION_SCOPE;
  sourceFeasibilityStatus: typeof LILITH_SOURCE_FEASIBILITY_STATUS;
  sourceFeasibilityRuntime: typeof LILITH_SOURCE_FEASIBILITY_RUNTIME;
  sourceFeasibilityApprovedForOutput: typeof LILITH_SOURCE_FEASIBILITY_APPROVED_FOR_OUTPUT;
  productionOutputStatus: typeof LILITH_PRODUCTION_OUTPUT_STATUS;
  inputs: readonly (typeof LILITH_SELF_BUILT_OSCULATING_INPUTS)[number][];
  rejectedShortcuts: readonly (typeof LILITH_SELF_BUILT_OSCULATING_REJECTED_SHORTCUTS)[number][];
};

export function getLilithSelfBuiltOsculatingDecision(): LilithSelfBuiltOsculatingDecision {
  return {
    version: LILITH_SELF_BUILT_OSCULATING_DECISION_VERSION,
    status: LILITH_SELF_BUILT_OSCULATING_DECISION_STATUS,
    scope: LILITH_SELF_BUILT_OSCULATING_DECISION_SCOPE,
    modelId: LILITH_SELF_BUILT_OSCULATING_MODEL_ID,
    apiPolicy: LILITH_SELF_BUILT_OSCULATING_API_POLICY,
    runtimeDependencyPolicy: LILITH_SELF_BUILT_OSCULATING_RUNTIME_DEPENDENCY_POLICY,
    productionOutputAllowed: LILITH_SELF_BUILT_OSCULATING_PRODUCTION_OUTPUT_ALLOWED,
    decisionContractStatus: LILITH_MODEL_DECISION_STATUS,
    decisionContractScope: LILITH_MODEL_DECISION_SCOPE,
    sourceFeasibilityStatus: LILITH_SOURCE_FEASIBILITY_STATUS,
    sourceFeasibilityRuntime: LILITH_SOURCE_FEASIBILITY_RUNTIME,
    sourceFeasibilityApprovedForOutput: LILITH_SOURCE_FEASIBILITY_APPROVED_FOR_OUTPUT,
    productionOutputStatus: LILITH_PRODUCTION_OUTPUT_STATUS,
    inputs: LILITH_SELF_BUILT_OSCULATING_INPUTS,
    rejectedShortcuts: LILITH_SELF_BUILT_OSCULATING_REJECTED_SHORTCUTS,
  };
}

export function assertLilithSelfBuiltOsculatingDecisionIsSafe(
  decision: LilithSelfBuiltOsculatingDecision,
): void {
  if (decision.productionOutputAllowed !== true || decision.sourceFeasibilityApprovedForOutput !== true) {
    throw new Error("Validated True/Osculating Lilith natal output must remain approved.");
  }
  if (decision.apiPolicy !== "no-external-api") {
    throw new Error("Lilith must not use an external API.");
  }
  if (decision.runtimeDependencyPolicy !== "no-new-lilith-runtime-dependency") {
    throw new Error("Lilith must not add a new runtime dependency.");
  }
  if (decision.modelId !== "true-osculating-black-moon-lilith") {
    throw new Error("The selected model must remain True/Osculating Black Moon Lilith.");
  }
  if (decision.productionOutputStatus !== "calculated-natal-report-approved") {
    throw new Error("Lilith approval must remain bounded to calculated natal reports.");
  }
}
