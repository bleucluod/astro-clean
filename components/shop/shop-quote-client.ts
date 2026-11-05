import type { ShopQuote } from '@/lib/shop/shop-quote';
import type { ShopCartItem } from './shop-cart';
import type { ShopCarrier } from './shop-checkout-state';

export async function fetchShopQuote(items: ShopCartItem[], carrier: ShopCarrier): Promise<ShopQuote> {
  const response = await fetch('/api/shop/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      carrier,
      items: items.map(({ productId, size, quantity }) => ({ productId, size, quantity })),
    }),
  });
  if (!response.ok) throw new Error('امکان محاسبهٔ مبلغ سفارش نیست. دوباره تلاش کن.');
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object' || !('quote' in data) || !data.quote
      || typeof data.quote !== 'object') {
    throw new Error('امکان محاسبهٔ مبلغ سفارش نیست. دوباره تلاش کن.');
  }
  const quote = data.quote as ShopQuote;
  if (quote.carrier !== carrier || quote.unit !== 'toman'
      || ![quote.subtotal, quote.shippingAndPackaging, quote.total, quote.itemCount].every(
        (amount) => Number.isSafeInteger(amount) && amount >= 0,
      ) || quote.total !== quote.subtotal + quote.shippingAndPackaging
      || quote.itemCount !== items.reduce((sum, item) => sum + item.quantity, 0)) {
    throw new Error('مبلغ سفارش قابل تأیید نیست. دوباره تلاش کن.');
  }
  return quote;
}
