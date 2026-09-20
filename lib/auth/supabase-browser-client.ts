"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type SupabaseBrowserLoginConfig = {
  enabled: boolean;
  canUseRealSupabaseLogin: boolean;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  missingConfig: string[];
};

let browserClient: SupabaseClient | null = null;

const publicSupabaseLoginEnv = {
  NEXT_PUBLIC_HALLEUS_ENABLE_SUPABASE_LOGIN: process.env.NEXT_PUBLIC_HALLEUS_ENABLE_SUPABASE_LOGIN,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
} as const;

type PublicSupabaseLoginEnvName = keyof typeof publicSupabaseLoginEnv;

function getPublicEnv(name: PublicSupabaseLoginEnvName) {
  const value = publicSupabaseLoginEnv[name]?.trim();

  return value ? value : undefined;
}

function isPublicFlagEnabled(name: PublicSupabaseLoginEnvName) {
  return getPublicEnv(name)?.toLowerCase() === "true";
}

export function getSupabaseBrowserLoginConfig(): SupabaseBrowserLoginConfig {
  const supabaseUrl = getPublicEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = getPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const enabled = isPublicFlagEnabled("NEXT_PUBLIC_HALLEUS_ENABLE_SUPABASE_LOGIN");
  const missingConfig: string[] = [];

  if (!enabled) {
    missingConfig.push("NEXT_PUBLIC_HALLEUS_ENABLE_SUPABASE_LOGIN=true");
  }

  if (!supabaseUrl) {
    missingConfig.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!supabaseAnonKey) {
    missingConfig.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return {
    enabled,
    canUseRealSupabaseLogin: enabled && Boolean(supabaseUrl && supabaseAnonKey),
    supabaseUrl,
    supabaseAnonKey,
    missingConfig,
  };
}

export function getSupabaseBrowserAuthClient() {
  const config = getSupabaseBrowserLoginConfig();

  if (!config.canUseRealSupabaseLogin || !config.supabaseUrl || !config.supabaseAnonKey) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    });
  }

  return browserClient;
}
export type SupabaseBrowserAccessState =
  | { kind: "guest"; accessToken?: undefined; error?: undefined }
  | { kind: "account"; accessToken: string; error?: undefined }
  | { kind: "unavailable"; accessToken?: undefined; error: string };

// HALLEUS_GUEST_FIRST_AUTH_STATE_R11_20260919
const SUPABASE_SESSION_LOOKUP_TIMEOUT_MS = 2500;

function hasPersistedSupabaseBrowserSession() {
  if (typeof window === "undefined") return false;

  const config = getSupabaseBrowserLoginConfig();
  if (!config.supabaseUrl) return false;

  let projectRef = "";
  try {
    projectRef = new URL(config.supabaseUrl).hostname.split(".")[0]?.trim() ?? "";
  } catch {
    return false;
  }

  if (!projectRef) return false;

  const storagePrefix = `sb-${projectRef}-auth-token`;
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key === storagePrefix || key?.startsWith(`${storagePrefix}.`)) {
      return true;
    }
  }

  return false;
}

export async function getSupabaseBrowserAccessState(): Promise<SupabaseBrowserAccessState> {
  // A fresh signed-out browser has no persisted Supabase session. Do not make
  // guest report ownership wait on auth initialization or Web Locks.
  if (!hasPersistedSupabaseBrowserSession()) {
    return { kind: "guest" };
  }

  const client = getSupabaseBrowserAuthClient();
  if (!client) {
    return { kind: "guest" };
  }

  const outcome = await Promise.race([
    client.auth
      .getSession()
      .then(({ data, error }) => ({
        timedOut: false as const,
        accessToken: data.session?.access_token,
        error: error?.message,
      }))
      .catch((error: unknown) => ({
        timedOut: false as const,
        accessToken: undefined,
        error: error instanceof Error ? error.message : "Auth session lookup failed.",
      })),
    new Promise<{
      timedOut: true;
      accessToken?: undefined;
      error: string;
    }>((resolve) => {
      window.setTimeout(
        () =>
          resolve({
            timedOut: true,
            error: "Auth session lookup timed out.",
          }),
        SUPABASE_SESSION_LOOKUP_TIMEOUT_MS,
      );
    }),
  ]);

  if (outcome.timedOut || outcome.error) {
    return {
      kind: "unavailable",
      error: outcome.error ?? "Auth session lookup failed.",
    };
  }

  if (outcome.accessToken) {
    return {
      kind: "account",
      accessToken: outcome.accessToken,
    };
  }

  return { kind: "guest" };
}