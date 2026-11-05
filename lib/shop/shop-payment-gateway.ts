/**
 * Future provider-neutral online payment boundary for the physical shop.
 *
 * The only launch method is manual bank transfer. This module deliberately has
 * no provider credentials, network calls, callback handler or activation via env.
 * Never turn a browser callback or transfer declaration into payment_verified.
 *
 * A future provider integration must: persist attempts in a private database,
 * bind each attempt to the server-quoted order/amount and an idempotency key,
 * validate trusted callback origin/signature, re-query the provider server-side,
 * compare order/attempt/amount/currency, record immutable audit events, and
 * handle retries before changing any fulfillment status.
 * Provider connection, DB migration and activation require separate approval.
 */

export const SHOP_ONLINE_GATEWAY_ENABLED = false as const;
export const SHOP_ENABLED_PAYMENT_METHODS = Object.freeze(['manual_transfer'] as const);

export type ShopActivePaymentMethod = (typeof SHOP_ENABLED_PAYMENT_METHODS)[number];

export type ShopGatewayCreateInput = Readonly<{
  orderId: string;
  orderNumber: string;
  amountToman: number;
  idempotencyKey: string;
  returnUrl: string;
}>;

export type ShopGatewayCreatedPayment = Readonly<{
  attemptId: string;
  providerPaymentId: string;
  redirectUrl: string;
}>;

export type ShopGatewayVerifyInput = Readonly<{
  orderId: string;
  attemptId: string;
  providerPaymentId: string;
  expectedAmountToman: number;
}>;

export type ShopGatewayVerification =
  | Readonly<{ status: 'paid'; providerReference: string; confirmedAmountToman: number }>
  | Readonly<{ status: 'pending' | 'failed'; providerReference: null }>;

export interface ShopOnlineGatewayAdapter {
  readonly providerCode: string;
  createPayment(input: ShopGatewayCreateInput): Promise<ShopGatewayCreatedPayment>;
  /**
   * Must re-query the provider through trusted server-to-server authentication.
   * Callback query/body fields are untrusted and cannot serve as confirmation.
   */
  verifyPaymentWithProvider(input: ShopGatewayVerifyInput): Promise<ShopGatewayVerification>;
}

/**
 * Older checkout clients omit paymentMethod. Explicit requests for the future
 * online gateway (or unknown methods) must never silently become a bank transfer.
 */
export function isShopManualPaymentSelection(
  value: unknown,
): value is 'manual_transfer' | undefined {
  return value === undefined || value === 'manual_transfer';
}
