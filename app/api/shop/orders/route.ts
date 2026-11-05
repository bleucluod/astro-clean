import { parseShopOrderDraft } from '@/lib/shop/shop-order-contract';
import { createShopOrder } from '@/lib/shop/shop-order-store';
import { readShopRequest, shopClosed, shopErrorResponse, shopJson } from '@/lib/shop/shop-order-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (shopClosed()) return shopJson({ ok: false }, 404);
  try {
    const draft = parseShopOrderDraft(await readShopRequest(request));
    const created = await createShopOrder(draft);
    return shopJson({ ok: true, orderNumber: created.orderNumber, status: 'awaiting_transfer' }, created.created ? 201 : 200);
  } catch (error) { return shopErrorResponse(error); }
}
