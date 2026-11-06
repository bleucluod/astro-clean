import { requireAdminCapability } from '@/lib/admin/admin-auth';
import { adminErrorResponse, noStoreJsonResponse } from '@/lib/admin/admin-http';
import { recordAdminAuditEvent } from '@/lib/admin/admin-service';
import { buildPrivateShopPrintHandoff, ShopPrintHandoffError } from '@/lib/shop/shop-print-handoff';
import { buildPrivateShopDesignHandoffZip } from '@/lib/shop/shop-design-handoff-zip';
import { getAdminShopOrder } from '@/lib/shop/shop-order-store';
import { isShopMvpActive } from '@/lib/shop/shop-mvp-activation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isShopMvpActive()) return noStoreJsonResponse({ ok: false }, 404);
  try {
    const actor = await requireAdminCapability(request, 'shop_orders.read');
    if (actor.role !== 'owner') return noStoreJsonResponse({ ok: false }, 403);
    const { id } = await context.params;
    if (!uuidPattern.test(id)) return noStoreJsonResponse({ ok: false }, 400);
    const order = await getAdminShopOrder(id);
    if (!order) return noStoreJsonResponse({ ok: false }, 404);
    const handoff = buildPrivateShopPrintHandoff(order);
    const archive = buildPrivateShopDesignHandoffZip(handoff);
    await recordAdminAuditEvent({
      actor, action: 'shop.manual_design_zip.downloaded', targetType: 'shop_order',
      targetId: id, afterSummary: { orderNumber: handoff.orderNumber, lines: handoff.prints.length },
      success: true,
    });
    return new Response(new Uint8Array(archive), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="halleus-order-${handoff.orderNumber}-design-handoff.zip"`,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
        'X-Robots-Tag': 'noindex, nofollow',
        'Referrer-Policy': 'no-referrer',
      },
    });
  } catch (error) {
    if (error instanceof ShopPrintHandoffError) {
      return noStoreJsonResponse({ ok: false, error: error.message }, error.status);
    }
    return adminErrorResponse(error);
  }
}
