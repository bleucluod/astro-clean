import { assertAdminMutationRequest, requireAdminCapability } from '@/lib/admin/admin-auth';
import { adminErrorResponse, noStoreJsonResponse } from '@/lib/admin/admin-http';
import { editShopPrice, readShopPriceCatalog, ShopPriceInputError } from '@/lib/shop/shop-price-store';
import { isShopMvpActive } from '@/lib/shop/shop-mvp-activation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isShopMvpActive()) return noStoreJsonResponse({ ok: false }, 404);
  try {
    const actor = await requireAdminCapability(request, 'shop_orders.read');
    if (actor.role !== 'owner') return noStoreJsonResponse({ ok: false }, 403);
    return noStoreJsonResponse({ ok: true, ...(await readShopPriceCatalog()) });
  } catch (error) { return adminErrorResponse(error); }
}

export async function PATCH(request: Request) {
  if (!isShopMvpActive()) return noStoreJsonResponse({ ok: false }, 404);
  try {
    assertAdminMutationRequest(request);
    const actor = await requireAdminCapability(request, 'shop_orders.write');
    if (actor.role !== 'owner') return noStoreJsonResponse({ ok: false }, 403);
    const text = await request.text();
    if (text.length > 1000) return noStoreJsonResponse({ ok: false, error: 'درخواست بیش از حد طولانی است.' }, 413);
    let body: unknown;
    try { body = JSON.parse(text); }
    catch { return noStoreJsonResponse({ ok: false, error: 'درخواست معتبر نیست.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return noStoreJsonResponse({ ok: false, error: 'درخواست معتبر نیست.' }, 400);
    }
    const row = body as Record<string, unknown>;
    const fields = Object.keys(row);
    if (fields.some(key => !['productId', 'size', 'action', 'priceToman', 'expectedRevision', 'expiresInMinutes'].includes(key))) {
      return noStoreJsonResponse({ ok: false, error: 'فیلد نامعتبر است.' }, 400);
    }
    await editShopPrice({
      actorUserId: actor.userId,
      productId: row.productId, size: row.size, action: row.action,
      expectedRevision: row.expectedRevision, priceToman: row.priceToman,
      expiresInMinutes: row.expiresInMinutes,
    });
    return noStoreJsonResponse({ ok: true, ...(await readShopPriceCatalog()) });
  } catch (error) {
    if (error instanceof ShopPriceInputError) {
      return noStoreJsonResponse({ ok: false, error: error.message }, error.status);
    }
    return adminErrorResponse(error);
  }
}
