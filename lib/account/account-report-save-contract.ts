import {
  getAccountReportSaveReadiness,
  type AccountReportSaveReadiness,
} from "@/lib/account/account-report-save-readiness";
import {
  getPersistentReportRepositoryPrep,
  type PersistentReportRepositoryPrep,
} from "@/lib/storage/persistent-report-repository";
import type { AuthSession } from "@/types/account";

export type AccountReportSaveContractStage =
  | "local-preview-active"
  | "account-save-contract-ready"
  | "account-save-enabled"
  | "blocked";

export type AccountReportSaveContract = {
  stage: AccountReportSaveContractStage;
  activeSaveMode:
    | "local-preview"
    | "local-preview-with-public-server-copy"
    | "local-preview-with-account-copy";
  futureSaveMode: "account-storage";
  canSaveToAccount: boolean;
  defaultVisibility: "public";
  indexingPolicy: "noindex";
  localReportCount: number;
  repositoryPrep: PersistentReportRepositoryPrep;
  accountSaveReadiness: AccountReportSaveReadiness;
  blockers: string[];
  requiredBeforeEnable: string[];
  preservationRules: string[];
};

export function getAccountReportSaveContract(
  session?: AuthSession,
  localReportCount = 0,
): AccountReportSaveContract {
  const repositoryPrep = getPersistentReportRepositoryPrep(session);
  const accountSaveReadiness = getAccountReportSaveReadiness(session);
  const canSaveToAccount = accountSaveReadiness.canSaveToAccount;
  const blockers = canSaveToAccount
    ? []
    : [
        ...repositoryPrep.blockers,
        ...accountSaveReadiness.blockers,
      ];

  return {
    stage: canSaveToAccount
      ? "account-save-enabled"
      : repositoryPrep.stage === "account-storage-prepared"
        ? "account-save-contract-ready"
        : "blocked",
    activeSaveMode: accountSaveReadiness.activeSaveMode,
    futureSaveMode: "account-storage",
    canSaveToAccount,
    defaultVisibility: "public",
    indexingPolicy: "noindex",
    localReportCount,
    repositoryPrep,
    accountSaveReadiness,
    blockers: [...new Set(blockers)],
    requiredBeforeEnable: [
      "Enable real Supabase auth and stable user ids for user-owned account saves.",
      "Allow public/noindex server report copies when DATABASE_URL is configured.",
      "Route signed-in account saves through a user-owned repository.",
      "Keep local-preview fallback available until server saves are verified.",
      "Keep migration execution disabled until backup and review are confirmed.",
    ],
    preservationRules: [
      "Keep saved reports public/noindex unless a later consent model changes this.",
      "Preserve report ids when possible.",
      "Preserve notes, favorites, createdAt, updatedAt, and report JSON.",
      "Never delete browser-local reports until account import succeeds.",
    ],
  };
}

export function assertAccountReportWritesStillDisabled() {
  const contract = getAccountReportSaveContract();

  if (contract.canSaveToAccount) {
    throw new Error("Account report writes are enabled only through the guarded v0.1.184 account save path.");
  }

  return contract;
}

export function assertAccountReportSavePathReady(session?: AuthSession) {
  const contract = getAccountReportSaveContract(session);

  if (!contract.canSaveToAccount) {
    throw new Error("Account report save path is not ready for the current environment/session.");
  }

  return contract;
}
