import type { UserProfile } from "@/types/user";

const profileStorageKey = "astro-clean-profile";

export const defaultProfile: UserProfile = {
  displayName: "",
  bio: "",
  privacyMode: "private",
};

export function loadProfile(): UserProfile {
  if (typeof window === "undefined") {
    return defaultProfile;
  }

  try {
    const rawProfile = window.localStorage.getItem(profileStorageKey);

    if (!rawProfile) {
      return defaultProfile;
    }

    return {
      ...defaultProfile,
      ...(JSON.parse(rawProfile) as Partial<UserProfile>),
    };
  } catch {
    return defaultProfile;
  }
}

export function saveProfile(profile: UserProfile): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(profileStorageKey, JSON.stringify(profile));
}
