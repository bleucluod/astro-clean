import { getShopProduct, SHOP_SIZES, type ShopProductId } from '@/components/shop/product-detail-data';

type ProofKind = 'explicit-utc-design-only' | 'private-order-svg-proof' | 'private-order-low-res-png';

/**
 * Owner review of the source catalog — NOT a mutable inventory or an approval record.
 * No customer fields, privileged storage paths or activation controls are exposed.
 * The actual checkout/production release guard is independent of this display.
 */
const printEvidence: Record<ShopProductId, {
  proofKind: ProofKind;
  proofDescription: string;
  proofNativePixels: { width: number; height: number } | null;
  pendingDecisions: readonly string[];
}> = {
  p01: {
    proofKind: 'explicit-utc-design-only',
    proofDescription: 'پیش‌نمایش تصویری فاز ماه؛ اتصال تاریخ بدون ساعت و فایل باکیفیت چاپ هنوز تأیید نشده.',
    proofNativePixels: { width: 1024, height: 1536 },
    pendingDecisions: ['D-S1-01', 'D-S1-03', 'D-S1-04', 'D-S1-06'],
  },
  p02: {
    proofKind: 'private-order-svg-proof',
    proofDescription: 'پیش‌نمایش SVG مخصوص سفارش با داده‌های واقعی ستاره؛ طرح، فونت و خروجی آزمایشگاه تأیید نشده.',
    proofNativePixels: null,
    pendingDecisions: ['D-S1-02', 'D-S1-03', 'D-S1-04'],
  },
  p03: {
    proofKind: 'private-order-low-res-png',
    proofDescription: 'پیش‌نمایش PNG مخصوص سفارش؛ تصویر اصلی هنوز وضوح کافی برای چاپ نهایی ندارد.',
    proofNativePixels: { width: 1024, height: 1536 },
    pendingDecisions: ['D-S1-03', 'D-S1-04', 'D-S1-05'],
  },
};

export function getShopCatalogReadiness() {
  const ids: readonly ShopProductId[] = ['p01', 'p02', 'p03'];
  return ids.map((id) => {
    const product = getShopProduct(id);
    const evidence = printEvidence[id];
    return {
      id,
      title: product.title,
      gallery: product.gallery.map(({ src, alt, label }) => ({ src, alt, label })),
      sizes: SHOP_SIZES.map(({ label, dimension, price }) => ({ label, dimension, priceToman: price })),
      ...evidence,
      hasApprovedFinalArtwork: false as const,
      isReadyForProduction: false as const,
    };
  });
}
