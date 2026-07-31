export const LILITH_MODEL_DECISION_CONTRACT_VERSION = "v0.1.370" as const;
export const LILITH_MODEL_DECISION_STATUS = "true-osculating-model-approved" as const;
export const LILITH_MODEL_DECISION_SCOPE = "black-moon-lilith-only" as const;
export const LILITH_PRODUCTION_OUTPUT_STATUS = "calculated-natal-report-approved" as const;
export const LILITH_RUNTIME_SOURCE_POLICY = "no-new-runtime-ephemeris-dependency" as const;
export const LILITH_SELECTED_MODEL_ID = "true-osculating-black-moon-lilith" as const;
export const LILITH_SELECTED_PATH = "self-built-local-osculating-apogee-from-moon-state-vector" as const;
export const LILITH_EXTERNAL_API_POLICY = "forbidden" as const;

export const LILITH_CANDIDATE_MODEL_IDS = [
  "mean-black-moon-lilith",
  "true-osculating-black-moon-lilith",
] as const;

export const LILITH_FORBIDDEN_MODEL_IDS = [
  "dark-moon-lilith-waldemath",
  "unnamed-lilith",
  "calculated-lilith-without-source-contract",
  "asteroid-1181-lilith",
] as const;

export type LilithCandidateModelId = (typeof LILITH_CANDIDATE_MODEL_IDS)[number];
export type LilithForbiddenModelId = (typeof LILITH_FORBIDDEN_MODEL_IDS)[number];

export type LilithCandidateModelDecision = {
  id: LilithCandidateModelId;
  status: "selected" | "deferred";
  productionOutputAllowed: boolean;
  requiredBeforeOutput: readonly string[];
};

export type LilithModelDecisionContract = {
  version: typeof LILITH_MODEL_DECISION_CONTRACT_VERSION;
  status: typeof LILITH_MODEL_DECISION_STATUS;
  scope: typeof LILITH_MODEL_DECISION_SCOPE;
  productionOutputStatus: typeof LILITH_PRODUCTION_OUTPUT_STATUS;
  runtimeSourcePolicy: typeof LILITH_RUNTIME_SOURCE_POLICY;
  selectedModelId: typeof LILITH_SELECTED_MODEL_ID;
  candidateModels: readonly LilithCandidateModelDecision[];
  forbiddenModels: readonly LilithForbiddenModelId[];
  notes: readonly string[];
};

export const LILITH_REQUIRED_BEFORE_OUTPUT = [
  "select one Black Moon Lilith model explicitly",
  "prove a local calculation path without fake labels",
  "pass fixed independent osculating-apogee reference fixtures",
  "keep transit, chart-wheel and public SEO claims separately gated",
] as const;

export const LILITH_MODEL_DECISION_NOTES = [
  "Halleus selects local True/Osculating Black Moon Lilith for natal report interpretation.",
  "The local Moon state-vector calculation passed fixed offline Swiss Ephemeris osculating-apogee reference fixtures within the approved tolerance.",
  "Mean Black Moon Lilith remains deferred and is not silently substituted.",
  "Dark Moon/Waldemath and asteroid 1181 Lilith remain out of scope.",
  "No external API or Swiss Ephemeris runtime dependency is used in production.",
  "Approval is limited to bounded natal-report interpretation; transit, chart-wheel and public SEO expansion remain separate decisions.",
] as const;

export function getLilithModelDecisionContract(): LilithModelDecisionContract {
  return {
    version: LILITH_MODEL_DECISION_CONTRACT_VERSION,
    status: LILITH_MODEL_DECISION_STATUS,
    scope: LILITH_MODEL_DECISION_SCOPE,
    productionOutputStatus: LILITH_PRODUCTION_OUTPUT_STATUS,
    runtimeSourcePolicy: LILITH_RUNTIME_SOURCE_POLICY,
    selectedModelId: LILITH_SELECTED_MODEL_ID,
    candidateModels: LILITH_CANDIDATE_MODEL_IDS.map((id) => ({
      id,
      status: id === LILITH_SELECTED_MODEL_ID ? "selected" : "deferred",
      productionOutputAllowed: id === LILITH_SELECTED_MODEL_ID,
      requiredBeforeOutput: LILITH_REQUIRED_BEFORE_OUTPUT,
    })),
    forbiddenModels: LILITH_FORBIDDEN_MODEL_IDS,
    notes: LILITH_MODEL_DECISION_NOTES,
  };
}

export function assertLilithModelDecisionContractIsSafe(contract: LilithModelDecisionContract): void {
  if (contract.status !== "true-osculating-model-approved") {
    throw new Error("Lilith model decision must retain the approved True/Osculating contract.");
  }
  if (contract.productionOutputStatus !== "calculated-natal-report-approved") {
    throw new Error("Lilith natal report output approval is missing.");
  }
  const selected = contract.candidateModels.filter((model) => model.productionOutputAllowed);
  if (selected.length !== 1 || selected[0]?.id !== LILITH_SELECTED_MODEL_ID) {
    throw new Error("Exactly one approved Lilith model must be selected.");
  }
  if (!contract.forbiddenModels.includes("dark-moon-lilith-waldemath")) {
    throw new Error("Lilith contract must keep Dark Moon/Waldemath out of scope.");
  }
}
