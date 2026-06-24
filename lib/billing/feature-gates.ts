import { getPlanEntitlement } from "@/lib/account/entitlements";
import { getBillingPlan } from "@/lib/billing/billing-plans";
import type { PlanSlug } from "@/types/account";
import type { BillingPlanSlug } from "@/types/billing";

export type FeatureGateKey =
  | "save-report"
  | "export-report"
  | "import-report"
  | "database-storage"
  | "private-notes"
  | "advanced-interpretations";

export type FeatureGateResult = {
  allowed: boolean;
  reason?: string;
};

export function canUseFeature(
  plan: PlanSlug | BillingPlanSlug,
  feature: FeatureGateKey,
): FeatureGateResult {
  const entitlement = getPlanEntitlement(plan as PlanSlug);

  switch (feature) {
    case "save-report":
      return { allowed: true };
    case "export-report":
      return {
        allowed: entitlement.canExportReports,
        reason: entitlement.canExportReports ? undefined : "Export is not enabled for this plan.",
      };
    case "import-report":
      return {
        allowed: entitlement.canImportReports,
        reason: entitlement.canImportReports ? undefined : "Import is not enabled for this plan.",
      };
    case "database-storage":
      return {
        allowed: entitlement.canUseDatabaseStorage,
        reason: entitlement.canUseDatabaseStorage
          ? undefined
          : "Database storage is not enabled for preview mode.",
      };
    case "private-notes":
      return {
        allowed: entitlement.canCreatePrivateNotes,
        reason: entitlement.canCreatePrivateNotes ? undefined : "Private notes are not enabled.",
      };
    case "advanced-interpretations":
      return {
        allowed: entitlement.canUseAdvancedInterpretations,
        reason: entitlement.canUseAdvancedInterpretations
          ? undefined
          : "Advanced interpretations are not enabled for preview mode.",
      };
  }
}

export function canUsePlanLimit(
  plan: BillingPlanSlug,
  limitKey: "savedReports" | "exportsPerMonth" | "advancedReports",
  currentCount: number,
): FeatureGateResult {
  const billingPlan = getBillingPlan(plan);
  const limit = billingPlan.limits[limitKey];

  if (limit === "unlimited") {
    return { allowed: true };
  }

  return {
    allowed: currentCount < limit,
    reason:
      currentCount < limit
        ? undefined
        : `Plan limit reached for ${limitKey}.`,
  };
}
