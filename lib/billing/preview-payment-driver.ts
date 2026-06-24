import type { PaymentDriver } from "@/lib/billing/payment-driver";
import { createUnavailableCheckoutResult } from "@/lib/billing/payment-driver";

export function createPreviewPaymentDriver(): PaymentDriver {
  return {
    provider: "preview",

    async createCheckoutSession() {
      return createUnavailableCheckoutResult();
    },

    async getSubscription() {
      return null;
    },

    async cancelSubscription() {
      return {
        ok: true,
        message: "No paid subscription exists in preview mode.",
      };
    },
  };
}
