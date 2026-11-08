import { assertAdminJpegUploadRequest, requireAdminCapability } from '@/lib/admin/admin-auth';
import { adminErrorResponse, noStoreJsonResponse } from '@/lib/admin/admin-http';
import { recordAdminAuditEvent } from '@/lib/admin/admin-service';
import { buildPrivateShopPrintHandoff, ShopPrintHandoffError } from '@/lib/shop/shop-print-handoff';
import { buildPrivateShopDesignHandoffZip } from '@/lib/shop/shop-design-handoff-zip';
import { getAdminShopOrder } from '@/lib/shop/shop-order-store';

import { isShopMvpActive } from '@/lib/shop/shop-mvp-activation';
import { archiveOwnerSuppliedShopPrint, ShopManualPrintArchiveError } from '@/lib/shop/shop-manual-print-archive';

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

/** Owner-supplied, per-order final JPG. V1 NEVER generates real-order artwork automatically. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isShopMvpActive()) return noStoreJsonResponse({ ok: false }, 404);
  try {
    assertAdminJpegUploadRequest(request);
    const actor = await requireAdminCapability(request, 'shop_orders.write');
    if (actor.role !== 'owner') return noStoreJsonResponse({ ok: false }, 403);
    const { id } = await context.params;
    if (!uuidPattern.test(id)) return noStoreJsonResponse({ ok: false }, 400);
    const query = new URL(request.url).searchParams;
    const lineValues = query.getAll('line');
    if (lineValues.length !== 1 || query.size !== 1 || !/^(?:[1-9]|1\d|20)$/.test(lineValues[0])) {
      return noStoreJsonResponse({ ok: false }, 400);
    }
    if (request.headers.get('content-type')?.trim().toLowerCase() !== 'image/jpeg' ||
        request.headers.get('x-halleus-artwork-matches-order') !== 'confirmed' ||
        request.headers.get('x-halleus-print-lab-approved') !== 'confirmed') {
      return noStoreJsonResponse({ ok: false, error: 'نوع فایل یا تأییدهای چاپ کامل نیست.' }, 415);
    }
    const maxBytes = 8 * 1024 * 1024;
    const length = request.headers.get('content-length');
    if (length !== null && (!/^\d+$/.test(length) || Number(length) > maxBytes)) {
      return noStoreJsonResponse({ ok: false }, 413);
    }
    const order = await getAdminShopOrder(id);
    if (!order) return noStoreJsonResponse({ ok: false }, 404);
    if (!('status' in order) || typeof order.status !== 'string' ||
        !['payment_verified', 'preparing'].includes(order.status)) {
      return noStoreJsonResponse({ ok: false, error: 'بارگذاری فایل فقط پیش از ارسال سفارش مجاز است.' }, 409);
    }
    const handoff = buildPrivateShopPrintHandoff(order);
    const print = handoff.prints[Number(lineValues[0]) - 1];
    if (!print || print.productId !== 'p01') return noStoreJsonResponse({ ok: false }, 422);
    const root = process.env.HALLEUS_SHOP_PRINT_ARCHIVE_ROOT;
    if (!root) return noStoreJsonResponse({ ok: false, error: 'آرشیو خصوصی هنوز آماده نیست.' }, 409);
    const reader = request.body?.getReader();
    if (!reader) return noStoreJsonResponse({ ok: false }, 400);
    const buffers: Buffer[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) {
          await reader.cancel();
          return noStoreJsonResponse({ ok: false }, 413);
        }
        buffers.push(Buffer.from(value));
      }
    } finally { reader.releaseLock(); }
    const saved = await archiveOwnerSuppliedShopPrint({
      root, orderId: id, orderNumber: handoff.orderNumber,
      lineNumber: print.line, productId: 'p01', size: print.sizeCm,
      jpeg: Buffer.concat(buffers, size),
    });
    await recordAdminAuditEvent({
      actor, action: 'shop.manual_final_print.archived', targetType: 'shop_order', targetId: id,
      afterSummary: { orderNumber: handoff.orderNumber, line: print.line,
        productId: 'p01', size: print.sizeCm, sha256: saved.sha256,
        idempotent: saved.idempotent, approvedManually: true },
      success: true,
    });
    return noStoreJsonResponse({ ok: true, archivedPrivate: true,
      idempotent: saved.idempotent, sha256: saved.sha256 }, saved.idempotent ? 200 : 201);
  } catch (error) {
    if (error instanceof ShopPrintHandoffError) {
      return noStoreJsonResponse({ ok: false, error: error.message }, error.status);
    }
    if (error instanceof ShopManualPrintArchiveError) {
      return noStoreJsonResponse({ ok: false, error: error.message }, error.status);
    }
    return adminErrorResponse(error);
  }
}
