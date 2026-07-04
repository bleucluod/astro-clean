import type { AuthSession } from "@/types/account";

export type AuthProviderSlug = "preview" | "supabase" | "authjs" | "clerk";

export type AuthImplementationStage =
  | "preview-only"
  | "provider-selected"
  | "staging"
  | "production";

export type AuthProviderDecisionStatus =
  | "undecided"
  | "recommended"
  | "selected"
  | "rejected";

export type AuthProviderOption = {
  provider: AuthProviderSlug;
  status: AuthProviderDecisionStatus;
  strengths: string[];
  tradeoffs: string[];
  bestWhen: string[];
};

export type AuthSignInRequest = {
  email?: string;
  password?: string;
  redirectTo?: string;
  provider?: AuthProviderSlug;
};

export type AuthSignInResult = {
  ok: boolean;
  message: string;
  redirectTo?: string;
};

export type AuthDriver = {
  provider: AuthProviderSlug;
  getSession(): Promise<AuthSession>;
  signIn(request: AuthSignInRequest): Promise<AuthSignInResult>;
  signOut(): Promise<AuthSignInResult>;
};

export type AuthReadinessReport = {
  stage: AuthImplementationStage;
  provider: AuthProviderSlug;
  canEnableRealLogin: boolean;
  blockers: string[];
  recommendedNextSteps: string[];
};
