import { getPreviewSession } from "@/lib/account/preview-session";
import type {
  AuthDriver,
  AuthSignInRequest,
  AuthSignInResult,
} from "@/types/auth";

export type SupabaseAuthDriverStubOptions = {
  siteUrl: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

export type SupabaseAuthDriverStubReadiness = {
  provider: "supabase";
  stage: "stub-only";
  canCreateRealSession: false;
  missingConfig: string[];
  message: string;
};

function getMissingConfig(options: SupabaseAuthDriverStubOptions) {
  const missingConfig: string[] = [];

  if (!options.supabaseUrl) {
    missingConfig.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!options.supabaseAnonKey) {
    missingConfig.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return missingConfig;
}

function createSupabaseUnavailableResult(
  request: AuthSignInRequest = {},
): AuthSignInResult {
  return {
    ok: false,
    message:
      "Supabase auth driver stub is prepared, but real login is not enabled yet.",
    redirectTo: request.redirectTo,
  };
}

export function getSupabaseAuthDriverStubReadiness(
  options: SupabaseAuthDriverStubOptions,
): SupabaseAuthDriverStubReadiness {
  return {
    provider: "supabase",
    stage: "stub-only",
    canCreateRealSession: false,
    missingConfig: getMissingConfig(options),
    message:
      "Supabase Auth is selected and wired as a stub only; it must not create real sessions yet.",
  };
}

export function createSupabaseAuthDriverStub(
  options: SupabaseAuthDriverStubOptions,
): AuthDriver {
  void options;

  return {
    provider: "supabase",

    async getSession() {
      return getPreviewSession();
    },

    async signIn(request) {
      return createSupabaseUnavailableResult(request);
    },

    async signOut() {
      return {
        ok: true,
        message:
          "Supabase auth stub does not manage real sessions yet; preview session remains local.",
      };
    },
  };
}
