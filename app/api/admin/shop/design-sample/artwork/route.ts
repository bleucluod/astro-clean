import { assertAdminMutationRequest, requireAdminCapability } from '@/lib/admin/admin-auth';
import { adminErrorResponse, noStoreJsonResponse } from '@/lib/admin/admin-http';
import { buildPrivateShopFinalPrintCandidate } from '@/lib/shop/shop-final-print';
import { loadPrivateShopFinalPrintSources } from '@/lib/shop/shop-private-print-originals';
import { validateShopMoment } from '@/lib/shop/shop-personalization';
import { safeShopArtworkText } from '@/lib/shop/shop-artwork-text';
import { ShopPrintHandoffError } from '@/lib/shop/shop-print-handoff';
import { SHOP_P01_R9B_STYLE } from '@/lib/shop/shop-p01-r9b-master';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const allowedSizes = new Set(['10x15', '20x30', '30x45']);
const allowedKeys = new Set(['calendar', 'date', 'names', 'message', 'city', 'size', 'moonTone']);
const maxBodyBytes = 2048;
let inFlight = false;

/** One synthetic owner sample only. Never queries an order, writes data or opens real-order artwork. */
export async function POST(request: Request) {
  try {
    assertAdminMutationRequest(request);
    const actor = await requireAdminCapability(request, 'shop_orders.read');
    if (actor.role !== 'owner') return noStoreJsonResponse({ ok: false }, 403);
    if (Number(request.headers.get('content-length') ?? 0) > maxBodyBytes) {
      return noStoreJsonResponse({ ok: false, error: 'درخواست نمونه بیش از حد بزرگ است.' }, 413);
    }
    const body = await request.text();
    if (Buffer.byteLength(body, 'utf8') > maxBodyBytes) {
      return noStoreJsonResponse({ ok: false, error: 'درخواست نمونه بیش از حد بزرگ است.' }, 413);
    }
    let parsed: unknown;
    try { parsed = JSON.parse(body); }
    catch { return noStoreJsonResponse({ ok: false, error: 'اطلاعات نمونه معتبر نیست.' }, 400); }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return noStoreJsonResponse({ ok: false, error: 'اطلاعات نمونه معتبر نیست.' }, 400);
    }
    const data = parsed as Record<string, unknown>;
    if (Object.keys(data).some((key) => !allowedKeys.has(key)) ||
        !['jalali', 'gregorian'].includes(data.calendar as string) ||
        typeof data.date !== 'string' || data.date.length > 20 ||
        typeof data.names !== 'string' || data.names.length > 60 ||
        typeof data.message !== 'string' || data.message.length > 60 ||
        (data.city !== undefined && (typeof data.city !== 'string' || data.city.length > 100)) ||
        typeof data.size !== 'string' || !allowedSizes.has(data.size) ||
        (data.moonTone !== undefined && data.moonTone !== 'original' && data.moonTone !== 'lifted')) {
      return noStoreJsonResponse({ ok: false, error: 'اطلاعات نمونه یا اندازهٔ چاپ معتبر نیست.' }, 422);
    }
    const details = {
      calendar: data.calendar as 'jalali' | 'gregorian',
      date: data.date.trim(),
      names: safeShopArtworkText(data.names, 'نام'),
      message: safeShopArtworkText(data.message, 'پیام'),
      city: safeShopArtworkText(typeof data.city === 'string' ? data.city : '', 'شهر', 100),
      time: '', cityId: '',
    };
    const moment = validateShopMoment('p01', details);
    if (!moment.ok) return noStoreJsonResponse({ ok: false, error: moment.message }, 422);
    if (inFlight) return noStoreJsonResponse({ ok: false, error: 'رندر دیگری در حال انجام است؛ دوباره تلاش کن.' }, 429);
    inFlight = true;
    try {
      // Fail closed: the exact vetted 8K source must already be installed outside
      // the public repo/release, with private-root permissions and provenance manifest.
      const sources = await loadPrivateShopFinalPrintSources('p01');
      if (!sources.moonMap || sources.moonDisc ||
          sources.moonMap.sha256 !== SHOP_P01_R9B_STYLE.preferredMapSha256) {
        return noStoreJsonResponse({ ok: false, error: 'نقشهٔ اصلی 8K تأییدشده در فضای خصوصی نصب نیست.' }, 409);
      }
      const sample = {
        display_number: '1', status: 'payment_verified',
        items: [{ key: 'owner-sample-p01', productId: 'p01', size: data.size,
          quantity: 1, details }],
      };
      // Only this owner-only synthetic route can request a temporary brighter comparison.
      // All existing print call sites omit the option and retain the baseline grade.
      const moonTone = data.moonTone === 'lifted' ? 'lifted' : 'original';
      const artwork = await buildPrivateShopFinalPrintCandidate(sample, 1, sources, { ownerP01MoonTone: moonTone });
      return new Response(new Uint8Array(artwork.bytes), {
        status: 200,
        headers: {
          'Content-Type': 'image/jpeg',
          'Content-Disposition': `attachment; filename="halleus-p01-r9b-owner-sample-${data.size}-${moonTone}.jpg"`,
          'Cache-Control': 'private, no-store, max-age=0',
          'X-Content-Type-Options': 'nosniff',
          'X-Robots-Tag': 'noindex, nofollow',
          'Referrer-Policy': 'no-referrer',
          'Content-Security-Policy': "default-src 'none'; sandbox",
        },
      });
    } finally { inFlight = false; }
  } catch (error) {
    if (error instanceof ShopPrintHandoffError) {
      return noStoreJsonResponse({ ok: false, error: error.message }, error.status);
    }
    return adminErrorResponse(error);
  }
}
