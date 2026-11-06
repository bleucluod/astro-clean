import { SHOP_SIZES } from '@/components/shop/product-detail-data';
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

// Only the moon product can be purchased in the first release.
const productIds: ReadonlySet<string> = new Set(['p01']);

export function quoteShopItems(value: unknown): ShopQuote {
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
    const size = SHOP_SIZES.find((entry) => entry.dimension === raw.size);
    if (!size) throw new ShopQuoteError();
    const quantity = raw.quantity as number;
    itemCount += quantity;
    subtotal += size.price * quantity;
  }

  const carrier = value.carrier;
  const shippingAndPackaging = SHOP_SHIPPING_AND_PACKAGING[carrier];
  return { carrier, unit: 'toman', itemCount, subtotal, shippingAndPackaging,
    total: subtotal + shippingAndPackaging };
}
