/**
 * Private BitPay.ir attempt ledger; NOT connected to checkout or a callback.
 * The live merchant API contract and the migration must be reviewed before use.
 * Never treat incoming callback values or a manual transfer declaration as paid.
 * Each DB transaction locks the order before its attempt to avoid lock inversion.
 */
import { getAdminDatabase } from '@/lib/admin/admin-database';
import type { BitPayIrVerified } from './bitpay-ir-client';

export class ShopBitPayAttemptError extends Error {
  constructor() { super('این پرداخت در وضعیت قابل‌بررسی نیست.'); }
}

export type ShopBitPayAttempt = Readonly<{
  id: string;
  orderNumber: string;
  amountToman: number;
  status: 'created' | 'redirect_ready' | 'verify_pending' | 'verified' | 'failed' | 'review_required';
  providerPaymentId: string | null;
  createdNow: boolean;
}>;

function digest(value: string): boolean { return /^[a-f0-9]{64}$/.test(value); }
function decimal(value: string): boolean { return /^[1-9][0-9]{0,63}$/.test(value); }
function orderNumber(value: string): boolean { return /^[1-9][0-9]{0,18}$/.test(value); }

/** A duplicate request reuses the same attempt; a different concurrent attempt is rejected. */
export async function reserveBitPayAttempt(input: {
  orderNumber: string;
  guestAccessHash: string;
  idempotencyHash: string;
  callbackTokenHash: string;
}): Promise<ShopBitPayAttempt> {
  if (!orderNumber(input.orderNumber) || !digest(input.guestAccessHash)
      || !digest(input.idempotencyHash) || !digest(input.callbackTokenHash)) {
    throw new ShopBitPayAttemptError();
  }
  const sql = getAdminDatabase();
  return sql.begin(async (tx) => {
    const orders = await tx`
      select id, display_number, status, total_toman
      from halleus_private.shop_orders
      where display_number = ${input.orderNumber}::bigint
        and guest_access_hash = ${input.guestAccessHash}
      for update
    `;
    if (orders.length !== 1 || !['awaiting_transfer', 'payment_rejected'].includes(orders[0].status)) {
      throw new ShopBitPayAttemptError();
    }
    const order = orders[0];
    const existing = await tx`
      select id, status, idempotency_hash, callback_token_hash, amount_toman, provider_payment_id
      from halleus_private.shop_payment_attempts
      where order_id = ${order.id}::uuid
        and status in ('created', 'redirect_ready', 'verify_pending', 'review_required', 'verified')
      for update
    `;
    if (existing.length) {
      const old = existing[0];
      if (old.idempotency_hash !== input.idempotencyHash || old.callback_token_hash !== input.callbackTokenHash
          || Number(old.amount_toman) !== Number(order.total_toman) || old.status === 'verified') {
        throw new ShopBitPayAttemptError();
      }
      return {
        id: String(old.id), orderNumber: String(order.display_number),
        amountToman: Number(old.amount_toman), status: old.status,
        providerPaymentId: old.provider_payment_id ?? null, createdNow: false,
      };
    }
    const inserted = await tx`
      insert into halleus_private.shop_payment_attempts (
        order_id, idempotency_hash, callback_token_hash,
        factor_id, amount_toman, amount_rial
      ) values (
        ${order.id}::uuid, ${input.idempotencyHash}, ${input.callbackTokenHash},
        ${input.orderNumber}, ${order.total_toman}, ${order.total_toman}::bigint * 10
      ) returning id, status
    `;
    return {
      id: String(inserted[0].id), orderNumber: String(order.display_number),
      amountToman: Number(order.total_toman), status: 'created' as const,
      providerPaymentId: null, createdNow: true,
    };
  });
}

/** Persist the returned provider ID before exposing a redirect to the customer. */
export async function recordBitPayRedirect(input: {
  attemptId: string;
  providerPaymentId: string;
}): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(input.attemptId) || !decimal(input.providerPaymentId)) {
    throw new ShopBitPayAttemptError();
  }
  const sql = getAdminDatabase();
  await sql.begin(async (tx) => {
    const lookup = await tx`
      select order_id from halleus_private.shop_payment_attempts
      where id = ${input.attemptId}::uuid
    `;
    if (lookup.length !== 1) throw new ShopBitPayAttemptError();
    const orders = await tx`
      select status from halleus_private.shop_orders
      where id = ${lookup[0].order_id}::uuid for update
    `;
    if (orders.length !== 1 || !['awaiting_transfer', 'payment_rejected'].includes(orders[0].status)) {
      throw new ShopBitPayAttemptError();
    }
    const attempts = await tx`
      select status, provider_payment_id from halleus_private.shop_payment_attempts
      where id = ${input.attemptId}::uuid for update
    `;
    if (attempts.length !== 1) throw new ShopBitPayAttemptError();
    const attempt = attempts[0];
    if (attempt.status === 'redirect_ready' && attempt.provider_payment_id === input.providerPaymentId) return;
    if (attempt.status !== 'created' || attempt.provider_payment_id !== null) throw new ShopBitPayAttemptError();
    await tx`
      update halleus_private.shop_payment_attempts
      set status = 'redirect_ready', provider_payment_id = ${input.providerPaymentId}, updated_at = now()
      where id = ${input.attemptId}::uuid
    `;
  });
}

