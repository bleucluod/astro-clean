import { readShopPriceCatalog } from '@/lib/shop/shop-price-store';
import { shopClosed, shopErrorResponse, shopJson } from '@/lib/shop/shop-order-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Public prices are always read from the same private ledger as server quotes. */
export async function GET() {
  if (shopClosed()) return shopJson({ ok: false }, 404);
  try {
    const catalog = await readShopPriceCatalog();
    return shopJson({ ok: true, prices: catalog.prices });
  } catch (error) { return shopErrorResponse(error); }
}
