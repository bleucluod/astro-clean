import {
  LOCAL_TRUE_NODE_CANDIDATE_APPROVAL,
  LOCAL_TRUE_NODE_CANDIDATE_METHOD,
  LOCAL_TRUE_NODE_CANDIDATE_SOURCE,
  LOCAL_TRUE_NODE_CANDIDATE_STATUS,
  type LocalTrueNodeCandidate,
} from "./local-true-node-candidate";

export const TRUE_NODE_SELECTION_CONTRACT_VERSION = "v0.1.231" as const;
export const TRUE_NODE_SELECTION_DEFAULT_MODE = "mean-lunar-node-production" as const;
export const TRUE_NODE_SELECTION_LOCAL_CANDIDATE_MODE = "local-true-node-disabled-candidate" as const;
export const TRUE_NODE_SELECTION_APPROVED_FUTURE_MODE = "approved-true-node-future" as const;

export type TrueNodeSelectionMode =
  | typeof TRUE_NODE_SELECTION_DEFAULT_MODE
  | typeof TRUE_NODE_SELECTION_LOCAL_CANDIDATE_MODE
  | typeof TRUE_NODE_SELECTION_APPROVED_FUTURE_MODE;

export type TrueNodeSelectionOutput =
  | "mean-lunar-node"
  | "blocked-local-candidate"
  | "blocked-future-approval";

export type TrueNodeSelectionApproval =
  | "production-mean-only"
  | typeof LOCAL_TRUE_NODE_CANDIDATE_APPROVAL
  | "future-approval-required";

export type TrueNodeSelectionContract = {
  version: typeof TRUE_NODE_SELECTION_CONTRACT_VERSION;
  mode: TrueNodeSelectionMode;
  productionOutput: TrueNodeSelectionOutput;
  approval: TrueNodeSelectionApproval;
  allowsNatalTrueNodeOutput: boolean;
  candidateSource: typeof LOCAL_TRUE_NODE_CANDIDATE_SOURCE | null;
  candidateMethod: typeof LOCAL_TRUE_NODE_CANDIDATE_METHOD | null;
  candidateStatus: typeof LOCAL_TRUE_NODE_CANDIDATE_STATUS | null;
  notes: readonly string[];
};

export const TRUE_NODE_SELECTION_CONTRACT_NOTES = [
  "The Halleus production natal chart remains Mean Lunar Node by default.",
  "The local True/Osculating Node helper is disabled and internal until approval.",
  "No external API, Swiss runtime dependency, UI output, or report copy is enabled by this contract.",
  "South Node for any future approved True Node model must derive from the selected North Node plus 180 degrees.",
] as const;

export function getMeanNodeProductionSelectionContract(): TrueNodeSelectionContract {
  return {
    version: TRUE_NODE_SELECTION_CONTRACT_VERSION,
    mode: TRUE_NODE_SELECTION_DEFAULT_MODE,
    productionOutput: "mean-lunar-node",
    approval: "production-mean-only",
    allowsNatalTrueNodeOutput: false,
    candidateSource: null,
    candidateMethod: null,
    candidateStatus: null,
    notes: TRUE_NODE_SELECTION_CONTRACT_NOTES,
  };
}

export function getDisabledLocalTrueNodeSelectionContract(
  candidate?: LocalTrueNodeCandidate,
): TrueNodeSelectionContract {
  return {
    version: TRUE_NODE_SELECTION_CONTRACT_VERSION,
    mode: TRUE_NODE_SELECTION_LOCAL_CANDIDATE_MODE,
    productionOutput: "blocked-local-candidate",
    approval: LOCAL_TRUE_NODE_CANDIDATE_APPROVAL,
    allowsNatalTrueNodeOutput: false,
    candidateSource: candidate?.source ?? LOCAL_TRUE_NODE_CANDIDATE_SOURCE,
    candidateMethod: candidate?.method ?? LOCAL_TRUE_NODE_CANDIDATE_METHOD,
    candidateStatus: candidate?.status ?? LOCAL_TRUE_NODE_CANDIDATE_STATUS,
    notes: TRUE_NODE_SELECTION_CONTRACT_NOTES,
  };
}

export function getFutureApprovedTrueNodeSelectionContract(): TrueNodeSelectionContract {
  return {
    version: TRUE_NODE_SELECTION_CONTRACT_VERSION,
    mode: TRUE_NODE_SELECTION_APPROVED_FUTURE_MODE,
    productionOutput: "blocked-future-approval",
    approval: "future-approval-required",
    allowsNatalTrueNodeOutput: false,
    candidateSource: null,
    candidateMethod: null,
    candidateStatus: null,
    notes: TRUE_NODE_SELECTION_CONTRACT_NOTES,
  };
}

export function getTrueNodeSelectionContract(
  mode: TrueNodeSelectionMode = TRUE_NODE_SELECTION_DEFAULT_MODE,
  candidate?: LocalTrueNodeCandidate,
): TrueNodeSelectionContract {
  if (mode === TRUE_NODE_SELECTION_DEFAULT_MODE) {
    return getMeanNodeProductionSelectionContract();
  }

  if (mode === TRUE_NODE_SELECTION_LOCAL_CANDIDATE_MODE) {
    return getDisabledLocalTrueNodeSelectionContract(candidate);
  }

  return getFutureApprovedTrueNodeSelectionContract();
}

export function assertTrueNodeSelectionContractIsSafe(contract: TrueNodeSelectionContract): void {
  if (contract.mode !== TRUE_NODE_SELECTION_DEFAULT_MODE && contract.allowsNatalTrueNodeOutput) {
    throw new Error("Internal True Node selection contract must not allow natal output before approval.");
  }

  if (contract.mode === TRUE_NODE_SELECTION_DEFAULT_MODE && contract.productionOutput !== "mean-lunar-node") {
    throw new Error("Default True Node selection contract must keep Mean Lunar Node as production output.");
  }

  if (contract.mode === TRUE_NODE_SELECTION_LOCAL_CANDIDATE_MODE) {
    if (contract.productionOutput !== "blocked-local-candidate") {
      throw new Error("Local True Node candidate must remain blocked from production output.");
    }

    if (contract.candidateSource !== LOCAL_TRUE_NODE_CANDIDATE_SOURCE) {
      throw new Error("Local True Node candidate source changed unexpectedly.");
    }

    if (contract.candidateMethod !== LOCAL_TRUE_NODE_CANDIDATE_METHOD) {
      throw new Error("Local True Node candidate method changed unexpectedly.");
    }
  }
}