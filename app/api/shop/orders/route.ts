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
    const created = await createShopOrder(draft);
    return shopJson({ ok: true, orderNumber: created.orderNumber, status: created.status }, created.created ? 201 : 200);
  } catch (error) { return shopErrorResponse(error); }
}
