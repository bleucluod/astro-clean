import type { ShopProductId } from '@/components/shop/product-detail-data';

export const SHOP_PRODUCT_URLS: Record<ShopProductId, string> = {
  p01: '/shop/moon-phase-print',
  p02: '/shop/birth-sky-map',
  p03: '/shop/milky-way-print',
};

export function getShopProductUrl(id: ShopProductId): string {
  return SHOP_PRODUCT_URLS[id];
}
