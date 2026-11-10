import { getShopProductPrice } from '@/components/shop/product-detail-data';
import { assertShopPriceMap, shopPriceKey, type ShopPriceMap } from './shop-price-store';
import { isShopP02OrderEnabled } from './shop-mvp-activation';
import { SHOP_SHIPPING_AND_PACKAGING, type ShopCarrier } from '@/components/shop/shop-checkout-state';

export type ShopQuote = {
  carrier: ShopCarrier;
  unit: 'toman';
  itemCount: number;
  subtotal: number;
  shippingAndPackaging: number;
  total: number;
};

export class ShopQuoteError extends Error {
  constructor() { super('Invalid shop quote request.'); }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// The third product remains postponed. P02 requires a separate production gate.
const productIds: ReadonlySet<string> = new Set(['p01', 'p02']);

export function quoteShopItems(value: unknown, prices: ShopPriceMap): ShopQuote {
  assertShopPriceMap(prices);
  if (!isRecord(value) || (value.carrier !== 'post' && value.carrier !== 'tipax')
      || !Array.isArray(value.items) || value.items.length < 1 || value.items.length > 20) {
    throw new ShopQuoteError();
  }

  let itemCount = 0;
  let subtotal = 0;
  for (const raw of value.items) {
    if (!isRecord(raw) || typeof raw.productId !== 'string' || !productIds.has(raw.productId)
        || typeof raw.size !== 'string' || !Number.isInteger(raw.quantity)
        || (raw.quantity as number) < 1 || (raw.quantity as number) > 10) {
      throw new ShopQuoteError();
    }
    if (raw.productId === 'p02' && !isShopP02OrderEnabled()) throw new ShopQuoteError();
    const price = getShopProductPrice(raw.productId, raw.size) === null ? null
      : prices[shopPriceKey(raw.productId, raw.size)];
    if (price === null || !Number.isSafeInteger(price) || price < 1000 || price > 10_000_000) throw new ShopQuoteError();
    const quantity = raw.quantity as number;
    itemCount += quantity;
    subtotal += price * quantity;
  }

  const carrier = value.carrier;
  const shippingAndPackaging = SHOP_SHIPPING_AND_PACKAGING[carrier];
  return { carrier, unit: 'toman', itemCount, subtotal, shippingAndPackaging,
    total: subtotal + shippingAndPackaging };
}
