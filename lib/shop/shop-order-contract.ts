import { createHash } from 'node:crypto';
import { isValidShopOrderNumber } from './shop-order-number';
import { parseShopCart, type ShopCartItem } from '@/components/shop/shop-cart';
import {
  englishDigits, normalizeMobileTail, validateShipping, type ShippingForm,
} from '@/components/shop/shop-checkout-state';
import { quoteShopItems, type ShopQuote } from './shop-quote';
import { isShopManualPaymentSelection } from './shop-payment-gateway';

export class ShopOrderInputError extends Error {
  constructor(message = 'اطلاعات سفارش کامل یا معتبر نیست.') { super(message); }
}

export type ShopOrderDraft = {
  items: ShopCartItem[];
  shipping: ShippingForm;
  quote: ShopQuote;
  idempotencyHash: string;
  guestAccessHash: string;
  payloadHash: string;
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

export function hashSecret(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function parseShopOrderDraft(value: unknown): ShopOrderDraft {
  const body = record(value);
  if (!body || !Array.isArray(body.items) || !body.items.length || body.items.length > 20) {
    throw new ShopOrderInputError();
  }
  if (!isShopManualPaymentSelection(body.paymentMethod)) {
    throw new ShopOrderInputError('روش پرداخت انتخاب‌شده فعلاً فعال نیست.');
  }
  const items = parseShopCart(body.items);
  if (items.length !== body.items.length) throw new ShopOrderInputError('یک مورد از سبد خرید معتبر نیست.');

  const rawShipping = record(body.shipping);
  if (!rawShipping) throw new ShopOrderInputError();
  const fields = ['name', 'mobile', 'province', 'city', 'postalCode', 'address', 'note'] as const;
  for (const key of fields) {
    if (typeof rawShipping[key] !== 'string') throw new ShopOrderInputError();
  }
  if (!/^9\d{9}$/.test(englishDigits(rawShipping.mobile as string))) {
    throw new ShopOrderInputError('شمارهٔ موبایل را دوباره بررسی کن.');
  }
  if (rawShipping.carrier !== 'post' && rawShipping.carrier !== 'tipax') throw new ShopOrderInputError();
  const shipping: ShippingForm = {
    name: (rawShipping.name as string).trim(),
    mobile: normalizeMobileTail(rawShipping.mobile as string),
    province: (rawShipping.province as string).trim(),
    city: (rawShipping.city as string).trim(),
    postalCode: englishDigits(rawShipping.postalCode as string).trim(),
    address: (rawShipping.address as string).trim(),
    note: (rawShipping.note as string).trim(),
    carrier: rawShipping.carrier,
  };
  if (shipping.name.length > 100 || shipping.province.length > 60 || shipping.city.length > 70
      || shipping.address.length > 400 || shipping.note.length > 200 || validateShipping(shipping)) {
    throw new ShopOrderInputError('شمارهٔ موبایل یا نشانی تحویل را بررسی کن.');
  }

  const idempotencyKey = body.idempotencyKey;
  const guestAccessCode = body.guestAccessCode;
  if (typeof idempotencyKey !== 'string'
      || !/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(idempotencyKey)
      || typeof guestAccessCode !== 'string' || !/^[a-f0-9]{64}$/.test(guestAccessCode)) {
    throw new ShopOrderInputError();
  }

  const quote = quoteShopItems({
    carrier: shipping.carrier,
    items: items.map((item) => ({ productId: item.productId, size: item.size, quantity: item.quantity })),
  });
  if (!Number.isSafeInteger(body.expectedTotal) || body.expectedTotal !== quote.total) {
    throw new ShopOrderInputError('مبلغ سفارش تغییر کرده؛ لطفاً دوباره آن را بررسی کن.');
  }
  return {
    items, shipping, quote,
    idempotencyHash: hashSecret(idempotencyKey),
    guestAccessHash: hashSecret(guestAccessCode),
    payloadHash: hashSecret(JSON.stringify({ items, shipping, quote })),
  };
}

export function parseTransferEvidence(value: unknown) {
  const body = record(value);
  if (!body) throw new ShopOrderInputError();
  const reference = typeof body.reference === 'string'
    ? englishDigits(body.reference).trim() : '';
  const time = typeof body.time === 'string' ? body.time.trim() : '';
  if ((!reference && !time) || reference.length > 50 || !/^\d*$/.test(reference)
      || (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) {
    throw new ShopOrderInputError('شمارهٔ پیگیری یا زمان درست تراکنش را وارد کن.');
  }
  return { reference: reference || null, time: time || null };
}

export function parseGuestAccess(value: unknown) {
  const body = record(value);
  const number = typeof body?.orderNumber === 'string' ? englishDigits(body.orderNumber).trim() : '';
  const code = body?.accessCode;
  if (!isValidShopOrderNumber(number) || typeof code !== 'string' || !/^[a-f\d]{64}$/.test(code)) {
    throw new ShopOrderInputError('شمارهٔ سفارش یا کد دسترسی معتبر نیست.');
  }
  return { orderNumber: number, accessHash: hashSecret(code) };
}

/** Full registered mobile unlocks read-only tracking on a different device. */
export function parseGuestMobileLookup(value: unknown) {
  const body = record(value);
  if (!body || Object.keys(body).sort().join(',') !== 'mobile,orderNumber') {
    throw new ShopOrderInputError('شمارهٔ سفارش و موبایل ثبت‌شده را وارد کن.');
  }
  const orderNumber = typeof body.orderNumber === 'string' ? englishDigits(body.orderNumber).trim().replace(/^#/, '') : '';
  const rawMobile = typeof body.mobile === 'string' ? englishDigits(body.mobile).trim() : '';
  const mobileDigits = rawMobile.replace(/^\+/, '');
  if (!isValidShopOrderNumber(orderNumber) || !/^(?:0098|98|0)?9\d{9}$/.test(mobileDigits)) {
    throw new ShopOrderInputError('شمارهٔ سفارش یا موبایل معتبر نیست.');
  }
  const mobile = normalizeMobileTail(rawMobile);
  if (!/^9\d{9}$/.test(mobile)) throw new ShopOrderInputError('موبایل ثبت‌شده معتبر نیست.');
  return { orderNumber, recipientMobile: '+98' + mobile };
}
