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

export const LILITH_SELF_BUILT_OSCULATING_DECISION_VERSION = "v0.1.237" as const;
export const LILITH_SELF_BUILT_OSCULATING_DECISION_STATUS = "preferred-probe-path-approved" as const;
export const LILITH_SELF_BUILT_OSCULATING_DECISION_SCOPE = "self-built-true-osculating-black-moon-lilith-probe-only" as const;
export const LILITH_SELF_BUILT_OSCULATING_MODEL_ID = "true-osculating-black-moon-lilith" as const;
export const LILITH_SELF_BUILT_OSCULATING_API_POLICY = "no-external-api" as const;
export const LILITH_SELF_BUILT_OSCULATING_RUNTIME_DEPENDENCY_POLICY = "no-new-lilith-runtime-dependency" as const;
export const LILITH_SELF_BUILT_OSCULATING_PRODUCTION_OUTPUT_ALLOWED = false as const;

export const LILITH_SELF_BUILT_OSCULATING_INPUTS = [
  "geocentric Moon position state vector",
  "geocentric Moon velocity state vector",
  "ecliptic rotation from the existing local astronomy runtime",
] as const;

export const LILITH_SELF_BUILT_OSCULATING_ALGORITHM_REQUIREMENTS = [
  "derive the osculating lunar orbit from the same instant Moon position and velocity vectors",
  "derive the periapsis direction from the osculating orbit, not from a lunar apsis event time",
  "derive the apogee direction as the exact opposite of the periapsis direction",
  "convert the apogee direction into normalized geocentric ecliptic longitude",
  "keep the result internal until offline reference fixtures and sanity guards pass",
] as const;

export const LILITH_SELF_BUILT_OSCULATING_REJECTED_SHORTCUTS = [
  "external-api-lilith",
  "new-swiss-runtime-dependency",
  "SearchLunarApsis-as-natal-longitude",
  "NextLunarApsis-as-natal-longitude",
  "mean-lilith-without-public-permissive-formula",
  "dark-moon-lilith-waldemath",
  "asteroid-1181-lilith",
] as const;

export const LILITH_SELF_BUILT_OSCULATING_REQUIRED_BEFORE_PRODUCTION = [
  "write a probe-only self-built osculating Lilith calculator",
  "compare probe output against offline reference fixtures before engine output",
  "add range, normalization, and date-regression guards",
  "keep ReportCard, report writer, chart wheel, and public reports deferred until output is approved",
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
  algorithmRequirements: readonly (typeof LILITH_SELF_BUILT_OSCULATING_ALGORITHM_REQUIREMENTS)[number][];
  rejectedShortcuts: readonly (typeof LILITH_SELF_BUILT_OSCULATING_REJECTED_SHORTCUTS)[number][];
  requiredBeforeProduction: readonly (typeof LILITH_SELF_BUILT_OSCULATING_REQUIRED_BEFORE_PRODUCTION)[number][];
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
    algorithmRequirements: LILITH_SELF_BUILT_OSCULATING_ALGORITHM_REQUIREMENTS,
    rejectedShortcuts: LILITH_SELF_BUILT_OSCULATING_REJECTED_SHORTCUTS,
    requiredBeforeProduction: LILITH_SELF_BUILT_OSCULATING_REQUIRED_BEFORE_PRODUCTION,
  };
}

export function assertLilithSelfBuiltOsculatingDecisionIsSafe(
  decision: LilithSelfBuiltOsculatingDecision,
): void {
  if (decision.productionOutputAllowed !== false) {
    throw new Error("Self-built osculating Lilith decision must not approve production output yet.");
  }

  if (decision.apiPolicy !== "no-external-api") {
    throw new Error("Lilith must not use an external API.");
  }

  if (decision.runtimeDependencyPolicy !== "no-new-lilith-runtime-dependency") {
    throw new Error("Lilith must not add a new runtime dependency in this decision batch.");
  }

  if (decision.modelId !== "true-osculating-black-moon-lilith") {
    throw new Error("The preferred self-built probe path must target True/Osculating Black Moon Lilith.");
  }

  if (decision.sourceFeasibilityApprovedForOutput !== false || decision.productionOutputStatus !== "not-calculated") {
    throw new Error("Lilith must remain deferred and not-calculated until a validated probe/output batch.");
  }
}