/**
 * Atomic exactly-once settlement. Only call with the result of a *fresh*
 * authenticated server-to-server provider verification; NEVER raw callback data.
 * This function cannot independently authenticate its caller. Do not expose it
 * via an API route before the merchant contract and callback guard are approved.
 */
export async function settleVerifiedBitPayAttempt(input: {
  attemptId: string;
  orderNumber: string;
  providerPaymentId: string;
  trustedVerification: BitPayIrVerified;
}): Promise<'verified' | 'already_verified'> {
  const verified = input.trustedVerification;
  if (!/^[0-9a-f-]{36}$/i.test(input.attemptId) || !orderNumber(input.orderNumber)
      || !decimal(input.providerPaymentId) || verified.status !== 'paid'
      || !decimal(verified.providerReference)
      || !Number.isSafeInteger(verified.confirmedAmountToman)
      || verified.confirmedAmountToman <= 0) {
    throw new ShopBitPayAttemptError();
  }
  const sql = getAdminDatabase();
  return sql.begin(async (tx) => {
    const orders = await tx`
      select id, display_number, status, total_toman
      from halleus_private.shop_orders
      where display_number = ${input.orderNumber}::bigint for update
    `;
    if (orders.length !== 1) throw new ShopBitPayAttemptError();
    const order = orders[0];
    const attempts = await tx`
      select id, status, factor_id, amount_toman, provider_payment_id, provider_transaction_id
      from halleus_private.shop_payment_attempts
      where id = ${input.attemptId}::uuid and order_id = ${order.id}::uuid
      for update
    `;
    if (attempts.length !== 1) throw new ShopBitPayAttemptError();
    const attempt = attempts[0];
    if (String(attempt.factor_id) !== input.orderNumber
        || Number(attempt.amount_toman) !== Number(order.total_toman)
        || Number(order.total_toman) !== verified.confirmedAmountToman
        || attempt.provider_payment_id !== input.providerPaymentId) {
      throw new ShopBitPayAttemptError();
    }
    if (attempt.status === 'verified') {
      if (attempt.provider_transaction_id !== verified.providerReference
          || !['payment_verified', 'preparing', 'shipped', 'delivered'].includes(order.status)) {
        throw new ShopBitPayAttemptError();
      }
      return 'already_verified' as const;
    }
    if (!['redirect_ready', 'verify_pending'].includes(attempt.status)
        || !['awaiting_transfer', 'payment_rejected'].includes(order.status)
        || attempt.provider_transaction_id !== null) {
      throw new ShopBitPayAttemptError();
    }
    await tx`
      update halleus_private.shop_payment_attempts
      set status = 'verified', provider_transaction_id = ${verified.providerReference},
          verified_at = now(), updated_at = now()
      where id = ${attempt.id}::uuid
    `;
    await tx`
      update halleus_private.shop_orders
      set status = 'payment_verified', payment_verified_at = now(),
          updated_at = now(), version = version + 1
      where id = ${order.id}::uuid
    `;
    await tx`
      insert into halleus_private.shop_order_events (order_id, action, before_status, after_status)
      values (${order.id}::uuid, 'bitpay.payment.verified', ${order.status}, 'payment_verified')
    `;
    return 'verified' as const;
  });
}

/** Resolve callback proof to a persisted attempt without trusting provider query fields. */
export async function getBitPayReturnAttempt(input: {
  attemptId: string;
  callbackTokenHash: string;
}): Promise<Readonly<{
  attemptId: string;
  orderNumber: string;
  amountToman: number;
  providerPaymentId: string;
  status: 'redirect_ready' | 'verify_pending' | 'verified';
}> | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.attemptId)
      || !digest(input.callbackTokenHash)) return null;
  const sql = getAdminDatabase();
  const rows = await sql`
    select attempt.id, orders.display_number, attempt.amount_toman, attempt.provider_payment_id, attempt.status
    from halleus_private.shop_payment_attempts as attempt
    join halleus_private.shop_orders as orders on orders.id = attempt.order_id
    where attempt.id = ${input.attemptId}::uuid
      and attempt.callback_token_hash = ${input.callbackTokenHash}
      and attempt.status in ('redirect_ready', 'verify_pending', 'verified')
    limit 1
  `;
  if (rows.length !== 1 || !decimal(String(rows[0].provider_payment_id))) return null;
  return {
    attemptId: String(rows[0].id),
    orderNumber: String(rows[0].display_number),
    amountToman: Number(rows[0].amount_toman),
    providerPaymentId: String(rows[0].provider_payment_id),
    status: rows[0].status as 'redirect_ready' | 'verify_pending' | 'verified',
  };
}
