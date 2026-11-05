import { SHOP_SIZES, type ShopProductId } from './product-detail-data';

export type ShopPersonalization = {
  calendar: 'jalali' | 'gregorian';
  date: string;
  time: string;
  city: string;
  names: string;
  message: string;
};

export type ShopSize = (typeof SHOP_SIZES)[number]['dimension'];

export type ShopCartItem = {
  key: string;
  productId: ShopProductId;
  size: ShopSize;
  details: ShopPersonalization;
  quantity: number;
};

export const SHOP_CART_STORAGE_KEY = 'halleus.shop.cart.v1';
export const SHOP_CART_CHANGED_EVENT = 'halleus:shop-cart-changed';
const MAX_LINES = 20;
const MAX_QUANTITY = 10;

const validProductIds: ShopProductId[] = ['p01', 'p02', 'p03'];
const detailLimits: Record<keyof ShopPersonalization, number> = {
  calendar: 9, date: 20, time: 10, city: 100, names: 60, message: 60,
};

export function parseShopCart(value: unknown): ShopCartItem[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const items: ShopCartItem[] = [];
  for (const entry of value.slice(0, MAX_LINES)) {
    if (!entry || typeof entry !== 'object') continue;
    const item = entry as Record<string, unknown>;
    if (typeof item.key !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(item.key) || seen.has(item.key)) continue;
    if (!validProductIds.includes(item.productId as ShopProductId)) continue;
    if (!SHOP_SIZES.some((size) => size.dimension === item.size)) continue;
    if (!Number.isInteger(item.quantity) || Number(item.quantity) < 1 || Number(item.quantity) > MAX_QUANTITY) continue;
    if (!item.details || typeof item.details !== 'object') continue;
    const details = item.details as Record<string, unknown>;
    if (details.calendar !== 'jalali' && details.calendar !== 'gregorian') continue;
    if ((['date', 'time', 'city', 'names', 'message'] as const).some(
      (field) => typeof details[field] !== 'string' || (details[field] as string).length > detailLimits[field],
    )) continue;
    if (item.productId !== 'p03' && !(details.date as string).trim()) continue;
    if (item.productId === 'p02' && (!(details.time as string).trim() || !(details.city as string).trim())) continue;
    seen.add(item.key);
    items.push({
      key: item.key, productId: item.productId as ShopProductId, size: item.size as ShopSize,
      quantity: item.quantity as number,
      details: {
        calendar: details.calendar, date: details.date as string, time: details.time as string,
        city: details.city as string, names: details.names as string, message: details.message as string,
      },
    });
  }
  return items;
}

export function getShopSize(size: ShopSize) {
  return SHOP_SIZES.find((option) => option.dimension === size) ?? SHOP_SIZES[0];
}

export function shopCartSubtotal(items: ShopCartItem[]) {
  return items.reduce((sum, item) => sum + getShopSize(item.size).price * item.quantity, 0);
}

export function readShopCart(): ShopCartItem[] {
  if (typeof window === 'undefined') return [];
  try { return parseShopCart(JSON.parse(window.localStorage.getItem(SHOP_CART_STORAGE_KEY) ?? '[]')); }
  catch { return []; }
}

export function writeShopCart(items: ShopCartItem[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(SHOP_CART_STORAGE_KEY, JSON.stringify(parseShopCart(items)));
    window.dispatchEvent(new Event(SHOP_CART_CHANGED_EVENT));
    return true;
  } catch { return false; }
}

export function addShopCartItem(
  productId: ShopProductId, size: ShopSize, details: ShopPersonalization, editingKey?: string,
): boolean {
  const items = readShopCart();
  const existing = editingKey ? items.findIndex((item) => item.key === editingKey && item.productId === productId) : -1;
  if (editingKey && existing < 0) return false;
  const next: ShopCartItem = {
    key: existing >= 0 ? items[existing].key : crypto.randomUUID(),
    productId, size, details, quantity: existing >= 0 ? items[existing].quantity : 1,
  };
  if (existing >= 0) items[existing] = next;
  else if (items.length < MAX_LINES) items.push(next);
  else return false;
  return writeShopCart(items);
}
