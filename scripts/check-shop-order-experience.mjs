import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
function load(path, dependencies = {}) {
  const output = ts.transpileModule(read(path), {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  assert.equal(output.diagnostics?.length ?? 0, 0, path + ' must parse');
  const mod = { exports: {} };
  const factory = vm.runInNewContext('(function(module,exports,require){' + output.outputText + '\n})', {
    Request, Response, Buffer, Uint8Array, URL, Date, TextDecoder, process: { env: { NODE_ENV: 'production' } },
  });
  factory(mod, mod.exports, (name) => {
    if (!(name in dependencies)) throw new Error('Unexpected test dependency ' + path + ': ' + name);
    return dependencies[name];
  });
  return mod.exports;
}

const fmt = load('lib/shop/shop-order-number.ts');
assert.equal(fmt.formatShopOrderNumber('1206'), '#۱۲۰۶');
assert.equal(fmt.formatShopOrderNumber('9223372036854775807'), '#۹۲۲۳۳۷۲۰۳۶۸۵۴۷۷۵۸۰۷');
assert.equal(fmt.formatShopInteger('1699000').includes('٬'), true, 'money remains grouped');
const shipping = load('components/shop/shop-checkout-state.ts');
const contract = load('lib/shop/shop-order-contract.ts', {
  'node:crypto': { createHash },
  './shop-order-number': fmt,
  '@/components/shop/shop-cart': { parseShopCart: () => [] },
  '@/components/shop/shop-checkout-state': shipping,
  './shop-quote': { quoteShopItems: () => ({ total: 0 }) },
  './shop-payment-gateway': { isShopManualPaymentSelection: () => true },
});
assert.equal(contract.parseGuestMobileLookup({ orderNumber: '#۱۲۰۶', mobile: '۰۹۱۲۱۲۳۴۵۶۷' }).orderNumber, '1206');
assert.equal(contract.parseGuestMobileLookup({ orderNumber: '1206', mobile: '+989121234567' }).recipientMobile, '+989121234567');
for (const data of [
  { orderNumber: '1206', mobile: '0912' },
  { orderNumber: '1206', mobile: '09121234567', extra: true },
  { orderNumber: '1206', mobile: '09121234567', accessCode: 'f'.repeat(64) },
  { orderNumber: 'invalid', mobile: '09121234567' },
]) assert.throws(() => contract.parseGuestMobileLookup(data));

const orderId = '00000000-0000-4000-8000-000000000001';
const privateRow = {
  id: orderId, display_number: '1206', recipient_mobile: '+989121234567',
  status: 'transfer_declared', carrier: 'post', item_count: 1, total_toman: 1699000,
  tracking_code: null, created_at: new Date('2026-11-08T07:00:00Z'),
  updated_at: new Date('2026-11-08T08:00:00Z'),
  address: 'NOT_PUBLIC', postal_code: 'PRIVATE', guest_access_hash: 'PRIVATE_HASH',
};
const sql = async (strings, ...values) => {
  const query = strings.join('?').replace(/\s+/g, ' ').toLowerCase();
  if (query.includes('from halleus_private.shop_orders')) {
    assert.match(query, /display_number = \?::bigint and recipient_mobile = \?/);
    return values[0] === '1206' && values[1] === '+989121234567' ? [privateRow] : [];
  }
  if (query.includes('from halleus_private.shop_order_events')) return [
    { action: 'transfer.declared', after_status: 'transfer_declared', created_at: privateRow.updated_at },
  ];
  throw new Error('Unexpected SQL');
};
const store = load('lib/shop/shop-order-store.ts', {
  '@/lib/admin/admin-database': { getAdminDatabase: () => sql },
});
const byPhone = await store.getGuestShopOrderByMobile({
  orderNumber: '1206', recipientMobile: '+989121234567',
});
assert.equal(byPhone.orderNumber, '1206');
assert.equal(byPhone.status, 'transfer_declared');
for (const privateValue of ['NOT_PUBLIC', 'PRIVATE', '+989121234567', 'PRIVATE_HASH']) {
  assert.equal(JSON.stringify(byPhone).includes(privateValue), false, 'status projection must remain private');
}
assert.equal(await store.getGuestShopOrderByMobile({ orderNumber: '1206', recipientMobile: '+989111111111' }), null);

const track = load('app/api/shop/orders/track/mobile/route.ts', {
  '@/lib/shop/shop-order-contract': contract,
  '@/lib/shop/shop-order-store': store,
  '@/lib/shop/shop-order-http': {
    shopClosed: () => false,
    readShopRequest: async (request) => request.json(),
    shopJson: (value, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'private, no-store' } }),
    shopErrorResponse: () => Response.json({ ok: false }, { status: 400 }),
  },
});
const trackingRequest = (body) => new Request('https://halleus.ir/api/shop/orders/track/mobile', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const successfulTrack = await track.POST(trackingRequest({ orderNumber: '1206', mobile: '09121234567' }));
assert.equal(successfulTrack.status, 200);
assert.equal((await successfulTrack.json()).order.orderNumber, '1206');
assert.equal((await track.POST(trackingRequest({ orderNumber: '1206', mobile: '09121111111' }))).status, 404);

const limiterSource = read('lib/shop/shop-shared-rate-limit.ts');
assert.match(limiterSource, /'\/api\/shop\/orders\/track\/mobile': 'mobile_track'/);
assert.match(limiterSource, /mobile_track: \{ maxHits: 8, windowSeconds: 900 \}/);
const mobileRouteSource = read('app/api/shop/orders/track/mobile/route.ts');
assert.match(mobileRouteSource, /readShopRequest\(request, 2_000\)/);
assert.match(mobileRouteSource, /shopClosed\(\)/);
const artworkRouteSource = read('app/api/admin/shop/orders/[id]/print/artwork/route.ts');
assert.match(artworkRouteSource, /assertAdminMutationRequest\(request\)/);
assert.match(artworkRouteSource, /requireAdminCapability\(request, 'shop_orders\.write'\)/);
assert.match(artworkRouteSource, /SHOP_P01_R9B_STYLE\.preferredMapSha256/);
assert.doesNotMatch(artworkRouteSource, /archiveOwnerSuppliedShopPrint|archivePrivateShopPrintCandidate/);
let active = false, role = 'viewer', status = 'payment_verified', audits = 0;
const artworkRoute = load('app/api/admin/shop/orders/[id]/print/artwork/route.ts', {
  '@/lib/admin/admin-auth': { assertAdminMutationRequest: () => {}, requireAdminCapability: async () => ({ role, userId: 'owner' }) },
  '@/lib/admin/admin-http': {
    noStoreJsonResponse: (value, statusCode = 200) => Response.json(value, { status: statusCode }),
    adminErrorResponse: () => Response.json({ ok: false }, { status: 503 }),
  },
  '@/lib/admin/admin-service': { recordAdminAuditEvent: async () => { audits++; } },
  '@/lib/shop/shop-order-store': { getAdminShopOrder: async () => ({ status }) },
  '@/lib/shop/shop-order-http': { readShopRequest: async () => ({ line: 1 }) },
  '@/lib/shop/shop-order-contract': { ShopOrderInputError: class ShopOrderInputError extends Error {} },
  '@/lib/shop/shop-print-handoff': {
    ShopPrintHandoffError: class ShopPrintHandoffError extends Error {},
    buildPrivateShopPrintHandoff: () => ({ prints: [{ productId: 'p01' }] }),
  },
  '@/lib/shop/shop-final-print': { buildPrivateShopFinalPrintCandidate: async () => ({
    bytes: Buffer.from('synthetic-jpeg-bytes'), orderNumber: '1206', lineNumber: 1,
  }) },
  '@/lib/shop/shop-private-print-originals': { loadPrivateShopFinalPrintSources: async () => ({
    moonMap: { sha256: 'EXPECTED_PRIVATE_SOURCE' },
  }) },
  '@/lib/shop/shop-p01-r9b-master': { SHOP_P01_R9B_STYLE: { preferredMapSha256: 'EXPECTED_PRIVATE_SOURCE' } },
  '@/lib/shop/shop-mvp-activation': { isShopMvpActive: () => active },
});
const ctx = { params: Promise.resolve({ id: orderId }) };
const requestArtwork = () => artworkRoute.POST(new Request('https://halleus.ir/api/admin/shop/orders/' + orderId + '/print/artwork', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"line":1}',
}), ctx);
assert.equal((await requestArtwork()).status, 404, 'closed shop denies artwork');
active = true;
assert.equal((await requestArtwork()).status, 403, 'owner permission required');
role = 'owner'; status = 'awaiting_transfer';
assert.equal((await requestArtwork()).status, 409, 'unpaid order denies artwork');
status = 'payment_verified';
const art = await requestArtwork();
assert.equal(art.status, 200);
assert.equal(art.headers.get('content-type'), 'image/jpeg');
assert.match(art.headers.get('content-disposition'), /1206-p01-line-1-review/);
assert.match(art.headers.get('cache-control'), /no-store/);
assert.equal(audits, 1);

const flow = read('components/shop/ShopCheckoutFlow.tsx');
const admin = read('components/admin/ShopOrdersWorkspace.tsx');
assert.match(flow, /formatShopOrderNumber\(order\.orderNumber\)/);
assert.doesNotMatch(flow, /\{receipt\.accessCode\}<\/bdi>/);
assert.match(flow, /fetchShopOrderWithMobile\(/);
assert.match(admin, /generateOrderArtwork\(\)/);
assert.match(admin, /confirmOrderMatch/);
assert.match(admin, /confirmLabPrint/);
assert.match(admin, /ZIP اختیاری/);
console.log('SHOP_ORDER_EXPERIENCE=PASS number_no_grouping, safe_cross_device_status, owner_generation, approval_boundary');
