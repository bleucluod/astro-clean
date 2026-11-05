import { isTrustedAdminRequestOrigin } from '@/lib/admin/admin-origin';
import { getHalleusRuntimeEnv } from '@/lib/config/env';
import { ShopOrderInputError } from './shop-order-contract';
import { ShopOrderStateError } from './shop-order-store';

export function shopJson(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export function shopClosed() {
  return process.env.NODE_ENV === 'production';
}

export async function readShopRequest(request: Request, maxBytes = 16_000): Promise<unknown> {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')?.trim() ?? '')) {
    throw new ShopOrderStateError('درخواست معتبر نیست.', 415);
  }
  if (!isTrustedAdminRequestOrigin(request, getHalleusRuntimeEnv().siteUrl)) {
    throw new ShopOrderStateError('درخواست از نشانی دیگری پذیرفته نمی‌شود.', 403);
  }
  const declaredLength = request.headers.get('content-length');
  if (declaredLength !== null && (!/^\d+$/.test(declaredLength)
      || Number(declaredLength) > maxBytes)) {
    throw new ShopOrderStateError('اطلاعات سفارش بیش از حد طولانی است.', 413);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new ShopOrderInputError();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new ShopOrderStateError('اطلاعات سفارش بیش از حد طولانی است.', 413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown; }
  catch { throw new ShopOrderInputError(); }
}

export function shopErrorResponse(error: unknown) {
  if (error instanceof ShopOrderInputError) return shopJson({ ok: false, error: error.message }, 400);
  if (error instanceof ShopOrderStateError) return shopJson({ ok: false, error: error.message }, error.status);
  return shopJson({ ok: false, error: 'در حال حاضر امکان ثبت یا بررسی سفارش وجود ندارد. کمی بعد دوباره تلاش کن.' }, 503);
}
