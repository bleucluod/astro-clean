import {
  LOCAL_TRUE_NODE_CANDIDATE_APPROVAL,
  LOCAL_TRUE_NODE_CANDIDATE_METHOD,
  LOCAL_TRUE_NODE_CANDIDATE_SOURCE,
  LOCAL_TRUE_NODE_CANDIDATE_STATUS,
  type LocalTrueNodeCandidate,
} from "./local-true-node-candidate";

export const TRUE_NODE_SELECTION_CONTRACT_VERSION = "v0.1.232" as const;
export const TRUE_NODE_SELECTION_DEFAULT_MODE = "local-true-node-production" as const;
export const TRUE_NODE_SELECTION_MEAN_FALLBACK_MODE = "mean-lunar-node-fallback" as const;
export const TRUE_NODE_SELECTION_APPROVED_FUTURE_MODE = "approved-true-node-future" as const;

export type TrueNodeSelectionMode =
  | typeof TRUE_NODE_SELECTION_DEFAULT_MODE
  | typeof TRUE_NODE_SELECTION_MEAN_FALLBACK_MODE
  | typeof TRUE_NODE_SELECTION_APPROVED_FUTURE_MODE;

export type TrueNodeSelectionOutput =
  | "local-true-node"
  | "mean-lunar-node-fallback"
  | "blocked-future-approval";

export type TrueNodeSelectionApproval =
  | typeof LOCAL_TRUE_NODE_CANDIDATE_APPROVAL
  | "production-mean-fallback"
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
  "The Halleus production natal chart uses the local True/Osculating Lunar Node model.",
  "The local True/Osculating Node model is calculated from Astronomy Engine GeoMoonState.",
  "No external API, Swiss runtime dependency, UI rewrite, or report copy rewrite is enabled by this contract.",
  "South Node derives from the selected North Node plus 180 degrees.",
] as const;

export function getLocalTrueNodeProductionSelectionContract(
  candidate?: LocalTrueNodeCandidate,
): TrueNodeSelectionContract {
  return {
    version: TRUE_NODE_SELECTION_CONTRACT_VERSION,
    mode: TRUE_NODE_SELECTION_DEFAULT_MODE,
    productionOutput: "local-true-node",
    approval: LOCAL_TRUE_NODE_CANDIDATE_APPROVAL,
    allowsNatalTrueNodeOutput: true,
    candidateSource: candidate?.source ?? LOCAL_TRUE_NODE_CANDIDATE_SOURCE,
    candidateMethod: candidate?.method ?? LOCAL_TRUE_NODE_CANDIDATE_METHOD,
    candidateStatus: candidate?.status ?? LOCAL_TRUE_NODE_CANDIDATE_STATUS,
    notes: TRUE_NODE_SELECTION_CONTRACT_NOTES,
  };
}

export function getMeanNodeFallbackSelectionContract(): TrueNodeSelectionContract {
  return {
    version: TRUE_NODE_SELECTION_CONTRACT_VERSION,
    mode: TRUE_NODE_SELECTION_MEAN_FALLBACK_MODE,
    productionOutput: "mean-lunar-node-fallback",
    approval: "production-mean-fallback",
    allowsNatalTrueNodeOutput: false,
    candidateSource: null,
    candidateMethod: null,
    candidateStatus: null,
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
    return getLocalTrueNodeProductionSelectionContract(candidate);
  }

  if (mode === TRUE_NODE_SELECTION_MEAN_FALLBACK_MODE) {
    return getMeanNodeFallbackSelectionContract();
  }

  return getFutureApprovedTrueNodeSelectionContract();
}

export function assertTrueNodeSelectionContractIsSafe(contract: TrueNodeSelectionContract): void {
  if (contract.mode === TRUE_NODE_SELECTION_DEFAULT_MODE) {
    if (contract.productionOutput !== "local-true-node") {
      throw new Error("Default True Node selection contract must use local True/Osculating Node output.");
    }

    if (!contract.allowsNatalTrueNodeOutput) {
      throw new Error("Default True Node selection contract must allow the approved local natal output.");
    }

    if (contract.candidateSource !== LOCAL_TRUE_NODE_CANDIDATE_SOURCE) {
      throw new Error("Default True Node selection contract source changed unexpectedly.");
    }

    if (contract.candidateMethod !== LOCAL_TRUE_NODE_CANDIDATE_METHOD) {
      throw new Error("Default True Node selection contract method changed unexpectedly.");
    }

    return;
  }

  if (contract.mode === TRUE_NODE_SELECTION_MEAN_FALLBACK_MODE) {
    if (contract.productionOutput !== "mean-lunar-node-fallback" || contract.allowsNatalTrueNodeOutput) {
      throw new Error("Mean Lunar Node selection must remain a non-True-Node fallback.");
    }

    return;
  }

  if (contract.mode === TRUE_NODE_SELECTION_APPROVED_FUTURE_MODE && contract.allowsNatalTrueNodeOutput) {
    throw new Error("Future True Node approval mode must remain blocked until a separate approval batch.");
  }
}
