export type AccountProvider = "local-preview" | "email" | "phone" | "google";

export type AccountStatus = "preview" | "active" | "disabled";

export type PlanSlug = "preview" | "personal" | "professional";

export type SubscriptionStatus =
  | "none"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled";

export type UserProfile = {
  id: string;
  email?: string;
  displayName?: string;
  provider: AccountProvider;
  status: AccountStatus;
  plan: PlanSlug;
  createdAt: string;
  updatedAt: string;
};

export type AuthSession = {
  user: UserProfile;
  isAuthenticated: boolean;
  source: AccountProvider;
};

export type PlanEntitlement = {
  plan: PlanSlug;
  maxSavedReports: number | "unlimited";
  canExportReports: boolean;
  canImportReports: boolean;
  canUseDatabaseStorage: boolean;
  canCreatePrivateNotes: boolean;
  canUseAdvancedInterpretations: boolean;
};

export type AccountMigrationState =
  | "not-started"
  | "local-preview-ready"
  | "account-ready"
  | "migrated";
