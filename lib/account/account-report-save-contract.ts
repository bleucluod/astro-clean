import {
  getPersistentReportRepositoryPrep,
  type PersistentReportRepositoryPrep,
} from "@/lib/storage/persistent-report-repository";
import type { AuthSession } from "@/types/account";

export type AccountReportSaveContractStage =
  | "local-preview-active"
  | "account-save-contract-ready"
  | "blocked";

export type AccountReportSaveContract = {
  stage: AccountReportSaveContractStage;
  activeSaveMode: "local-preview";
  futureSaveMode: "account-storage";
  canSaveToAccount: false;
  defaultVisibility: "private";
  indexingPolicy: "noindex";
  localReportCount: number;
  repositoryPrep: PersistentReportRepositoryPrep;
  blockers: string[];
  requiredBeforeEnable: string[];
  preservationRules: string[];
};

export function getAccountReportSaveContract(
  session?: AuthSession,
  localReportCount = 0,
): AccountReportSaveContract {
  const repositoryPrep = getPersistentReportRepositoryPrep(session);
  const blockers = [
    ...repositoryPrep.blockers,
    "Real Supabase login is not enabled.",
    "Account report writes are not enabled.",
    "Local-to-account migration review has not been confirmed.",
  ];

  return {
    stage:
      repositoryPrep.stage === "account-storage-prepared"
        ? "account-save-contract-ready"
        : "blocked",
    activeSaveMode: "local-preview",
    futureSaveMode: "account-storage",
    canSaveToAccount: false,
    defaultVisibility: "private",
    indexingPolicy: "noindex",
    localReportCount,
    repositoryPrep,
    blockers,
    requiredBeforeEnable: [
      "Enable real Supabase auth and stable user ids.",
      "Enable account storage only after migration review UI is shipped.",
      "Route new report saves through a user-owned repository.",
      "Keep local-preview fallback available until account saves are verified.",
    ],
    preservationRules: [
      "Keep migrated reports private/noindex.",
      "Preserve report ids when possible.",
      "Preserve notes, favorites, createdAt, updatedAt, and report JSON.",
      "Never delete browser-local reports until account import succeeds.",
    ],
  };
}

export function assertAccountReportWritesStillDisabled() {
  const contract = getAccountReportSaveContract();

  if (contract.canSaveToAccount) {
    throw new Error("Account report writes must remain disabled in v0.1.182.");
  }

  return contract;
}
