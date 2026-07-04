import { getPersistentReportsDecision } from "@/lib/account/persistent-report-decision";
import {
  canUseRealSupabaseLogin,
  canUseSupabaseAuthStub,
  getHalleusRuntimeEnv,
} from "@/lib/config/env";
import type { AuthDriver } from "@/types/auth";
import { createPreviewAuthDriver } from "./preview-auth-driver";
import { createSupabaseAuthDriver } from "./supabase-auth-driver";

export function getPreparedSupabaseAuthDriverStub(): AuthDriver {
  return createSupabaseAuthDriver();
}

export function getPreparedSupabaseAuthDriver(): AuthDriver {
  return createSupabaseAuthDriver();
}

export function getAuthDriver(): AuthDriver {
  const decision = getPersistentReportsDecision();
  void getHalleusRuntimeEnv();

  if (
    decision.authProvider === "supabase" &&
    (canUseRealSupabaseLogin() || canUseSupabaseAuthStub())
  ) {
    return getPreparedSupabaseAuthDriver();
  }

  return createPreviewAuthDriver();
}
