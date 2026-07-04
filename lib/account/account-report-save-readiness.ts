import {
  canUseAccountReportSavePath,
  getHalleusRuntimeEnv,
  hasAuthConfig,
  hasDatabaseConfig,
  hasSupabasePublicConfig,
  hasSupabaseServerConfig,
} from "@/lib/config/env";
import type { AuthSession } from "@/types/account";

export type AccountReportSaveReadinessStage =
  | "account-save-enabled"
  | "blocked";

export type AccountReportSaveReadiness = {
  stage: AccountReportSaveReadinessStage;
  activeSaveMode: "local-preview" | "local-preview-with-account-copy";
  accountSaveMode: "user-owned-account-storage";
  canSaveToAccount: boolean;
  defaultVisibility: "private";
  indexingPolicy: "noindex";
  userId?: string;
  blockers: string[];
  rules: string[];
};

function normalizeUserId(session?: AuthSession) {
  const userId = session?.isAuthenticated ? session.user.id.trim() : "";

  return userId || undefined;
}

export function getAccountReportSaveReadiness(
  session?: AuthSession,
): AccountReportSaveReadiness {
  const env = getHalleusRuntimeEnv();
  const blockers: string[] = [];
  const userId = normalizeUserId(session);

  if (!env.accountReportSaveEnabled) {
    blockers.push("NEXT_PUBLIC_HALLEUS_ENABLE_ACCOUNT_REPORT_SAVE is not enabled.");
  }

  if (!env.accountStorageEnabled) {
    blockers.push("HALLEUS_ENABLE_ACCOUNT_STORAGE is not enabled.");
  }

  if (!env.supabaseLoginEnabled) {
    blockers.push("NEXT_PUBLIC_HALLEUS_ENABLE_SUPABASE_LOGIN is not enabled.");
  }

  if (!hasSupabasePublicConfig()) {
    blockers.push("Supabase public config is missing.");
  }

  if (!hasSupabaseServerConfig()) {
    blockers.push("SUPABASE_SERVICE_ROLE_KEY is missing.");
  }

  if (!hasDatabaseConfig()) {
    blockers.push("DATABASE_URL is missing.");
  }

  if (!hasAuthConfig()) {
    blockers.push("AUTH_SECRET is missing.");
  }

  if (session && !userId) {
    blockers.push("No authenticated Supabase user id is available.");
  }

  const canSaveToAccount = canUseAccountReportSavePath() && blockers.length === 0;

  return {
    stage: canSaveToAccount ? "account-save-enabled" : "blocked",
    activeSaveMode: canSaveToAccount
      ? "local-preview-with-account-copy"
      : "local-preview",
    accountSaveMode: "user-owned-account-storage",
    canSaveToAccount,
    defaultVisibility: "private",
    indexingPolicy: "noindex",
    userId,
    blockers,
    rules: [
      "New account report saves require a verified Supabase bearer token.",
      "Account report records must use the authenticated Supabase user id.",
      "Saved account reports stay private/noindex by default.",
      "Keep local-preview fallback and do not delete browser-local reports.",
      "Local-to-account migration execution remains disabled.",
    ],
  };
}

export function assertAccountReportSavePathGuarded() {
  return getAccountReportSaveReadiness();
}