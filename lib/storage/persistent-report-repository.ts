import { persistentReportsDecision } from "@/lib/account/persistent-report-decision";
import {
  canUseAccountStorage,
  hasAuthConfig,
  hasDatabaseConfig,
  hasSupabasePublicConfig,
} from "@/lib/config/env";
import type { AuthSession } from "@/types/account";

export type PersistentReportRepositoryStage =
  | "local-preview-active"
  | "account-storage-prepared"
  | "blocked";

export type PersistentReportRepositoryPrep = {
  stage: PersistentReportRepositoryStage;
  activeRepositoryMode: "local-preview";
  preparedRepositoryMode: "account-storage";
  provider: "supabase-postgres";
  canWriteAccountReports: false;
  canEnableAccountStorage: boolean;
  userId?: string;
  blockers: string[];
  rules: string[];
};

function normalizeUserId(session?: AuthSession) {
  const userId = session?.isAuthenticated ? session.user.id.trim() : "";

  return userId || undefined;
}

export function getPersistentReportRepositoryPrep(
  session?: AuthSession,
): PersistentReportRepositoryPrep {
  const blockers: string[] = [];
  const userId = normalizeUserId(session);

  if (!hasDatabaseConfig()) {
    blockers.push("DATABASE_URL is missing.");
  }

  if (!hasAuthConfig()) {
    blockers.push("AUTH_SECRET is missing.");
  }

  if (!hasSupabasePublicConfig()) {
    blockers.push("Supabase public config is missing.");
  }

  if (!userId) {
    blockers.push("No authenticated Supabase user id is available.");
  }

  return {
    stage: blockers.length > 0 ? "blocked" : "account-storage-prepared",
    activeRepositoryMode: persistentReportsDecision.activeStorageMode,
    preparedRepositoryMode: "account-storage",
    provider: persistentReportsDecision.storageProvider,
    canWriteAccountReports: false,
    canEnableAccountStorage: canUseAccountStorage(),
    userId,
    blockers,
    rules: [
      "Do not replace getReportRepository while local-preview is the active mode.",
      "Do not write account reports until real Supabase auth and migration review exist.",
      "Keep migrated reports private/noindex by default.",
      "Do not delete browser-local reports until account import succeeds.",
    ],
  };
}

export function assertAccountStorageStillDisabled() {
  const prep = getPersistentReportRepositoryPrep();

  if (prep.canWriteAccountReports) {
    throw new Error("Account report writes must remain disabled in v0.1.181.");
  }

  return prep;
}
