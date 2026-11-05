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
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    throw new ShopOrderStateError('درخواست معتبر نیست.', 415);
  }
  if (!isTrustedAdminRequestOrigin(request, getHalleusRuntimeEnv().siteUrl)) {
    throw new ShopOrderStateError('درخواست از نشانی دیگری پذیرفته نمی‌شود.', 403);
  }
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > maxBytes) throw new ShopOrderStateError('اطلاعات سفارش بیش از حد طولانی است.', 413);
  const text = await request.text();
  if (Buffer.byteLength(text, 'utf8') > maxBytes) {
    throw new ShopOrderStateError('اطلاعات سفارش بیش از حد طولانی است.', 413);
  }
  try { return JSON.parse(text) as unknown; }
  catch { throw new ShopOrderInputError(); }
}

export function shopErrorResponse(error: unknown) {
  if (error instanceof ShopOrderInputError) return shopJson({ ok: false, error: error.message }, 400);
  if (error instanceof ShopOrderStateError) return shopJson({ ok: false, error: error.message }, error.status);
  return shopJson({ ok: false, error: 'در حال حاضر امکان ثبت یا بررسی سفارش وجود ندارد. کمی بعد دوباره تلاش کن.' }, 503);
}
