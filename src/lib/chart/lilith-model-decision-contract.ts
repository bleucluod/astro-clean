export const LILITH_MODEL_DECISION_CONTRACT_VERSION = "v0.1.235" as const;
export const LILITH_MODEL_DECISION_STATUS = "deferred-source-decision" as const;
export const LILITH_MODEL_DECISION_SCOPE = "black-moon-lilith-only" as const;
export const LILITH_PRODUCTION_OUTPUT_STATUS = "not-calculated" as const;
export const LILITH_RUNTIME_SOURCE_POLICY = "no-new-runtime-ephemeris-dependency" as const;
export const LILITH_PREFERRED_NEXT_MODEL_ID = "true-osculating-black-moon-lilith" as const;
export const LILITH_PREFERRED_NEXT_PATH = "self-built-local-osculating-probe-from-moon-state-vector" as const;
export const LILITH_EXTERNAL_API_POLICY = "forbidden" as const;

export const LILITH_CANDIDATE_MODEL_IDS = [
  "mean-black-moon-lilith",
  "true-osculating-black-moon-lilith",
] as const;

export const LILITH_FORBIDDEN_MODEL_IDS = [
  "dark-moon-lilith-waldemath",
  "unnamed-lilith",
  "calculated-lilith-without-source-contract",
] as const;

export type LilithCandidateModelId = (typeof LILITH_CANDIDATE_MODEL_IDS)[number];
export type LilithForbiddenModelId = (typeof LILITH_FORBIDDEN_MODEL_IDS)[number];

export type LilithCandidateModelDecision = {
  id: LilithCandidateModelId;
  status: "candidate-only";
  productionOutputAllowed: false;
  requiredBeforeOutput: readonly string[];
};

export type LilithModelDecisionContract = {
  version: typeof LILITH_MODEL_DECISION_CONTRACT_VERSION;
  status: typeof LILITH_MODEL_DECISION_STATUS;
  scope: typeof LILITH_MODEL_DECISION_SCOPE;
  productionOutputStatus: typeof LILITH_PRODUCTION_OUTPUT_STATUS;
  runtimeSourcePolicy: typeof LILITH_RUNTIME_SOURCE_POLICY;
  candidateModels: readonly LilithCandidateModelDecision[];
  forbiddenModels: readonly LilithForbiddenModelId[];
  notes: readonly string[];
};

export const LILITH_REQUIRED_BEFORE_OUTPUT = [
  "select one Black Moon Lilith model explicitly",
  "prove a local/source calculation path without fake labels",
  "add offline/reference fixtures before engine output",
  "keep report/UI deferred until the engine has calculated longitude data",
] as const;

export const LILITH_MODEL_DECISION_NOTES = [
  "Halleus treats Black Moon Lilith as a deferred special point after local True/Osculating Lunar Nodes.",
  "Mean Black Moon Lilith and True/Osculating Black Moon Lilith are candidate models only.",
  "Dark Moon/Waldemath Lilith is out of scope and must not be conflated with Black Moon Lilith.",
  "No Lilith production output, UI claim, report claim, or transit use is approved by this contract.",
  "No external API or new Swiss Ephemeris runtime dependency is approved for Lilith in this contract.",
  "The preferred next path is a self-built local True/Osculating Black Moon Lilith probe from Moon state vectors.",
  "Mean Black Moon Lilith remains a later candidate only if a public/permissive formula is selected and validated.",
] as const;

export function getLilithModelDecisionContract(): LilithModelDecisionContract {
  return {
    version: LILITH_MODEL_DECISION_CONTRACT_VERSION,
    status: LILITH_MODEL_DECISION_STATUS,
    scope: LILITH_MODEL_DECISION_SCOPE,
    productionOutputStatus: LILITH_PRODUCTION_OUTPUT_STATUS,
    runtimeSourcePolicy: LILITH_RUNTIME_SOURCE_POLICY,
    candidateModels: LILITH_CANDIDATE_MODEL_IDS.map((id) => ({
      id,
      status: "candidate-only",
      productionOutputAllowed: false,
      requiredBeforeOutput: LILITH_REQUIRED_BEFORE_OUTPUT,
    })),
    forbiddenModels: LILITH_FORBIDDEN_MODEL_IDS,
    notes: LILITH_MODEL_DECISION_NOTES,
  };
}

export function assertLilithModelDecisionContractIsSafe(contract: LilithModelDecisionContract): void {
  if (contract.status !== LILITH_MODEL_DECISION_STATUS) {
    throw new Error("Lilith model decision status changed without an approval batch.");
  }

  if (contract.productionOutputStatus !== "not-calculated") {
    throw new Error("Lilith production output must remain not-calculated.");
  }

  for (const model of contract.candidateModels) {
    if (model.productionOutputAllowed) {
      throw new Error(`Lilith candidate model ${model.id} must not be production output yet.`);
    }
  }

  if (!contract.forbiddenModels.includes("dark-moon-lilith-waldemath")) {
    throw new Error("Lilith contract must keep Dark Moon/Waldemath out of scope.");
  }
}
