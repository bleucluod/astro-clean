import { getPersistentReportsDecision } from "@/lib/account/persistent-report-decision";
import {
  canUseSupabaseAuthStub,
  getHalleusRuntimeEnv,
} from "@/lib/config/env";
import type { AuthDriver } from "@/types/auth";
import { createPreviewAuthDriver } from "./preview-auth-driver";
import { createSupabaseAuthDriverStub } from "./supabase-auth-driver";

export function getPreparedSupabaseAuthDriverStub(): AuthDriver {
  const env = getHalleusRuntimeEnv();

  return createSupabaseAuthDriverStub({
    siteUrl: env.siteUrl,
    supabaseUrl: env.supabaseUrl,
    supabaseAnonKey: env.supabaseAnonKey,
  });
}

export function getAuthDriver(): AuthDriver {
  const decision = getPersistentReportsDecision();

  if (
    decision.authProvider === "supabase" &&
    canUseSupabaseAuthStub()
  ) {
    return getPreparedSupabaseAuthDriverStub();
  }

  return createPreviewAuthDriver();
}
