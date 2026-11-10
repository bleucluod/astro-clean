/**
 * BitPay.ir legacy form-POST protocol boundary (not BitPay.com).
 *
 * REVIEW_ONLY: This client must not be wired into the shop until the operator
 * confirms the current merchant's API contract (especially the rial unit),
 * the private attempt ledger, and the authorized production release gate.
 *
 * Provider endpoints/field names were checked against the BitPay.ir public
 * BitPayPHPSampleCode examples and the Shetabit Multipay integration.
 * The public examples are old. They do NOT authorize live traffic.
 *
 * Never log API keys, callback fields, raw provider responses or card numbers.
 */

export const BITPAY_IR_CONTRACT_STATE = 'awaiting_merchant_documentation' as const;

const SEND_ENDPOINT = 'https://bitpay.ir/payment/gateway-send';
const VERIFY_ENDPOINT = 'https://bitpay.ir/payment/gateway-result-second';
const PAYMENT_PREFIX = 'https://bitpay.ir/payment/gateway-';
const PROVIDER_TIMEOUT_MS = 10_000;

export class BitPayIrProtocolError extends Error {
  constructor(readonly kind: 'invalid_input' | 'network' | 'provider_unavailable' | 'invalid_response') {
    super('BitPay.ir payment operation could not be confirmed.');
    this.name = 'BitPayIrProtocolError';
  }
}

export type BitPayIrCreateRequest = Readonly<{
  apiKey: string;
  amountToman: number;
  returnUrl: string;
  /** Preserve BIGINT decimal IDs as strings: never pass via Number. */
  factorId: string;
}>;

export type BitPayIrCreated = Readonly<{
  providerPaymentId: string;
  redirectUrl: string;
  /** The expected amount, not an independently confirmed payment. */
  amountRial: number;
}>;

export type BitPayIrVerifyRequest = Readonly<{
  apiKey: string;
  providerPaymentId: string;
  transactionId: string;
  expectedAmountToman: number;
  expectedFactorId: string;
}>;

export type BitPayIrVerified =
  | Readonly<{ status: 'paid'; providerReference: string; confirmedAmountToman: number }>
  | Readonly<{ status: 'unconfirmed'; providerReference: null }>;

function positiveDecimal(value: string): boolean {
  return /^[1-9][0-9]{0,63}$/.test(value);
}

function validateApiKey(value: string): string {
  if (typeof value !== 'string' || value.trim() !== value || value.length < 8 || value.length > 512
      || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new BitPayIrProtocolError('invalid_input');
  }
  return value;
}

/** Amounts in the existing Halleus order store are integer TOMAN. */
export function tomanToRial(amountToman: number): number {
  if (!Number.isSafeInteger(amountToman) || amountToman <= 0
      || amountToman > Math.floor(Number.MAX_SAFE_INTEGER / 10)) {
    throw new BitPayIrProtocolError('invalid_input');
  }
  return amountToman * 10;
}

function validateReturnUrl(value: string): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new BitPayIrProtocolError('invalid_input'); }
  // Never send a production payment redirect to a user-supplied host.
  if (url.protocol !== 'https:' || url.origin !== 'https://halleus.ir'
      || url.username || url.password || url.hash) {
    throw new BitPayIrProtocolError('invalid_input');
  }
  return url.toString();
}

async function providerPost(endpoint: string, fields: URLSearchParams, send: typeof fetch): Promise<string> {
  let response: Response;
  try {
    response = await send(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: fields.toString(),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
  } catch { throw new BitPayIrProtocolError('network'); }
  if (!response.ok) throw new BitPayIrProtocolError('provider_unavailable');
  let raw: string;
  try { raw = await response.text(); } catch { throw new BitPayIrProtocolError('network'); }
  if (raw.length > 4096) throw new BitPayIrProtocolError('invalid_response');
  return raw.trim();
}

/** Creates a provider payment identifier only, never acknowledges a payment. */
export async function requestBitPayIrPayment(
  input: BitPayIrCreateRequest,
  send: typeof fetch = fetch,
): Promise<BitPayIrCreated> {
  const api = validateApiKey(input.apiKey);
  if (!positiveDecimal(input.factorId)) throw new BitPayIrProtocolError('invalid_input');
  const amountRial = tomanToRial(input.amountToman);
  const form = new URLSearchParams({
    api,
    amount: String(amountRial),
    redirect: validateReturnUrl(input.returnUrl),
    factorId: input.factorId,
    name: '',
    email: '',
    description: '',
  });
  const providerPaymentId = await providerPost(SEND_ENDPOINT, form, send);
  if (!positiveDecimal(providerPaymentId)) throw new BitPayIrProtocolError('invalid_response');
  return {
    providerPaymentId,
    redirectUrl: PAYMENT_PREFIX + providerPaymentId + '-get',
    amountRial,
  };
}

function decimalField(value: unknown): string | null {
  if (typeof value === 'string' && /^[0-9]+$/.test(value)) return value.replace(/^0+(?=\d)/, '');
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return String(value);
  return null;
}

/**
 * A redirect query is ALWAYS untrusted. Verify with BitPay.ir server-to-server.
 * Even a status=1 response is insufficient if amount/factorId are absent or differ.
 */
export async function verifyBitPayIrPayment(
  input: BitPayIrVerifyRequest,
  send: typeof fetch = fetch,
): Promise<BitPayIrVerified> {
  const api = validateApiKey(input.apiKey);
  if (!positiveDecimal(input.providerPaymentId) || !positiveDecimal(input.transactionId)
      || !positiveDecimal(input.expectedFactorId)) {
    throw new BitPayIrProtocolError('invalid_input');
  }
  const expectedRial = tomanToRial(input.expectedAmountToman);
  const form = new URLSearchParams({
    api,
    id_get: input.providerPaymentId,
    trans_id: input.transactionId,
    json: '1',
  });
  const raw = await providerPost(VERIFY_ENDPOINT, form, send);
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { throw new BitPayIrProtocolError('invalid_response'); }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new BitPayIrProtocolError('invalid_response');
  }
  const record = payload as Record<string, unknown>;
  if (decimalField(record.status) !== '1') return { status: 'unconfirmed', providerReference: null };
  const amount = decimalField(record.amount);
  const factorId = decimalField(record.factorId);
  if (amount !== String(expectedRial) || factorId !== input.expectedFactorId) {
    // Do not make mismatched payments "paid" or auto-retry: reconcile manually.
    throw new BitPayIrProtocolError('invalid_response');
  }
  return {
    status: 'paid',
    providerReference: input.transactionId,
    confirmedAmountToman: input.expectedAmountToman,
  };
}
