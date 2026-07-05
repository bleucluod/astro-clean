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
