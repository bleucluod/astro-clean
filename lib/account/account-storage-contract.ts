import type { AuthSession, UserProfile } from "@/types/account";

export type AccountRepository = {
  getCurrentSession(): Promise<AuthSession>;
  getUserProfile(userId: string): Promise<UserProfile | null>;
  updateUserProfile(
    userId: string,
    profile: Partial<Pick<UserProfile, "displayName" | "email">>,
  ): Promise<UserProfile | null>;
};

export type AccountDatabaseRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  provider: string;
  status: string;
  plan: string;
  created_at: string;
  updated_at: string;
};
