import { hasAuthConfig, hasDatabaseConfig } from "@/lib/config/env";
import type { BillingReadinessReport } from "@/types/billing";

export function getBillingReadinessReport(): BillingReadinessReport {
  const blockers: string[] = [];
  const recommendedNextSteps: string[] = [];

  if (!hasDatabaseConfig()) {
    blockers.push("Database is not configured.");
    recommendedNextSteps.push("Configure and test the database driver first.");
  }

  if (!hasAuthConfig()) {
    blockers.push("Auth is not configured.");
    recommendedNextSteps.push("Enable real auth before enabling payments.");
  }

  blockers.push("Payment provider is not selected.");
  recommendedNextSteps.push("Choose Stripe, Zarinpal, or manual billing for the first paid test.");
  recommendedNextSteps.push("Add webhook verification before production payments.");
  recommendedNextSteps.push("Keep preview plan free until real chart quality is validated.");

  return {
    stage: "pricing-defined",
    provider: "preview",
    canEnablePayments: false,
    blockers,
    recommendedNextSteps,
  };
}
