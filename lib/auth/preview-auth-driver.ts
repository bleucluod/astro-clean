import { getPreviewSession } from "@/lib/account/preview-session";
import type { AuthDriver } from "@/types/auth";
import { createUnavailableSignInResult } from "./auth-driver";

export function createPreviewAuthDriver(): AuthDriver {
  return {
    provider: "preview",

    async getSession() {
      return getPreviewSession();
    },

    async signIn(request) {
      return createUnavailableSignInResult(request);
    },

    async signOut() {
      return {
        ok: true,
        message: "Preview session stays local until real authentication is enabled.",
      };
    },
  };
}
