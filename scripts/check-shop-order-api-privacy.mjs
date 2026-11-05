// Source-level HTTP and field-projection checks with synthetic order records.
// No real credentials, payment, customer data, PostgreSQL or live route calls.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const runtime = { NODE_ENV: 'development' };
function load(file, dependencies = {}) {
  const source = readFileSync(resolve(root, file), 'utf8');
  const compiled = ts.transpileModule(source, {
    fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  const factory = vm.runInNewContext(`(function(module,exports,require){${compiled}\n})`, {
    Response, Request, Buffer, Date, URL, TextDecoder, process: { env: runtime },
  });
  factory(mod, mod.exports, (name) => {
    if (!(name in dependencies)) throw new Error(`Unmapped route dependency: ${file} -> ${name}`);
    return dependencies[name];
  });
  return mod.exports;
}

const products = load('components/shop/product-detail-data.ts');
const jalali = load('lib/date/jalali.ts');
const iran = load('lib/locations/iran-cities.ts');
const global = load('lib/locations/global-cities.ts');
const cities = load('lib/locations/cities.ts', {
  '@/lib/locations/iran-cities': iran, '@/lib/locations/global-cities': global,
});
const civilTime = load('lib/shop/shop-civil-time.ts');
const personalization = load('lib/shop/shop-personalization.ts', {
  '@/lib/date/jalali': jalali, '@/lib/locations/cities': cities, './shop-civil-time': civilTime,
});
const cart = load('components/shop/shop-cart.ts', {
  './product-detail-data': products, '@/lib/shop/shop-personalization': personalization,
  '@/lib/locations/cities': cities,
});
const shipping = load('components/shop/shop-checkout-state.ts');
const quote = load('lib/shop/shop-quote.ts', {
  '@/components/shop/product-detail-data': products,
  '@/components/shop/shop-checkout-state': shipping,
});
const orderNumber = load('lib/shop/shop-order-number.ts');
const contract = load('lib/shop/shop-order-contract.ts', {
  'node:crypto': { createHash }, '@/components/shop/shop-cart': cart,
  '@/components/shop/shop-checkout-state': shipping, './shop-quote': quote,
  './shop-order-number': orderNumber,
});
const secret = 'f'.repeat(64);
const accessHash = createHash('sha256').update(secret).digest('hex');
const privateRecord = {
  id: '00000000-0000-4000-8000-000000000001', display_number: 3210,
  status: 'shipped', carrier: 'tipax', item_count: 1, total_toman: 1699000,
  tracking_code: 'POST-TRACK-SYNTH', created_at: '2026-11-04T10:00:00Z',
  updated_at: '2026-11-05T10:00:00Z', recipient_name: 'PERSONAL-SYNTH',
  recipient_mobile: '+989121234567', address: 'PRIVATE-STREET-SYNTH',
  postal_code: '1234567890', delivery_note: 'PRIVATE-NOTE-SYNTH',
  transfer_reference: 'BANK-REF-SYNTH', guest_access_hash: accessHash,
  idempotency_hash: 'IDEMPOTENCY-SYNTH', payload_hash: 'PAYLOAD-SYNTH',
};
const sensitive = ['PERSONAL-SYNTH', '+989121234567', 'PRIVATE-STREET-SYNTH',
  '1234567890', 'PRIVATE-NOTE-SYNTH', 'BANK-REF-SYNTH', accessHash,
  'IDEMPOTENCY-SYNTH', 'PAYLOAD-SYNTH', secret];
const event = { action: 'mark_shipped', after_status: 'shipped',
  created_at: '2026-11-05T10:00:00Z', reason: 'ADMIN-REASON-SYNTH',
  actor_user_id: 'ADMIN-ID-SYNTH' };
let databaseCalls = 0;
const sql = async (parts, ...values) => {
  databaseCalls++;
  const query = parts.join('?').replace(/\s+/g, ' ').toLowerCase();
  if (query.includes('from halleus_private.shop_orders') && query.includes('guest_access_hash')) {
    assert.match(query, /display_number = \?::bigint and guest_access_hash = \?/);
    return String(privateRecord.display_number) === values[0] && accessHash === values[1]
      ? [privateRecord] : [];
  }
  if (query.includes('from halleus_private.shop_orders') && query.includes('select *')) {
    return values[0] === privateRecord.id ? [privateRecord] : [];
  }
  if (query.includes('from halleus_private.shop_order_events')) return [event];
  throw Error('Unexpected SQL in API privacy fixture: ' + query.slice(0, 150));
};
const store = load('lib/shop/shop-order-store.ts', {
  '@/lib/admin/admin-database': { getAdminDatabase: () => sql },
});
const actualGuest = await store.getGuestShopOrder({ orderNumber: '3210', accessHash });
assert.ok(actualGuest);
assert.deepEqual(Object.keys(actualGuest).sort(),
  ['orderNumber', 'status', 'carrier', 'itemCount', 'totalToman', 'trackingCode',
    'createdAt', 'updatedAt', 'events'].sort());
assert.deepEqual(Object.keys(actualGuest.events[0]).sort(), ['action', 'status', 'at'].sort());
for (const field of [...sensitive, 'ADMIN-REASON-SYNTH', 'ADMIN-ID-SYNTH']) {
  assert.equal(JSON.stringify(actualGuest).includes(field), false, `Guest response leaked ${field}`);
}
const ownerOrder = await store.getAdminShopOrder(privateRecord.id);
assert.equal(ownerOrder.recipient_mobile, privateRecord.recipient_mobile, 'owner view needs delivery details');
for (const field of ['idempotency_hash', 'guest_access_hash', 'payload_hash']) {
  assert.equal(Object.hasOwn(ownerOrder, field), false, `Owner API leaked credential field ${field}`);
}

const origin = load('lib/admin/admin-origin.ts');
const http = load('lib/shop/shop-order-http.ts', {
  '@/lib/admin/admin-origin': origin,
  '@/lib/config/env': { getHalleusRuntimeEnv: () => ({ siteUrl: 'https://halleus.ir' }) },
  './shop-order-contract': contract, './shop-order-store': store,
});
let createCalls = 0;
let replay = false;
const controlledStore = {
  ...store,
  createShopOrder: async (draft) => {
    createCalls++;
    assert.equal(draft.quote.total, 1_699_000);
    assert.equal(draft.guestAccessHash, accessHash);
    return { orderNumber: '3210', created: !replay,
      status: replay ? 'payment_verified' : 'awaiting_transfer' };
  },
};
const modules = {
  create: load('app/api/shop/orders/route.ts', {
    '@/lib/shop/shop-order-contract': contract,
    '@/lib/shop/shop-order-store': controlledStore,
    '@/lib/shop/shop-order-http': http,
  }),
  track: load('app/api/shop/orders/track/route.ts', {
    '@/lib/shop/shop-order-contract': contract,
    '@/lib/shop/shop-order-store': store,
    '@/lib/shop/shop-order-http': http,
  }),
  transfer: load('app/api/shop/orders/transfer/route.ts', {
    '@/lib/shop/shop-order-contract': contract,
    '@/lib/shop/shop-order-store': { declareShopTransfer: async () => ({ status: 'transfer_declared' }) },
    '@/lib/shop/shop-order-http': http,
  }),
  cancel: load('app/api/shop/orders/cancel/route.ts', {
    '@/lib/shop/shop-order-contract': contract,
    '@/lib/shop/shop-order-store': { cancelGuestShopOrder: async () => ({ status: 'cancel_requested' }) },
    '@/lib/shop/shop-order-http': http,
  }),
};
const details = { calendar: 'jalali', date: '1403/08/15', time: '', city: '', names: 'PERSONAL-ART-SYNTH', message: '' };
const item = { key: 'synthetic-line', productId: 'p01', size: '20x30', quantity: 1, details };
const address = { ...shipping.blankShipping, name: 'Synthetic', mobile: '9123456789',
  province: 'Tehran', city: 'Tehran', address: 'Synthetic street number 123',
  postalCode: '1234567890', note: '', carrier: 'post' };
const createBody = { items: [item], shipping: address, expectedTotal: 1699000,
  idempotencyKey: '28cdd805-a6a7-4215-9777-0b13558a0e2d', guestAccessCode: secret };
const credentials = { orderNumber: '3210', accessCode: secret };
const post = (route, body, extra = {}) => route.POST(new Request('http://localhost/api/shop/orders', {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...extra },
  body: JSON.stringify(body),
}));

let response = await post(modules.create, createBody);
assert.equal(response.status, 201);
assert.deepEqual(await response.json(), { ok: true, orderNumber: '3210', status: 'awaiting_transfer' });
replay = true;
response = await post(modules.create, createBody);
assert.equal(response.status, 200);
assert.deepEqual(await response.json(), { ok: true, orderNumber: '3210', status: 'payment_verified' });
assert.equal(createCalls, 2);
response = await post(modules.create, { ...createBody, expectedTotal: 1 });
assert.equal(response.status, 400);
assert.equal(createCalls, 2);
response = await post(modules.create, createBody, { Origin: 'https://forged.invalid' });
assert.equal(response.status, 403);
assert.equal(createCalls, 2);

response = await post(modules.track, credentials);
assert.equal(response.status, 200);
const trackingResponse = await response.json();
assert.equal(trackingResponse.order.trackingCode, 'POST-TRACK-SYNTH');
assert.equal(response.headers.get('cache-control'), 'private, no-store');
for (const value of [...sensitive, 'ADMIN-REASON-SYNTH', 'ADMIN-ID-SYNTH', 'PERSONAL-ART-SYNTH']) {
  assert.equal(JSON.stringify(trackingResponse).includes(value), false, `Tracking leaked ${value}`);
}
assert.equal((await post(modules.track, { ...credentials, accessCode: 'e'.repeat(64) })).status, 404);
assert.equal((await post(modules.track, { ...credentials, accessCode: 'too-short' })).status, 400);
assert.deepEqual(await (await post(modules.transfer, { ...credentials, reference: '1234', time: '' })).json(),
  { ok: true, status: 'transfer_declared' });
assert.deepEqual(await (await post(modules.cancel, credentials)).json(),
  { ok: true, status: 'cancel_requested' });

const callsBeforeClosure = databaseCalls;
runtime.NODE_ENV = 'production';
for (const route of Object.values(modules)) {
  const closed = await post(route, createBody);
  assert.equal(closed.status, 404);
}
assert.equal(databaseCalls, callsBeforeClosure);
assert.equal(createCalls, 2);
runtime.NODE_ENV = 'development';

let role = 'owner';
let ownerWrites = 0;
const ownerWriteStore = {
  ...store,
  applyAdminShopAction: async (input) => {
    ownerWrites++;
    assert.equal(input.action, 'start_preparation');
    assert.equal(input.reason, 'synthetic owner review');
    return { status: 'preparing', version: 2 };
  },
};
const adminDetail = load('app/api/admin/shop/orders/[id]/route.ts', {
  '@/lib/admin/admin-auth': {
    requireAdminCapability: async () => ({ role, userId: 'owner-synthetic' }),
    assertAdminMutationRequest: () => {},
  },
  '@/lib/admin/admin-http': {
    noStoreJsonResponse: (body, status = 200) => Response.json(body, {
      status, headers: { 'Cache-Control': 'private, no-store' },
    }),
    adminErrorResponse: () => Response.json({ ok: false }, { status: 503 }),
  },
  '@/lib/shop/shop-order-store': ownerWriteStore,
  '@/lib/shop/shop-order-contract': contract,
  '@/lib/shop/shop-order-http': http,
});
const ownerGet = () => adminDetail.GET(new Request('http://localhost/api/admin/shop/orders/' + privateRecord.id), {
  params: Promise.resolve({ id: privateRecord.id }),
});
role = 'viewer';
assert.equal((await ownerGet()).status, 403);
role = 'owner';
response = await ownerGet();
assert.equal(response.status, 200);
assert.equal(response.headers.get('cache-control'), 'private, no-store');
const adminData = await response.json();
assert.equal(adminData.order.recipient_mobile, privateRecord.recipient_mobile);
for (const value of [accessHash, 'IDEMPOTENCY-SYNTH', 'PAYLOAD-SYNTH']) {
  assert.equal(JSON.stringify(adminData).includes(value), false);
}
const ownerPatch = (body, headers = {}) => adminDetail.PATCH(new Request(
  'http://localhost/api/admin/shop/orders/' + privateRecord.id, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', ...headers }, body,
  }), { params: Promise.resolve({ id: privateRecord.id }) });
