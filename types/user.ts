export type PrivacyMode = "public" | "private";

export type UserProfile = {
  displayName: string;
  bio: string;
  privacyMode: PrivacyMode;
};
