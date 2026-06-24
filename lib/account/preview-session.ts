import { HALLEUS_CONFIG } from "@/lib/config/halleus";
import type { AuthSession, UserProfile } from "@/types/account";

export const PREVIEW_USER_ID = "local-preview-user";

export function createPreviewUserProfile(): UserProfile {
  const timestamp = new Date(0).toISOString();

  return {
    id: PREVIEW_USER_ID,
    provider: "local-preview",
    status: "preview",
    plan: "preview",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function getPreviewSession(): AuthSession {
  return {
    user: createPreviewUserProfile(),
    isAuthenticated: false,
    source: HALLEUS_CONFIG.storageDriver === "local" ? "local-preview" : "email",
  };
}
