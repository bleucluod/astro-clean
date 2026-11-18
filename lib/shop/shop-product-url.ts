import type { ShopProductId } from '@/components/shop/product-detail-data';
import { isNemadMonthSlug } from './nemad-man-months';

export const SHOP_PRODUCT_URLS: Record<ShopProductId, string> = {
  p01: '/shop/moon-phase-print',
  p02: '/shop/birth-sky-map',
  p03: '/shop/milky-way-print',
  nm: '/shop/bahman-sign',
};

export function getShopProductUrl(id: ShopProductId, nemadMonth?: string): string {
  if (id === 'nm' && isNemadMonthSlug(nemadMonth)) return '/shop/' + nemadMonth + '-sign';
  return SHOP_PRODUCT_URLS[id];
}
