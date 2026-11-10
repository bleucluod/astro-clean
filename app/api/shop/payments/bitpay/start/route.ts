import { SHOP_ONLINE_GATEWAY_ENABLED } from '@/lib/shop/shop-payment-gateway';
import { parseGuestAccess } from '@/lib/shop/shop-order-contract';
import { readShopRequest, shopClosed, shopErrorResponse, shopJson } from '@/lib/shop/shop-order-http';
import { startBitPayPayment } from '@/lib/shop/shop-bitpay-flow';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Never bypass this fail-closed switch for a localhost or VPS release.
  if (!SHOP_ONLINE_GATEWAY_ENABLED || shopClosed()) return shopJson({ ok: false }, 404);
  try {
    const access = parseGuestAccess(await readShopRequest(request, 2_000));
    const payment = await startBitPayPayment({ orderNumber: access.orderNumber, accessHash: access.accessHash });
    return shopJson({ ok: true, redirectUrl: payment.redirectUrl });
  } catch (error) { return shopErrorResponse(error); }
}
