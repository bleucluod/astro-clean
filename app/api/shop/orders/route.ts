import { parseShopOrderDraft } from '@/lib/shop/shop-order-contract';
import { readShopPriceCatalog } from '@/lib/shop/shop-price-store';
import { createShopOrder } from '@/lib/shop/shop-order-store';
import { readShopRequest, shopClosed, shopErrorResponse, shopJson } from '@/lib/shop/shop-order-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (shopClosed()) return shopJson({ ok: false }, 404);
  try {
    const [body, catalog] = await Promise.all([readShopRequest(request), readShopPriceCatalog()]);
    const draft = parseShopOrderDraft(body, catalog.prices);
    if (draft.items.some(item => item.productId === 'nm')) {
      const { validateBahmanPreview } = await import('@/lib/shop/nemad-man-bahman-preview');
      const { getNemadMonthIndex } = await import('@/lib/shop/nemad-man-months');
      const { ShopOrderInputError } = await import('@/lib/shop/shop-order-contract');
      for (const item of draft.items) {
        if (item.productId !== 'nm') continue;
        const details = item.details;
        const check = validateBahmanPreview(details.names, details.date,
          { time: details.time, cityId: details.cityId });
        const monthIndex = getNemadMonthIndex(details.nemadMonth);
        if (!check.ok || monthIndex < 0 || details.calendar !== 'jalali' ||
            Number(check.value.date.split('/')[1]) !== monthIndex + 1) {
          throw new ShopOrderInputError('نام، تاریخ یا مشخصات نماد من معتبر نیست.');
        }
      }
    }
    const created = await createShopOrder(draft);
    return shopJson({ ok: true, orderNumber: created.orderNumber, status: created.status }, created.created ? 201 : 200);
  } catch (error) { return shopErrorResponse(error); }
}
