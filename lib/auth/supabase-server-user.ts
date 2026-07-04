import { createClient, type User } from "@supabase/supabase-js";

import { getHalleusRuntimeEnv } from "@/lib/config/env";

export type VerifiedSupabaseAccountUser = {
  id: string;
  email?: string;
  displayName?: string;
};

function readBearerToken(authorizationHeader: string | null) {
  const value = authorizationHeader?.trim();

  if (!value?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = value.slice("bearer ".length).trim();

  return token || null;
}

function getUserDisplayName(user: User) {
  const metadata = user.user_metadata;
  const fullName = metadata?.full_name;
  const name = metadata?.name;

  if (typeof fullName === "string" && fullName.trim()) {
    return fullName.trim();
  }

  if (typeof name === "string" && name.trim()) {
    return name.trim();
  }

  return undefined;
}

export async function getSupabaseUserFromAuthorizationHeader(
  authorizationHeader: string | null,
): Promise<VerifiedSupabaseAccountUser | null> {
  const token = readBearerToken(authorizationHeader);

  if (!token) {
    return null;
  }

  const env = getHalleusRuntimeEnv();

  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error("Supabase server auth is not configured.");
  }

  const client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await client.auth.getUser(token);

  if (error || !data.user) {
    throw new Error(error?.message ?? "Supabase user token could not be verified.");
  }

  return {
    id: data.user.id,
    email: data.user.email,
    displayName: getUserDisplayName(data.user),
  };
}