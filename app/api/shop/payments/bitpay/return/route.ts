import { SHOP_ONLINE_GATEWAY_ENABLED } from '@/lib/shop/shop-payment-gateway';
import { enforceShopSharedRateLimit } from '@/lib/shop/shop-shared-rate-limit';
import { shopClosed, shopErrorResponse, shopJson } from '@/lib/shop/shop-order-http';
import { finishBitPayReturn } from '@/lib/shop/shop-bitpay-flow';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!SHOP_ONLINE_GATEWAY_ENABLED || shopClosed()) return shopJson({ ok: false }, 404);
  try {
    await enforceShopSharedRateLimit(request);
    const status = await finishBitPayReturn(request.url);
    const url = new URL('/shop/payment', 'https://halleus.ir');
    url.searchParams.set('bitpay', status);
    return new Response(null, { status: 303, headers: {
      Location: url.toString(), 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer',
    } });
  } catch (error) { return shopErrorResponse(error); }
}
