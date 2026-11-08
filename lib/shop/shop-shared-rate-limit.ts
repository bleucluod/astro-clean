import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { getAdminDatabase } from '@/lib/admin/admin-database';
import { ShopOrderStateError } from './shop-order-store';

type GuestScope = 'quote' | 'orders' | 'track' | 'mobile_track' | 'transfer' | 'cancel';

const guestScopes: Record<string, GuestScope> = {
  '/api/shop/quote': 'quote',
  '/api/shop/orders': 'orders',
  '/api/shop/orders/track': 'track',
  '/api/shop/orders/track/mobile': 'mobile_track',
  '/api/shop/orders/transfer': 'transfer',
  '/api/shop/orders/cancel': 'cancel',
};

const policies: Record<GuestScope, { maxHits: number; windowSeconds: number }> = {
  quote: { maxHits: 120, windowSeconds: 300 },
  orders: { maxHits: 20, windowSeconds: 900 },
  track: { maxHits: 120, windowSeconds: 600 },
  // Sequential order numbers plus known mobile must not permit high-volume enumeration.
  mobile_track: { maxHits: 8, windowSeconds: 900 },
  transfer: { maxHits: 40, windowSeconds: 900 },
  cancel: { maxHits: 30, windowSeconds: 900 },
};

// The only allowed client identity is an Nginx-overwritten, verified header.
// No X-Forwarded-For, X-Real-IP, cookie or caller-chosen identity is trusted.
// Production shop routes remain independently closed until the release gate.
export async function enforceShopSharedRateLimit(request: Request) {
  const scope = guestScopes[new URL(request.url).pathname];
  if (!scope || process.env.HALLEUS_SHOP_SHARED_RATE_ENABLED !== 'true') return;

  const trustedIngress = process.env.HALLEUS_SHOP_TRUSTED_CLIENT_IP === 'nginx-overwrite-v1';
  const secret = process.env.HALLEUS_SHOP_RATE_SECRET;
  const clientIp = request.headers.get('x-halleus-shop-client-ip')?.trim() ?? '';
  if (!trustedIngress || !secret || Buffer.byteLength(secret, 'utf8') < 32 || !isIP(clientIp)) {
    throw new ShopOrderStateError('امکان بررسی درخواست وجود ندارد؛ کمی بعد تلاش کن.', 503);
  }

  const scopeHash = createHmac('sha256', secret)
    .update(`halleus-shop-rate-v1\u0000${scope}\u0000${clientIp}`)
    .digest('hex');
  const { maxHits, windowSeconds } = policies[scope];
  const sql = getAdminDatabase();

  // An atomic PostgreSQL upsert, never a per-process counter. A locked row
  // serializes concurrent workers and the WHERE clause denies excess hits.
  const rows = await sql`
    insert into halleus_private.shop_rate_limits as bucket
      (scope_hash, window_started_at, hits)
    values (${scopeHash}, clock_timestamp(), 1)
    on conflict (scope_hash) do update set
      window_started_at = case
        when bucket.window_started_at <= clock_timestamp() - ${windowSeconds} * interval '1 second'
          then clock_timestamp() else bucket.window_started_at end,
      hits = case
        when bucket.window_started_at <= clock_timestamp() - ${windowSeconds} * interval '1 second'
          then 1 else bucket.hits + 1 end
    where bucket.hits < ${maxHits}
      or bucket.window_started_at <= clock_timestamp() - ${windowSeconds} * interval '1 second'
    returning hits
  `;
  if (!rows.length) throw new ShopOrderStateError('تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کن.', 429);
}
