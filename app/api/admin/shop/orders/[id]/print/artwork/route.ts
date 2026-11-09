import { assertAdminMutationRequest, requireAdminCapability } from '@/lib/admin/admin-auth';
import { adminErrorResponse, noStoreJsonResponse } from '@/lib/admin/admin-http';
import { recordAdminAuditEvent } from '@/lib/admin/admin-service';
import { getAdminShopOrder } from '@/lib/shop/shop-order-store';
import { readShopRequest } from '@/lib/shop/shop-order-http';
import { ShopOrderInputError } from '@/lib/shop/shop-order-contract';
import { buildPrivateShopPrintHandoff, ShopPrintHandoffError } from '@/lib/shop/shop-print-handoff';
import { buildPrivateShopFinalPrintCandidate, type ShopFinalPrintSources } from '@/lib/shop/shop-final-print';
import { loadPrivateShopFinalPrintSources } from '@/lib/shop/shop-private-print-originals';
import { SHOP_P01_R9B_STYLE } from '@/lib/shop/shop-p01-r9b-master';
import { isShopMvpActive, isShopP02OrderEnabled } from '@/lib/shop/shop-mvp-activation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const MAX_JPEG_BYTES = 8 * 1024 * 1024;
let rendering = false;

/** Owner-only R9b render using actual order data. Returns a reviewable JPG, NEVER saves artwork. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isShopMvpActive()) return noStoreJsonResponse({ ok: false }, 404);
  try {
    assertAdminMutationRequest(request);
    const actor = await requireAdminCapability(request, 'shop_orders.write');
    if (actor.role !== 'owner') return noStoreJsonResponse({ ok: false }, 403);
    const { id } = await context.params;
    if (!uuidPattern.test(id)) return noStoreJsonResponse({ ok: false }, 400);
    const parsed = await readShopRequest(request, 256);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
        Object.keys(parsed).length !== 1 || !('line' in parsed) ||
        !Number.isSafeInteger(parsed.line) || (parsed.line as number) < 1 || (parsed.line as number) > 20) {
      return noStoreJsonResponse({ ok: false, error: 'ردیف چاپ معتبر نیست.' }, 400);
    }
    const line = parsed.line as number;
    const order = await getAdminShopOrder(id);
    if (!order) return noStoreJsonResponse({ ok: false }, 404);
    if (!('status' in order) || typeof order.status !== 'string' ||
        !['payment_verified', 'preparing'].includes(order.status)) {
      return noStoreJsonResponse({ ok: false, error: 'ساخت فایل چاپ بعد از تأیید پرداخت و پیش از ارسال مجاز است.' }, 409);
    }
    const handoff = buildPrivateShopPrintHandoff(order);
    const print = handoff.prints[line - 1];
    if (!print || !['p01', 'p02'].includes(print.productId)) return noStoreJsonResponse({ ok: false }, 422);
    if (print.productId === 'p02' && !isShopP02OrderEnabled()) return noStoreJsonResponse({ ok: false }, 404);
    if (rendering) return noStoreJsonResponse({ ok: false, error: 'رندر دیگری در حال انجام است؛ دوباره تلاش کن.' }, 429);
    rendering = true;
    try {
      // P01 remains pinned to the verified lunar source; P02 uses the
      // same R9 scene as the customer preview with its own order reference.
      const sources: ShopFinalPrintSources = print.productId === 'p01'
        ? await loadPrivateShopFinalPrintSources('p01') : {};
      if (print.productId === 'p01' &&
          (!sources.moonMap || sources.moonDisc ||
           sources.moonMap.sha256 !== SHOP_P01_R9B_STYLE.preferredMapSha256)) {
        return noStoreJsonResponse({ ok: false, error: 'منبع تأییدشدهٔ ماه در فضای خصوصی آماده نیست.' }, 409);
      }
      const candidate = await buildPrivateShopFinalPrintCandidate(order, line, sources);
      if (candidate.bytes.length > MAX_JPEG_BYTES) {
        return noStoreJsonResponse({ ok: false, error: 'حجم خروجی بیشتر از حد مجاز آرشیو است.' }, 422);
      }
      await recordAdminAuditEvent({
        actor, action: 'shop.owner_order_artwork.rendered', targetType: 'shop_order',
        targetId: id, afterSummary: { orderNumber: candidate.orderNumber,
          line: candidate.lineNumber, productId: candidate.productId, approvedForPrint: false },
        success: true,
      });
      return new Response(new Uint8Array(candidate.bytes), {
        status: 200,
        headers: {
          'Content-Type': 'image/jpeg',
          'Content-Disposition': `attachment; filename="halleus-order-${candidate.orderNumber}-${candidate.productId}-line-${line}-review.jpg"`,
          'Cache-Control': 'private, no-store, max-age=0',
          'X-Content-Type-Options': 'nosniff',
          'X-Robots-Tag': 'noindex, nofollow',
          'Referrer-Policy': 'no-referrer',
          'Content-Security-Policy': "default-src 'none'; sandbox",
        },
      });
    } finally {
      rendering = false;
    }
  } catch (error) {
    if (error instanceof ShopPrintHandoffError || error instanceof ShopOrderInputError) {
      return noStoreJsonResponse({ ok: false, error: error.message }, error instanceof ShopPrintHandoffError ? error.status : 400);
    }
    return adminErrorResponse(error);
  }
}
