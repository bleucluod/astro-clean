export type BillingProviderSlug = "preview" | "stripe" | "zarinpal" | "manual";

export type BillingStage =
  | "preview-only"
  | "pricing-defined"
  | "provider-selected"
  | "staging"
  | "production";

export type BillingInterval = "month" | "year" | "one-time";

export type BillingCurrency = "USD" | "IRR";

export type BillingPlanSlug = "preview" | "personal" | "professional";

export type BillingPlan = {
  slug: BillingPlanSlug;
  name: string;
  description: string;
  currency: BillingCurrency;
  monthlyPrice: number;
  yearlyPrice?: number;
  isPublic: boolean;
  features: string[];
  limits: {
    savedReports: number | "unlimited";
    exportsPerMonth: number | "unlimited";
    advancedReports: number | "unlimited";
  };
};

export type SubscriptionRecord = {
  id: string;
  userId: string;
  plan: BillingPlanSlug;
  provider: BillingProviderSlug;
  status: "none" | "trialing" | "active" | "past_due" | "canceled";
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  createdAt: string;
  updatedAt: string;
};

export type CheckoutRequest = {
  userId: string;
  plan: BillingPlanSlug;
  interval: BillingInterval;
  successUrl: string;
  cancelUrl: string;
};

export type CheckoutResult = {
  ok: boolean;
  message: string;
  checkoutUrl?: string;
};

export type BillingReadinessReport = {
  stage: BillingStage;
  provider: BillingProviderSlug;
  canEnablePayments: boolean;
  blockers: string[];
  recommendedNextSteps: string[];
};