const goodChange = JSON.stringify({ action: 'start_preparation', version: 1,
  reason: 'synthetic owner review' });
response = await ownerPatch(goodChange);
assert.equal(response.status, 200);
assert.equal(response.headers.get('cache-control'), 'private, no-store');
assert.equal(ownerWrites, 1);
assert.equal((await ownerPatch(goodChange, { 'Content-Length': '2001' })).status, 413);
assert.equal((await ownerPatch(goodChange + ' '.repeat(2500))).status, 413,
  'streamed oversized admin mutation must be rejected before JSON parsing');
assert.equal((await ownerPatch(goodChange + ' ' + 'آ'.repeat(1100))).status, 413,
  'admin mutation cap counts UTF-8 bytes, not characters');
assert.equal((await ownerPatch('{broken json')).status, 400);
assert.equal((await ownerPatch(goodChange, { Origin: 'https://forged.invalid' })).status, 403);
assert.equal((await ownerPatch(goodChange, { 'Content-Type': 'text/plain' })).status, 415);
assert.equal(ownerWrites, 1, 'rejected admin mutations must not write');
role = 'viewer';
assert.equal((await ownerPatch(goodChange)).status, 403);
role = 'owner';
assert.equal(ownerWrites, 1);
runtime.NODE_ENV = 'production';
assert.equal((await ownerPatch(goodChange)).status, 404);
assert.equal(ownerWrites, 1);
const readsBeforeAdminClosure = databaseCalls;
assert.equal((await ownerGet()).status, 404);
assert.equal(databaseCalls, readsBeforeAdminClosure);

console.log('Shop order HTTP privacy: canonical replay, 4 guest routes, secret rejection, private projection, bounded owner PATCH, no-store and production locks passed.');
console.log('EXTERNAL_BLOCK: PostgreSQL-backed HTTP E2E, trusted ingress controls and notification delivery remain unverified.');
