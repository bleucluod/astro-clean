import type {
  BillingProviderSlug,
  CheckoutRequest,
  CheckoutResult,
  SubscriptionRecord,
} from "@/types/billing";

export type PaymentDriver = {
  provider: BillingProviderSlug;
  createCheckoutSession(request: CheckoutRequest): Promise<CheckoutResult>;
  getSubscription(userId: string): Promise<SubscriptionRecord | null>;
  cancelSubscription(userId: string): Promise<CheckoutResult>;
};

export function createUnavailableCheckoutResult(): CheckoutResult {
  return {
    ok: false,
    message: "Payments are not enabled yet.",
  };
}
