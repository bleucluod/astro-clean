import { getPreviewSession } from "@/lib/account/preview-session";
import type { AuthDriver, AuthSignInResult } from "@/types/auth";
import { getSupabaseBrowserAuthClient } from "./supabase-browser-client";
import { mapSupabaseSessionToHalleusSession } from "./supabase-session-mapper";

function unavailable(message: string, redirectTo?: string): AuthSignInResult {
  return {
    ok: false,
    message,
    redirectTo,
  };
}

export function createSupabaseAuthDriver(): AuthDriver {
  return {
    provider: "supabase",

    async getSession() {
      if (typeof window === "undefined") {
        return getPreviewSession();
      }

      const client = getSupabaseBrowserAuthClient();

      if (!client) {
        return getPreviewSession();
      }

      const { data, error } = await client.auth.getSession();

      if (error) {
        return getPreviewSession();
      }

      return mapSupabaseSessionToHalleusSession(data.session) ?? getPreviewSession();
    },

    async signIn(request) {
      if (typeof window === "undefined") {
        return unavailable("Supabase login must run in the browser.", request.redirectTo);
      }

      const client = getSupabaseBrowserAuthClient();

      if (!client) {
        return unavailable(
          "Supabase login is prepared, but public env config or the login flag is missing.",
          request.redirectTo,
        );
      }

      if (!request.password || (!request.phone && !request.email)) {
        return unavailable("Phone or secondary email and password are required.", request.redirectTo);
      }

      const { error } = request.phone
        ? await client.auth.signInWithPassword({
            phone: request.phone,
            password: request.password,
          })
        : await client.auth.signInWithPassword({
            email: request.email ?? "",
            password: request.password,
          });

      if (error) {
        return unavailable(error.message, request.redirectTo);
      }

      return {
        ok: true,
        message: "Supabase login succeeded.",
        redirectTo: request.redirectTo,
      };
    },

    async signOut() {
      if (typeof window === "undefined") {
        return {
          ok: true,
          message: "Server-side sign out is not used in the browser login shell.",
        };
      }

      const client = getSupabaseBrowserAuthClient();

      if (!client) {
        return {
          ok: true,
          message: "Supabase login is not configured; preview session remains local.",
        };
      }

      const { error } = await client.auth.signOut();

      return {
        ok: !error,
        message: error?.message ?? "Supabase session signed out.",
      };
    },
  };
}

export const createSupabaseAuthDriverStub = createSupabaseAuthDriver;
