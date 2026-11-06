import { requireAdminCapability } from '@/lib/admin/admin-auth';
import { adminErrorResponse, noStoreJsonResponse } from '@/lib/admin/admin-http';
import { recordAdminAuditEvent } from '@/lib/admin/admin-service';
import { buildPrivateShopSkyArtworkProof } from '@/lib/shop/shop-private-artwork';
import { buildPrivateShopNightArtworkProof } from '@/lib/shop/shop-night-artwork';
import { buildPrivateShopMoonArtworkProof } from '@/lib/shop/shop-private-moon-artwork';
import { buildPrivateShopPrintHandoff, ShopPrintHandoffError } from '@/lib/shop/shop-print-handoff';
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
    const params = new URL(request.url).searchParams;
    const lines = params.getAll('line');
    if (lines.length !== 1 || params.size !== 1 || !/^(?:[1-9]|1\d|20)$/.test(lines[0])) {
      return noStoreJsonResponse({ ok: false }, 400);
    }
    const order = await getAdminShopOrder(id);
    if (!order) return noStoreJsonResponse({ ok: false }, 404);
    const brief = buildPrivateShopPrintHandoff(order);
    const lineNumber = Number(lines[0]);
    const print = brief.prints[lineNumber - 1];
    if (!print || !['p01', 'p02', 'p03'].includes(print.productId)) {
      return noStoreJsonResponse({ ok: false }, 422);
    }
    const artwork = print.productId === 'p01'
      ? await buildPrivateShopMoonArtworkProof(order, lineNumber)
      : print.productId === 'p03'
        ? await buildPrivateShopNightArtworkProof(order, lineNumber)
        : buildPrivateShopSkyArtworkProof(order, lineNumber);
    const isRaster = artwork.productId !== 'p02';
    await recordAdminAuditEvent({
      actor, action: 'shop.print_proof.downloaded', targetType: 'shop_order', targetId: id,
      afterSummary: {
        orderNumber: artwork.orderNumber, line: artwork.lineNumber,
        productId: artwork.productId, printArtworkReady: false,
      },
      success: true,
    });
    return new Response(isRaster ? new Uint8Array(artwork.bytes) : artwork.svg, {
      status: 200,
      headers: {
        'Content-Type': isRaster ? 'image/png' : 'image/svg+xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="halleus-order-${artwork.orderNumber}-${artwork.productId}-line-${artwork.lineNumber}-proof.${isRaster ? 'png' : 'svg'}"`,
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
