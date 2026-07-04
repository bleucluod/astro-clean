import type { Session } from "@supabase/supabase-js";
import type { AuthSession, UserProfile } from "@/types/account";

export function mapSupabaseSessionToHalleusSession(
  session: Session | null,
): AuthSession | null {
  const user = session?.user;

  if (!user) {
    return null;
  }

  const timestamp = user.created_at || new Date().toISOString();
  const profile: UserProfile = {
    id: user.id,
    email: user.email,
    provider: "email",
    status: "active",
    plan: "personal",
    createdAt: timestamp,
    updatedAt: user.updated_at || timestamp,
  };

  return {
    user: profile,
    isAuthenticated: true,
    source: "email",
  };
}
