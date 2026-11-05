import { assertAdminMutationRequest, requireAdminCapability } from '@/lib/admin/admin-auth';
import { adminErrorResponse, noStoreJsonResponse } from '@/lib/admin/admin-http';
import {
  applyAdminShopAction, getAdminShopOrder, ShopOrderStateError,
  type AdminShopAction,
} from '@/lib/shop/shop-order-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const actions: AdminShopAction[] = [
  'verify_payment', 'reject_payment', 'start_preparation', 'mark_shipped',
  'mark_delivered', 'cancel', 'resume_cancel',
];

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV === 'production') return noStoreJsonResponse({ ok: false }, 404);
  try {
    const actor = await requireAdminCapability(request, 'shop_orders.read');
    if (actor.role !== 'owner') return noStoreJsonResponse({ ok: false }, 403);
    const { id } = await context.params;
    if (!uuidPattern.test(id)) return noStoreJsonResponse({ ok: false }, 400);
    const order = await getAdminShopOrder(id);
    return order ? noStoreJsonResponse({ ok: true, order }) : noStoreJsonResponse({ ok: false }, 404);
  } catch (error) { return adminErrorResponse(error); }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV === 'production') return noStoreJsonResponse({ ok: false }, 404);
  try {
    assertAdminMutationRequest(request);
    const actor = await requireAdminCapability(request, 'shop_orders.write');
    if (actor.role !== 'owner') return noStoreJsonResponse({ ok: false }, 403);
    const { id } = await context.params;
    if (!uuidPattern.test(id)) return noStoreJsonResponse({ ok: false }, 400);
    const body = await request.text();
    if (Buffer.byteLength(body, 'utf8') > 2_000) return noStoreJsonResponse({ ok: false }, 413);
    const parsed = JSON.parse(body) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)
        || !actions.includes(parsed.action as AdminShopAction)
        || !Number.isInteger(parsed.version) || Number(parsed.version) < 1
        || typeof parsed.reason !== 'string' || !parsed.reason.trim() || parsed.reason.length > 500
        || (parsed.trackingCode !== undefined && (typeof parsed.trackingCode !== 'string' || parsed.trackingCode.length > 100))) {
      return noStoreJsonResponse({ ok: false, error: 'اطلاعات تغییر وضعیت کامل نیست.' }, 400);
    }
    const result = await applyAdminShopAction({
      id, actor, action: parsed.action as AdminShopAction, version: Number(parsed.version),
      reason: parsed.reason.trim(), trackingCode: parsed.trackingCode as string | undefined,
    });
    return noStoreJsonResponse({ ok: true, ...result });
  } catch (error) {
    if (error instanceof ShopOrderStateError) return noStoreJsonResponse({ ok: false, error: error.message }, error.status);
    if (error instanceof SyntaxError) return noStoreJsonResponse({ ok: false }, 400);
    return adminErrorResponse(error);
  }
}
