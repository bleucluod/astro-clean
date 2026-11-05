import { parseGuestAccess, parseTransferEvidence } from '@/lib/shop/shop-order-contract';
import { declareShopTransfer } from '@/lib/shop/shop-order-store';
import { readShopRequest, shopClosed, shopErrorResponse, shopJson } from '@/lib/shop/shop-order-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (shopClosed()) return shopJson({ ok: false }, 404);
  try {
    const body = await readShopRequest(request, 2_000);
    const access = parseGuestAccess(body);
    const evidence = parseTransferEvidence(body);
    const result = await declareShopTransfer({ ...access, ...evidence });
    return shopJson({ ok: true, status: result.status });
  } catch (error) { return shopErrorResponse(error); }
}
