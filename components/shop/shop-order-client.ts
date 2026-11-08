import type { ShopCartItem } from './shop-cart';
import type { ShippingForm } from './shop-checkout-state';
import type { ShopOrderPublicState } from '@/lib/shop/shop-order-store';
import { isValidShopOrderNumber } from '@/lib/shop/shop-order-number';

const INTENT_KEY = 'halleus.shop.order.intent.v1';
const RECEIPT_KEY = 'halleus.shop.order.receipt.v1';

export type ShopOrderReceipt = { orderNumber: string; accessCode: string };

function randomAccessCode() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function getIntent(items: ShopCartItem[], shipping: ShippingForm) {
  // Store only a one-way comparison digest, never a serialized delivery address.
  const bytes = new TextEncoder().encode(JSON.stringify({ items, shipping }));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const fingerprint = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  try {
    const saved = JSON.parse(sessionStorage.getItem(INTENT_KEY) ?? 'null');
    if (saved && saved.fingerprint === fingerprint && Number.isFinite(saved.savedAt)
        && Date.now() - saved.savedAt < 2 * 60 * 60 * 1000
        && typeof saved.idempotencyKey === 'string' && typeof saved.guestAccessCode === 'string') {
      return { idempotencyKey: saved.idempotencyKey, guestAccessCode: saved.guestAccessCode };
    }
  } catch { /* A new intent can replace a damaged one. */ }
  const intent = { idempotencyKey: crypto.randomUUID(), guestAccessCode: randomAccessCode() };
  try { sessionStorage.setItem(INTENT_KEY, JSON.stringify({ ...intent, fingerprint, savedAt: Date.now() })); }
  catch { throw new Error('امکان نگهداری کد پیگیری در این مرورگر نیست. فضای ذخیره‌سازی را بررسی کن.'); }
  return intent;
}

export function clearLegacyShopOrderIntent() {
  if (typeof window === 'undefined') return;
  try {
    const raw = sessionStorage.getItem(INTENT_KEY);
    if (!raw) return;
    const saved: unknown = JSON.parse(raw);
    if (!saved || typeof saved !== 'object' || !('fingerprint' in saved)
        || typeof saved.fingerprint !== 'string' || !/^[a-f\d]{64}$/.test(saved.fingerprint)) {
      sessionStorage.removeItem(INTENT_KEY);
    }
  } catch { try { sessionStorage.removeItem(INTENT_KEY); } catch { /* Storage unavailable. */ } }
}

async function shopRequest(path: string, body: unknown) {
  let response: Response;
  try {
    response = await fetch(path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      cache: 'no-store', body: JSON.stringify(body),
    });
  } catch { throw new Error('ارتباط برقرار نشد. دوباره تلاش کن.'); }
  const data: unknown = await response.json().catch(() => null);
  if (!data || typeof data !== 'object') throw new Error('پاسخ دریافت نشد. دوباره تلاش کن.');
  const result = data as Record<string, unknown>;
  if (!response.ok || result.ok !== true) {
    throw new Error(typeof result.error === 'string' && result.error.length < 250
      ? result.error : 'درخواست انجام نشد. دوباره تلاش کن.');
  }
  return result;
}

export async function createShopOrderRequest(items: ShopCartItem[], shipping: ShippingForm, expectedTotal: number) {
  const intent = await getIntent(items, shipping);
  const data = await shopRequest('/api/shop/orders', {
    items, shipping, expectedTotal, ...intent,
  });
  if (!isValidShopOrderNumber(data.orderNumber)) {
    throw new Error('شمارهٔ سفارش دریافت نشد. دوباره تلاش کن.');
  }
  const receipt = { orderNumber: data.orderNumber, accessCode: intent.guestAccessCode };
  rememberShopOrderReceipt(receipt);
  return receipt;
}

export function rememberShopOrderReceipt(receipt: ShopOrderReceipt) {
  if (!isValidShopOrderNumber(receipt.orderNumber) || !/^[a-f0-9]{64}$/.test(receipt.accessCode)) {
    throw new Error('شمارهٔ سفارش یا کد پیگیری معتبر نیست.');
  }
  try { sessionStorage.setItem(RECEIPT_KEY, JSON.stringify(receipt)); }
  catch { throw new Error('کد پیگیری ذخیره نشد. فضای ذخیره‌سازی مرورگر را بررسی کن.'); }
}

export function formatShopOrderReceipt(receipt: ShopOrderReceipt) {
  if (!isValidShopOrderNumber(receipt.orderNumber) || !/^[a-f0-9]{64}$/.test(receipt.accessCode)) {
    throw new Error('اطلاعات پیگیری سفارش معتبر نیست.');
  }
  return [
    'هالیوس | اطلاعات خصوصی پیگیری سفارش',
    `شمارهٔ سفارش: ${receipt.orderNumber}`,
    `کد خصوصی پیگیری: ${receipt.accessCode}`,
    'نشانی پیگیری: https://halleus.ir/shop/track',
    'این کد فقط برای صاحب سفارش است؛ فایل را محرمانه نگهداری کن.',
  ].join('\n');
}

export function downloadShopOrderReceipt(receipt: ShopOrderReceipt) {
  const content = formatShopOrderReceipt(receipt);
  const file = new Blob(['\uFEFF', content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = `halleus-order-${receipt.orderNumber}-access.txt`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function readShopOrderReceipt(): ShopOrderReceipt | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = JSON.parse(sessionStorage.getItem(RECEIPT_KEY) ?? 'null');
    if (isValidShopOrderNumber(data?.orderNumber)
        && typeof data.accessCode === 'string' && /^[a-f0-9]{64}$/.test(data.accessCode)) {
      return { orderNumber: data.orderNumber, accessCode: data.accessCode };
    }
  } catch { /* Lost or invalid receipt; require explicit guest access. */ }
  return null;
}

export async function fetchShopOrder(receipt: ShopOrderReceipt): Promise<ShopOrderPublicState> {
  const data = await shopRequest('/api/shop/orders/track', receipt);
  if (!data.order || typeof data.order !== 'object') throw new Error('وضعیت سفارش دریافت نشد.');
  return data.order as ShopOrderPublicState;
}

export async function submitShopTransfer(receipt: ShopOrderReceipt, reference: string, time: string) {
  return shopRequest('/api/shop/orders/transfer', {
    ...receipt, reference, time,
  });
}

export async function cancelShopOrder(receipt: ShopOrderReceipt) {
  return shopRequest('/api/shop/orders/cancel', receipt);
}

/** Read-only tracking on another device. Modifying an order still needs its private receipt. */
export async function fetchShopOrderWithMobile(orderNumber: string, mobile: string): Promise<ShopOrderPublicState> {
  const data = await shopRequest('/api/shop/orders/track/mobile', { orderNumber, mobile });
  if (!data.order || typeof data.order !== 'object') throw new Error('وضعیت سفارش دریافت نشد.');
  return data.order as ShopOrderPublicState;
}
