import { ShopQuoteError, quoteShopItems } from '@/lib/shop/shop-quote';
import { readShopRequest, shopClosed, shopErrorResponse, shopJson } from '@/lib/shop/shop-order-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // The physical shop is still closed in production. No live payment or order is accepted.
  if (shopClosed()) return shopJson({ ok: false }, 404);
  try {
    const quote = quoteShopItems(await readShopRequest(request, 8_000));
    return shopJson({ ok: true, quote });
  } catch (error) {
    if (error instanceof ShopQuoteError || error instanceof SyntaxError) {
      return shopJson({ ok: false }, 400);
    }
    return shopErrorResponse(error);
  }
}
