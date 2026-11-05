import { parseGuestAccess } from '@/lib/shop/shop-order-contract';
import { getGuestShopOrder } from '@/lib/shop/shop-order-store';
import { readShopRequest, shopClosed, shopErrorResponse, shopJson } from '@/lib/shop/shop-order-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (shopClosed()) return shopJson({ ok: false }, 404);
  try {
    const input = parseGuestAccess(await readShopRequest(request, 2_000));
    const order = await getGuestShopOrder(input);
    return order ? shopJson({ ok: true, order }) : shopJson({ ok: false, error: 'سفارشی با این اطلاعات پیدا نشد.' }, 404);
  } catch (error) { return shopErrorResponse(error); }
}
