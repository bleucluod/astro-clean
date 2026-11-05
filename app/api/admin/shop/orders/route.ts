import { requireAdminCapability } from '@/lib/admin/admin-auth';
import { adminErrorResponse, noStoreJsonResponse } from '@/lib/admin/admin-http';
import { listAdminShopOrders } from '@/lib/shop/shop-order-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') return noStoreJsonResponse({ ok: false }, 404);
  try {
    const actor = await requireAdminCapability(request, 'shop_orders.read');
    if (actor.role !== 'owner') return noStoreJsonResponse({ ok: false }, 403);
    const query = new URL(request.url).searchParams;
    const page = Number(query.get('page') ?? 1);
    if (!Number.isInteger(page) || page < 1 || page > 10000) {
      return noStoreJsonResponse({ ok: false, error: 'شماره صفحه معتبر نیست.' }, 400);
    }
    const status = (query.get('status') ?? '').trim();
    const search = (query.get('search') ?? '').trim();
    if (status.length > 40 || search.length > 64) {
      return noStoreJsonResponse({ ok: false, error: 'عبارت جست‌وجو بیش از حد طولانی است.' }, 400);
    }
    return noStoreJsonResponse({ ok: true, ...await listAdminShopOrders({ page, status, search }) });
  } catch (error) { return adminErrorResponse(error); }
}
