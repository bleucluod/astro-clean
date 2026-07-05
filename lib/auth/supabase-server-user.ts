import { createClient, type User } from "@supabase/supabase-js";

import { getHalleusRuntimeEnv } from "@/lib/config/env";
import {
  extractUsernameFromSupabaseBridgeEmail,
  isSupabaseUsernameBridgeEmail,
} from "./account-identity-normalization";

export type VerifiedSupabaseAccountUser = {
  id: string;
  email?: string;
  phone?: string;
  displayName?: string;
  provider: "email" | "phone";
};

function readBearerToken(authorizationHeader: string | null) {
  const value = authorizationHeader?.trim();

  if (!value?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = value.slice("bearer ".length).trim();

  return token || null;
}

function getStringMetadataValue(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];

  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getUserDisplayName(user: User) {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const username = getStringMetadataValue(metadata, "username");
  const fullName = getStringMetadataValue(metadata, "full_name");
  const name = getStringMetadataValue(metadata, "name");

  if (username) {
    return username;
  }

  if (fullName) {
    return fullName;
  }

  if (name) {
    return name;
  }

  return extractUsernameFromSupabaseBridgeEmail(user.email);
}

function getUserAccountEmail(user: User) {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const secondaryEmail = getStringMetadataValue(metadata, "secondary_email");

  if (secondaryEmail) {
    return secondaryEmail;
  }

  return isSupabaseUsernameBridgeEmail(user.email) ? undefined : user.email;
}

function getUserAccountPhone(user: User) {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;

  return (
    user.phone ??
    getStringMetadataValue(metadata, "mobile_phone") ??
    getStringMetadataValue(metadata, "phone")
  );
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

  const phone = getUserAccountPhone(data.user);

  return {
    id: data.user.id,
    email: getUserAccountEmail(data.user),
    phone,
    displayName: getUserDisplayName(data.user),
    provider: phone ? "phone" : "email",
  };
}