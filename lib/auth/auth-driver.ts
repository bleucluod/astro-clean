import type {
  AuthSignInRequest,
  AuthSignInResult,
} from "@/types/auth";

export type CreateAuthDriverOptions = {
  siteUrl: string;
};

export function createUnavailableSignInResult(
  request: AuthSignInRequest = {},
): AuthSignInResult {
  return {
    ok: false,
    message: "Real authentication is not enabled yet.",
    redirectTo: request.redirectTo,
  };
}

