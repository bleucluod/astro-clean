export type PersistentReportsAuthProvider = "supabase";

export type PersistentReportsStorageProvider = "supabase-postgres";

export type PersistentReportsImplementationStage =
  | "selected-not-enabled"
  | "staging"
  | "production";

export type PersistentReportsDecision = {
  stage: PersistentReportsImplementationStage;
  authProvider: PersistentReportsAuthProvider;
  storageProvider: PersistentReportsStorageProvider;
  activeStorageMode: "local-preview";
  defaultVisibility: "private";
  indexingPolicy: "noindex";
  canEnableRealAccounts: boolean;
  blockers: string[];
  nextSteps: string[];
  migrationRules: string[];
};

export const persistentReportsDecision: PersistentReportsDecision = {
  stage: "selected-not-enabled",
  authProvider: "supabase",
  storageProvider: "supabase-postgres",
  activeStorageMode: "local-preview",
  defaultVisibility: "private",
  indexingPolicy: "noindex",
  canEnableRealAccounts: false,
  blockers: [
    "Supabase project and database are not configured in the app yet.",
    "No real auth driver has been enabled.",
    "Local-preview report migration UI has not shipped yet.",
  ],
  nextSteps: [
    "Configure Supabase environment variables outside Git.",
    "Implement the Supabase auth driver behind the existing AuthDriver contract.",
    "Connect report writes to authenticated user ids through the repository layer.",
    "Ship a local-preview to account migration review step before deleting local data.",
  ],
  migrationRules: [
    "Keep report ids when possible.",
    "Default migrated reports to private and noindex.",
    "Preserve favorites, notes, createdAt, updatedAt, and report JSON.",
    "Do not delete local-preview reports until account import succeeds.",
  ],
};

export function getPersistentReportsDecision() {
  return persistentReportsDecision;
}
