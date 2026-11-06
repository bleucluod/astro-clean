import { assertAdminMutationRequest, requireAdminCapability } from '@/lib/admin/admin-auth';
import { adminErrorResponse, noStoreJsonResponse } from '@/lib/admin/admin-http';
import { buildPrivateShopDesignHandoffZip } from '@/lib/shop/shop-design-handoff-zip';
import { buildPrivateShopPrintHandoff } from '@/lib/shop/shop-print-handoff';
import { validateShopMoment } from '@/lib/shop/shop-personalization';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const sampleSizes = ['10x15', '20x30', '30x45'] as const;

/** Owner-only synthetic reference brief. No orders, storage, images, or shop activation. */
export async function POST(request: Request) {
  try {
    assertAdminMutationRequest(request);
    const actor = await requireAdminCapability(request, 'shop_orders.read');
    if (actor.role !== 'owner') return noStoreJsonResponse({ ok: false }, 403);

    if (Number(request.headers.get('content-length') || 0) > 2048) {
      return noStoreJsonResponse({ ok: false, error: 'درخواست نمونه بیش از حد بزرگ است.' }, 413);
    }
    const raw = await request.text();
    if (Buffer.byteLength(raw, 'utf8') > 2048) {
      return noStoreJsonResponse({ ok: false, error: 'درخواست نمونه بیش از حد بزرگ است.' }, 413);
    }
    let parsed: unknown;
    try { parsed = JSON.parse(raw); }
    catch { return noStoreJsonResponse({ ok: false, error: 'اطلاعات نمونه معتبر نیست.' }, 400); }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return noStoreJsonResponse({ ok: false, error: 'اطلاعات نمونه معتبر نیست.' }, 400);
    }
    const data = parsed as Record<string, unknown>;
    const calendar = data.calendar;
    const date = data.date;
    const names = data.names ?? '';
    const message = data.message ?? '';
    if (!['jalali', 'gregorian'].includes(calendar as string) ||
        typeof date !== 'string' || date.length > 20 ||
        typeof names !== 'string' || names.length > 60 ||
        typeof message !== 'string' || message.length > 60) {
      return noStoreJsonResponse({ ok: false, error: 'تقویم، تاریخ، نام یا پیام نمونه معتبر نیست.' }, 422);
    }
    const moment = validateShopMoment('p01', {
      calendar: calendar as 'jalali' | 'gregorian', date, time: '', city: '', cityId: '',
    });
    if (!moment.ok) return noStoreJsonResponse({ ok: false, error: moment.message }, 422);

    // Use the exact same validated P01 calculation and print-spec path as real orders.
    const handoff = buildPrivateShopPrintHandoff({
      display_number: '1', status: 'payment_verified',
      items: sampleSizes.map((size) => ({
        key: `p01-synthetic-${size}`, productId: 'p01', size, quantity: 1,
        details: { calendar, date, names, message, time: '', city: '', cityId: '' },
      })),
    });
    const archive = buildPrivateShopDesignHandoffZip(handoff, { sampleOnly: true });
    return new Response(new Uint8Array(archive), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="halleus-p01-synthetic-design-data.zip"',
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
        Vary: 'Authorization',
      },
    });
  } catch (error) { return adminErrorResponse(error); }
}
