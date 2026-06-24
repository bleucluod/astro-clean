import type { PlanEntitlement, PlanSlug } from "@/types/account";

export const PLAN_ENTITLEMENTS = {
  preview: {
    plan: "preview",
    maxSavedReports: 50,
    canExportReports: true,
    canImportReports: true,
    canUseDatabaseStorage: false,
    canCreatePrivateNotes: true,
    canUseAdvancedInterpretations: false,
  },
  personal: {
    plan: "personal",
    maxSavedReports: "unlimited",
    canExportReports: true,
    canImportReports: true,
    canUseDatabaseStorage: true,
    canCreatePrivateNotes: true,
    canUseAdvancedInterpretations: true,
  },
  professional: {
    plan: "professional",
    maxSavedReports: "unlimited",
    canExportReports: true,
    canImportReports: true,
    canUseDatabaseStorage: true,
    canCreatePrivateNotes: true,
    canUseAdvancedInterpretations: true,
  },
} as const satisfies Record<PlanSlug, PlanEntitlement>;

export function getPlanEntitlement(plan: PlanSlug): PlanEntitlement {
  return PLAN_ENTITLEMENTS[plan];
}

export function canCreateMoreReports(plan: PlanSlug, savedReportCount: number) {
  const entitlement = getPlanEntitlement(plan);

  if (entitlement.maxSavedReports === "unlimited") {
    return true;
  }

  return savedReportCount < entitlement.maxSavedReports;
}
