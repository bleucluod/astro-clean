/**
 * Disabled-by-default BitPay.ir checkout orchestration.
 * Merchant-specific API contract and migration must be verified before activation.
 * Incoming callback data can only select a previously stored attempt, never attest payment.
 */
import { createHash, createHmac } from 'node:crypto';
import { requestBitPayIrPayment, verifyBitPayIrPayment } from './bitpay-ir-client';
import {
  reserveBitPayAttempt, recordBitPayRedirect, getBitPayReturnAttempt,
  settleVerifiedBitPayAttempt, ShopBitPayAttemptError,
} from './shop-bitpay-attempt-store';

const CALLBACK_ORIGIN = 'https://halleus.ir';
const CALLBACK_PATH = '/api/shop/payments/bitpay/return';

export function bitPayPrivateConfig() {
  const apiKey = process.env.HALLEUS_BITPAY_API_KEY;
  const callbackSecret = process.env.HALLEUS_BITPAY_CALLBACK_SECRET;
  if (!apiKey || !callbackSecret || Buffer.byteLength(callbackSecret, 'utf8') < 32) {
    throw new ShopBitPayAttemptError();
  }
  return { apiKey, callbackSecret };
}

function hexDigest(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function deriveToken(secret: string, label: 'attempt' | 'return', orderNumber: string, accessHash: string): string {
  return createHmac('sha256', secret)
    .update(`halleus-bitpay-v1:${label}:${orderNumber}:${accessHash}`, 'utf8').digest('hex');
}

function validDecimal(value: string): boolean { return /^[1-9][0-9]{0,63}$/.test(value); }

export type StartBitPayInput = Readonly<{ orderNumber: string; accessHash: string }>;

/** Existing order credentials are verified by reserveBitPayAttempt in the database. */
export async function startBitPayPayment(input: StartBitPayInput) {
  const { apiKey, callbackSecret } = bitPayPrivateConfig();
  const proof = deriveToken(callbackSecret, 'return', input.orderNumber, input.accessHash);
  const attempt = await reserveBitPayAttempt({
    orderNumber: input.orderNumber,
    guestAccessHash: input.accessHash,
    idempotencyHash: deriveToken(callbackSecret, 'attempt', input.orderNumber, input.accessHash),
    callbackTokenHash: hexDigest(proof),
  });
  if (!attempt.createdNow) {
    if (attempt.status === 'redirect_ready' && attempt.providerPaymentId && validDecimal(attempt.providerPaymentId)) {
      return { redirectUrl: `https://bitpay.ir/payment/gateway-${attempt.providerPaymentId}-get` };
    }
    // A network failure may have created a payment at the provider without
    // recording its ID. Never create a second charge on an ambiguous retry.
    throw new ShopBitPayAttemptError();
  }
  const returnUrl = new URL(CALLBACK_PATH, CALLBACK_ORIGIN);
  returnUrl.searchParams.set('attempt', attempt.id);
  returnUrl.searchParams.set('proof', proof);
  const payment = await requestBitPayIrPayment({
    apiKey, amountToman: attempt.amountToman,
    factorId: attempt.orderNumber, returnUrl: returnUrl.toString(),
  });
  await recordBitPayRedirect({ attemptId: attempt.id, providerPaymentId: payment.providerPaymentId });
  return { redirectUrl: payment.redirectUrl };
}

function oneParameter(query: URLSearchParams, name: string): string | null {
  const all = query.getAll(name);
  return all.length === 1 ? all[0] : null;
}

export function parseBitPayReturnQuery(requestUrl: string) {
  const url = new URL(requestUrl);
  const attemptId = oneParameter(url.searchParams, 'attempt');
  const proof = oneParameter(url.searchParams, 'proof');
  const providerPaymentId = oneParameter(url.searchParams, 'id_get');
  const transactionId = oneParameter(url.searchParams, 'trans_id');
  if (!attemptId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(attemptId)
      || !proof || !/^[a-f0-9]{64}$/.test(proof)
      || !providerPaymentId || !validDecimal(providerPaymentId)
      || !transactionId || !validDecimal(transactionId)) {
    throw new ShopBitPayAttemptError();
  }
  return { attemptId, proof, providerPaymentId, transactionId };
}

/** Never use callback status or amount to mark a payment paid. */
export async function finishBitPayReturn(requestUrl: string): Promise<'paid' | 'pending'> {
  const callback = parseBitPayReturnQuery(requestUrl);
  const { apiKey } = bitPayPrivateConfig();
  const attempt = await getBitPayReturnAttempt({
    attemptId: callback.attemptId, callbackTokenHash: hexDigest(callback.proof),
  });
  if (!attempt || attempt.providerPaymentId !== callback.providerPaymentId) {
    throw new ShopBitPayAttemptError();
  }
  // An already-settled order is authoritative; do not ask the provider to re-verify
  // and risk treating its expected 'already verified' answer as a failed payment.
  if (attempt.status === 'verified') {
    if (attempt.providerTransactionId !== callback.transactionId) throw new ShopBitPayAttemptError();
    return 'paid';
  }
  const verified = await verifyBitPayIrPayment({
    apiKey, providerPaymentId: attempt.providerPaymentId,
    transactionId: callback.transactionId,
    expectedAmountToman: attempt.amountToman,
    expectedFactorId: attempt.orderNumber,
  });
  if (verified.status !== 'paid') return 'pending';
  await settleVerifiedBitPayAttempt({
    attemptId: attempt.attemptId, orderNumber: attempt.orderNumber,
    providerPaymentId: attempt.providerPaymentId, trustedVerification: verified,
  });
  return 'paid';
}
