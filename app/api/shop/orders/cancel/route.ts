import { parseGuestAccess } from '@/lib/shop/shop-order-contract';
import { cancelGuestShopOrder } from '@/lib/shop/shop-order-store';
import { readShopRequest, shopClosed, shopErrorResponse, shopJson } from '@/lib/shop/shop-order-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (shopClosed()) return shopJson({ ok: false }, 404);
  try {
    const access = parseGuestAccess(await readShopRequest(request, 2_000));
    const result = await cancelGuestShopOrder(access);
    return shopJson({ ok: true, status: result.status });
  } catch (error) { return shopErrorResponse(error); }
}
