import { assertAdminMutationRequest, requireAdminCapability } from '@/lib/admin/admin-auth';
import { adminErrorResponse, noStoreJsonResponse } from '@/lib/admin/admin-http';
import { recordAdminAuditEvent } from '@/lib/admin/admin-service';
import { getAdminShopOrder } from '@/lib/shop/shop-order-store';
import { buildPrivateShopPrintHandoff, ShopPrintHandoffError } from '@/lib/shop/shop-print-handoff';
import { buildPrivateShopFinalPrintCandidate } from '@/lib/shop/shop-final-print';
import { loadPrivateShopFinalPrintSources } from '@/lib/shop/shop-private-print-originals';
import { archivePrivateShopPrintCandidate } from '@/lib/shop/shop-print-archive';
import { readShopRequest } from '@/lib/shop/shop-order-http';
import { ShopOrderInputError } from '@/lib/shop/shop-order-contract';
import { ShopOrderStateError } from '@/lib/shop/shop-order-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

function getLineNumber(request: Request) {
  const params = new URL(request.url).searchParams;
  const lines = params.getAll('line');
  if (lines.length !== 1 || params.size !== 1 || !/^(?:[1-9]|1\d|20)$/.test(lines[0])) {
    throw new ShopPrintHandoffError('ردیف فایل چاپی معتبر نیست.', 400);
  }
  return Number(lines[0]);
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  // The shop's private print artifacts remain unavailable in production until
  // the separate shop release/data/privacy approval has been completed.
  if (process.env.NODE_ENV === 'production') return noStoreJsonResponse({ ok: false }, 404);
  try {
    const actor = await requireAdminCapability(request, 'shop_orders.read');
    if (actor.role !== 'owner') return noStoreJsonResponse({ ok: false }, 403);
    const { id } = await context.params;
    if (!uuidPattern.test(id)) return noStoreJsonResponse({ ok: false }, 400);
    const line = getLineNumber(request);
    const order = await getAdminShopOrder(id);
    if (!order) return noStoreJsonResponse({ ok: false }, 404);
    const print = buildPrivateShopPrintHandoff(order).prints[line - 1];
    if (!print) return noStoreJsonResponse({ ok: false }, 422);
    // P01/P03 can only use vetted originals from an explicit private root.
    // Missing source/rights/sha fails closed; proofs are never substitutes.
    const sources = await loadPrivateShopFinalPrintSources(print.productId);
    const candidate = await buildPrivateShopFinalPrintCandidate(order, line, sources);
    await recordAdminAuditEvent({
      actor, action: 'shop.print_candidate.downloaded', targetType: 'shop_order', targetId: id,
      afterSummary: { orderNumber: candidate.orderNumber, line: candidate.lineNumber,
        productId: candidate.productId, printArtworkReady: false },
      success: true,
    });
    return new Response(new Uint8Array(candidate.bytes), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `attachment; filename="halleus-order-${candidate.orderNumber}-${candidate.productId}-line-${candidate.lineNumber}-prepress-candidate.jpg"`,
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

/** Explicit owner-only retention of an approval-PENDING candidate (never a print authorization). */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV === 'production') return noStoreJsonResponse({ ok: false }, 404);
  try {
    assertAdminMutationRequest(request);
    const actor = await requireAdminCapability(request, 'shop_orders.write');
    if (actor.role !== 'owner') return noStoreJsonResponse({ ok: false }, 403);
    const { id } = await context.params;
    if (!uuidPattern.test(id)) return noStoreJsonResponse({ ok: false }, 400);
    const line = getLineNumber(request);
    const body = await readShopRequest(request, 160);
    if (!body || typeof body !== 'object' || Array.isArray(body) ||
        Object.keys(body).length !== 1 ||
        (body as Record<string, unknown>).acknowledgePendingApproval !== true) {
      return noStoreJsonResponse({ ok: false }, 400);
    }
    if (process.platform !== 'linux' || !process.env.HALLEUS_SHOP_PRINT_ARCHIVE_ROOT) {
      return noStoreJsonResponse({ ok: false, error: 'آرشیو خصوصی هنوز توسط مدیر سرور تنظیم نشده است.' }, 409);
    }
    const order = await getAdminShopOrder(id);
    if (!order) return noStoreJsonResponse({ ok: false }, 404);
    const print = buildPrivateShopPrintHandoff(order).prints[line - 1];
    if (!print) return noStoreJsonResponse({ ok: false }, 422);
    const sources = await loadPrivateShopFinalPrintSources(print.productId);
    const candidate = await buildPrivateShopFinalPrintCandidate(order, line, sources);
    const saved = await archivePrivateShopPrintCandidate(
      process.env.HALLEUS_SHOP_PRINT_ARCHIVE_ROOT, id, candidate,
    );
    await recordAdminAuditEvent({
      actor, action: 'shop.print_candidate.archived', targetType: 'shop_order', targetId: id,
      afterSummary: { orderNumber: candidate.orderNumber, line: candidate.lineNumber,
        productId: candidate.productId, printArtworkReady: false, idempotent: saved.idempotent,
        sha256: saved.sha256 },
      success: true,
    });
    return noStoreJsonResponse({ ok: true, archivedPendingApproval: true,
      idempotent: saved.idempotent, sha256: saved.sha256 });
  } catch (error) {
    if (error instanceof ShopPrintHandoffError) {
      return noStoreJsonResponse({ ok: false, error: error.message }, error.status);
    }
    if (error instanceof ShopOrderInputError) return noStoreJsonResponse({ ok: false }, 400);
    if (error instanceof ShopOrderStateError) return noStoreJsonResponse({ ok: false }, error.status);
    return adminErrorResponse(error);
  }
}
