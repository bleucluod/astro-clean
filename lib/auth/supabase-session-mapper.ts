import type { Session } from "@supabase/supabase-js";
import type { AuthSession, UserProfile } from "@/types/account";
import {
  extractUsernameFromSupabaseBridgeEmail,
  isSupabaseUsernameBridgeEmail,
} from "./account-identity-normalization";

function getStringMetadataValue(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];

  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function mapSupabaseSessionToHalleusSession(
  session: Session | null,
): AuthSession | null {
  const user = session?.user;

  if (!user) {
    return null;
  }

  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const username =
    getStringMetadataValue(metadata, "username") ??
    extractUsernameFromSupabaseBridgeEmail(user.email);
  const secondaryEmail = getStringMetadataValue(metadata, "secondary_email");
  const mobilePhone =
    getStringMetadataValue(metadata, "mobile_phone") ??
    getStringMetadataValue(metadata, "phone");
  const isBridgeEmail = isSupabaseUsernameBridgeEmail(user.email);
  const timestamp = user.created_at || new Date().toISOString();
  const profile: UserProfile = {
    id: user.id,
    email: secondaryEmail ?? (isBridgeEmail ? undefined : user.email),
    displayName: username,
    provider: mobilePhone ? "phone" : "email",
    status: "active",
    plan: "personal",
    createdAt: timestamp,
    updatedAt: user.updated_at || timestamp,
  };

  return {
    user: profile,
    isAuthenticated: true,
    source: mobilePhone ? "phone" : "email",
  };
}