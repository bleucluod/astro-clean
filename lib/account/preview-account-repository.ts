import type { AccountRepository } from "@/lib/account/account-storage-contract";
import { createPreviewUserProfile, getPreviewSession } from "@/lib/account/preview-session";
import type { UserProfile } from "@/types/account";

let previewProfile: UserProfile = createPreviewUserProfile();

export const previewAccountRepository: AccountRepository = {
  async getCurrentSession() {
    return {
      ...getPreviewSession(),
      user: previewProfile,
    };
  },

  async getUserProfile(userId: string) {
    if (userId !== previewProfile.id) {
      return null;
    }

    return previewProfile;
  },

  async updateUserProfile(userId, profile) {
    if (userId !== previewProfile.id) {
      return null;
    }

    previewProfile = {
      ...previewProfile,
      ...profile,
      updatedAt: new Date().toISOString(),
    };

    return previewProfile;
  },
};
