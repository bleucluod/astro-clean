import { isShopBitPayAvailable } from '@/lib/shop/shop-bitpay-readiness';
import { ShopBitPayAttemptError } from '@/lib/shop/shop-bitpay-attempt-store';
import { enforceShopSharedRateLimit } from '@/lib/shop/shop-shared-rate-limit';
import { shopClosed, shopErrorResponse, shopJson } from '@/lib/shop/shop-order-http';
import { finishBitPayReturn } from '@/lib/shop/shop-bitpay-flow';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function paymentReturn(request: Request, form: URLSearchParams | null) {
  if (!isShopBitPayAvailable() || shopClosed()) return shopJson({ ok: false }, 404);
  try {
    await enforceShopSharedRateLimit(request);
    const callbackUrl = new URL(request.url);
    // BitPay.ir's published sample uses GET. Some gateways POST form fields;
    // allow either but reject duplicate names in parseBitPayReturnQuery.
    if (form) for (const [name, value] of form) callbackUrl.searchParams.append(name, value);
    const status = await finishBitPayReturn(callbackUrl.toString());
    const target = new URL('/shop/payment', 'https://halleus.ir');
    target.searchParams.set('bitpay', status);
    return new Response(null, { status: 303, headers: {
      Location: target.toString(), 'Cache-Control': 'private, no-store',
      'Referrer-Policy': 'no-referrer',
    } });
  } catch (error) {
    if (error instanceof ShopBitPayAttemptError) {
      return shopJson({ ok: false, error: 'تأیید پرداخت امکان‌پذیر نیست؛ از بخش پیگیری وضعیت سفارش را بررسی کن.' }, 409);
    }
    return shopErrorResponse(error);
  }
}

export async function GET(request: Request) {
  return paymentReturn(request, null);
}

export async function POST(request: Request) {
  if (!isShopBitPayAvailable() || shopClosed()) return shopJson({ ok: false }, 404);
  if (!/^application\/x-www-form-urlencoded(?:\s*;|$)/i.test(request.headers.get('content-type')?.trim() ?? '')) {
    return shopJson({ ok: false }, 415);
  }
  const rawLength = request.headers.get('content-length');
  if (rawLength !== null && (!/^\d+$/.test(rawLength) || Number(rawLength) > 2_000)) {
    return shopJson({ ok: false }, 413);
  }
  const reader = request.body?.getReader();
  if (!reader) return shopJson({ ok: false }, 400);
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 2_000) return shopJson({ ok: false }, 413);
      chunks.push(value);
    }
  } catch {
    return shopJson({ ok: false }, 400);
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return paymentReturn(request, new URLSearchParams(new TextDecoder().decode(bytes)));
}
