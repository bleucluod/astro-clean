import { requireAdminCapability } from '@/lib/admin/admin-auth';
import { adminErrorResponse, noStoreJsonResponse } from '@/lib/admin/admin-http';
import { recordAdminAuditEvent } from '@/lib/admin/admin-service';
import { buildPrivateShopPrintHandoff, ShopPrintHandoffError } from '@/lib/shop/shop-print-handoff';
import { getAdminShopOrder } from '@/lib/shop/shop-order-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV === 'production') return noStoreJsonResponse({ ok: false }, 404);
  try {
    const actor = await requireAdminCapability(request, 'shop_orders.read');
    if (actor.role !== 'owner') return noStoreJsonResponse({ ok: false }, 403);
    const { id } = await context.params;
    if (!uuidPattern.test(id)) return noStoreJsonResponse({ ok: false }, 400);
    const order = await getAdminShopOrder(id);
    if (!order) return noStoreJsonResponse({ ok: false }, 404);
    const handoff = buildPrivateShopPrintHandoff(order);
    await recordAdminAuditEvent({
      actor, action: 'shop.print_brief.downloaded', targetType: 'shop_order',
      targetId: id, afterSummary: { orderNumber: handoff.orderNumber, lines: handoff.prints.length },
      success: true,
    });
    return new Response(JSON.stringify(handoff, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="halleus-order-${handoff.orderNumber}-print-brief.json"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof ShopPrintHandoffError) {
      return noStoreJsonResponse({ ok: false, error: error.message }, error.status);
    }
    return adminErrorResponse(error);
  }
}
