import { requireAdminCapability } from '@/lib/admin/admin-auth';
import { adminErrorResponse, noStoreJsonResponse } from '@/lib/admin/admin-http';
import { recordAdminAuditEvent } from '@/lib/admin/admin-service';
import { buildPrivateShopSkyArtworkProof } from '@/lib/shop/shop-private-artwork';
import { ShopPrintHandoffError } from '@/lib/shop/shop-print-handoff';
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
    const params = new URL(request.url).searchParams;
    const lines = params.getAll('line');
    if (lines.length !== 1 || params.size !== 1 || !/^(?:[1-9]|1\d|20)$/.test(lines[0])) {
      return noStoreJsonResponse({ ok: false }, 400);
    }
    const order = await getAdminShopOrder(id);
    if (!order) return noStoreJsonResponse({ ok: false }, 404);
    const artwork = buildPrivateShopSkyArtworkProof(order, Number(lines[0]));
    await recordAdminAuditEvent({
      actor, action: 'shop.print_proof.downloaded', targetType: 'shop_order', targetId: id,
      afterSummary: {
        orderNumber: artwork.orderNumber, line: artwork.lineNumber,
        productId: artwork.productId, printArtworkReady: false,
      },
      success: true,
    });
    return new Response(artwork.svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="halleus-order-${artwork.orderNumber}-p02-line-${artwork.lineNumber}-proof.svg"`,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
        'X-Robots-Tag': 'noindex, nofollow',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    if (error instanceof ShopPrintHandoffError) {
      return noStoreJsonResponse({ ok: false, error: error.message }, error.status);
    }
    return adminErrorResponse(error);
  }
}
