import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const storage = new Map();
const sessionStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};
function load(relative, dependencies = {}, mocks = {}) {
  const source = readFileSync(resolve(root, relative), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName: relative, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const mod = { exports: {} };
  const factory = vm.runInNewContext(`(function(module,exports,require){${outputText}\n})`, {
    crypto: webcrypto, sessionStorage, window: { sessionStorage },
    Buffer, Response, Request, TextEncoder, fetch: mocks.fetch,
    process: { env: { NODE_ENV: 'development' } },
  });
  factory(mod, mod.exports, (name) => {
    if (!(name in dependencies)) throw new Error(`Unmapped test dependency: ${name}`);
    return dependencies[name];
  });
  return mod.exports;
}

const product = load('components/shop/product-detail-data.ts');
const jalali = load('lib/date/jalali.ts');
const iranCities = load('lib/locations/iran-cities.ts');
const globalCities = load('lib/locations/global-cities.ts');
const cities = load('lib/locations/cities.ts', {
  '@/lib/locations/iran-cities': iranCities, '@/lib/locations/global-cities': globalCities,
});
const civilTime = load('lib/shop/shop-civil-time.ts');
const moment = load('lib/shop/shop-personalization.ts', {
  '@/lib/date/jalali': jalali, '@/lib/locations/cities': cities, './shop-civil-time': civilTime,
});
const cart = load('components/shop/shop-cart.ts', {
  './product-detail-data': product, '@/lib/shop/shop-personalization': moment,
  '@/lib/locations/cities': cities,
});
const shipping = load('components/shop/shop-checkout-state.ts');
const quote = load('lib/shop/shop-quote.ts', {
  '@/components/shop/product-detail-data': product,
  '@/components/shop/shop-checkout-state': shipping,
});
const orderNumber = load('lib/shop/shop-order-number.ts');
const contract = load('lib/shop/shop-order-contract.ts', {
  'node:crypto': { createHash },
  '@/components/shop/shop-cart': cart,
  '@/components/shop/shop-checkout-state': shipping,
  './shop-quote': quote,
  './shop-order-number': orderNumber,
});
const details = { calendar: 'jalali', date: '1403/08/15', time: '', city: '', names: 'آزمایش', message: '' };
const item = { key: 'fixed-order-key', productId: 'p01', size: '20x30', quantity: 2, details };
const address = { ...shipping.blankShipping, name: 'نام آزمایشی', mobile: '9123456789',
  province: 'تهران', city: 'تهران', address: 'خیابان آزمایشی، کوچه آسمان، پلاک ۳',
  postalCode: '1234567890', note: '', carrier: 'post' };
const payload = {
  items: [item], shipping: address, expectedTotal: 3_298_000,
  idempotencyKey: '28cdd805-a6a7-4215-9777-0b13558a0e2d',
  guestAccessCode: '7f'.repeat(32),
};
const draft = contract.parseShopOrderDraft(payload);
assert.equal(draft.quote.total, 3_298_000);
assert.equal(draft.shipping.mobile, '9123456789');
assert.equal(draft.idempotencyHash, createHash('sha256').update(payload.idempotencyKey).digest('hex'));
assert.equal(draft.guestAccessHash, createHash('sha256').update(payload.guestAccessCode).digest('hex'));
assert.equal(contract.parseShopOrderDraft({ ...payload, items: [{ ...item, price: 1 }] }).quote.total, 3_298_000);
for (const invalid of [
  { ...payload, expectedTotal: 1 }, { ...payload, items: [] },
  { ...payload, shipping: { ...address, mobile: '912345678900' } },
  { ...payload, shipping: { ...address, postalCode: '123' } },
  { ...payload, guestAccessCode: 'short' },
  { ...payload, items: [{ ...item, quantity: 100 }] },
  { ...payload, items: [item, item] },
  { ...payload, items: [{ ...item, details: { ...details, date: '1400/12/30' } }] },
  { ...payload, items: [{ ...item, details: { ...details, calendar: 'gregorian', date: '2023-02-29' } }] },
  { ...payload, items: [{ ...item, productId: 'p02', details: {
    ...details, time: '12:00', city: 'تهران', cityId: 'de-berlin',
  } }] },
]) assert.throws(() => contract.parseShopOrderDraft(invalid));
assert.deepEqual({ ...contract.parseTransferEvidence({ reference: '۱۲۳۴', time: '' }) }, { reference: '1234', time: null });
assert.deepEqual({ ...contract.parseTransferEvidence({ reference: '', time: '13:05' }) }, { reference: null, time: '13:05' });
for (const evidence of [{}, { reference: 'abc' }, { time: '24:00' }, { reference: '1'.repeat(51) }]) {
  assert.throws(() => contract.parseTransferEvidence(evidence));
}
assert.equal(contract.parseGuestAccess({ orderNumber: '۱۲۳', accessCode: payload.guestAccessCode }).orderNumber, '123');
assert.throws(() => contract.parseGuestAccess({ orderNumber: '123', accessCode: 'guess' }));
const maxOrderNumber = '9223372036854775807';
assert.equal(orderNumber.isValidShopOrderNumber(maxOrderNumber), true);
assert.equal(orderNumber.isValidShopOrderNumber('9223372036854775808'), false);
assert.equal(orderNumber.isValidShopOrderNumber('0009'), false);
assert.equal(orderNumber.isValidShopOrderNumber('9007199254740993'), true);
assert.equal(orderNumber.formatShopInteger('9007199254740993'),
  new Intl.NumberFormat('fa-IR').format(9007199254740993n));
assert.notEqual(orderNumber.formatShopInteger('9007199254740993'),
  new Intl.NumberFormat('fa-IR').format(Number('9007199254740993')));
assert.equal(orderNumber.formatShopInteger(1_699_000),
  new Intl.NumberFormat('fa-IR').format(1_699_000));
assert.equal(contract.parseGuestAccess({ orderNumber: maxOrderNumber, accessCode: payload.guestAccessCode }).orderNumber,
  maxOrderNumber);
assert.throws(() => contract.parseGuestAccess({ orderNumber: '9223372036854775808', accessCode: payload.guestAccessCode }));

let requests = [];
const fakeFetch = async (path, options) => {
  const body = JSON.parse(options.body);
  requests.push({ path, body, method: options.method });
  if (path === '/api/shop/orders') return Response.json({ ok: true, orderNumber: '1842' }, { status: 201 });
  if (path.endsWith('/track')) return Response.json({ ok: true, order: {
    orderNumber: '1842', status: 'awaiting_transfer', totalToman: 3_298_000, events: [],
  } });
  if (path.endsWith('/transfer')) return Response.json({ ok: true, status: 'transfer_declared' });
  if (path.endsWith('/cancel')) return Response.json({ ok: true, status: 'canceled' });
  throw new Error('Unexpected path');
};
const client = load('components/shop/shop-order-client.ts', {
  '@/lib/shop/shop-order-number': orderNumber,
}, { fetch: fakeFetch });
const receipt = await client.createShopOrderRequest([item], address, 3_298_000);
assert.equal(receipt.orderNumber, '1842');
assert.equal(receipt.accessCode.length, 64);
const persistedIntent = JSON.parse(storage.get('halleus.shop.order.intent.v1'));
assert.match(persistedIntent.fingerprint, /^[a-f0-9]{64}$/, 'persist a digest, not a raw shipping record');
for (const privateValue of [address.name, address.mobile, address.address, address.postalCode]) {
  assert.equal(storage.get('halleus.shop.order.intent.v1').includes(privateValue), false,
    'private shipping field must not appear in stored idempotency intent');
}
assert.equal(requests[0].body.expectedTotal, 3_298_000);
assert.equal(requests[0].body.shipping.address, address.address);
const repeat = await client.createShopOrderRequest([item], address, 3_298_000);
assert.equal(repeat.accessCode, receipt.accessCode);
assert.equal(requests[0].body.idempotencyKey, requests[1].body.idempotencyKey);
assert.equal(storage.get('halleus.shop.order.intent.v1').includes('shipping'), false);
assert.equal(storage.get('halleus.shop.order.intent.v1').includes('fingerprint'), true);
await client.createShopOrderRequest([item], { ...address, address: address.address + ' تغییر' }, 3_298_000);
assert.notEqual(requests[2].body.idempotencyKey, requests[1].body.idempotencyKey,
  'changed shipping must not replay an old idempotent order');
client.rememberShopOrderReceipt(receipt);
assert.equal(JSON.stringify(client.readShopOrderReceipt()), JSON.stringify(receipt));
assert.equal((await client.fetchShopOrder(receipt)).status, 'awaiting_transfer');
await client.submitShopTransfer(receipt, '123456', '');
await client.cancelShopOrder(receipt);
assert.equal(requests.at(-1).path, '/api/shop/orders/cancel');
assert.equal(requests.at(-1).body.accessCode, receipt.accessCode);
const receiptFile = client.formatShopOrderReceipt(receipt);
assert.match(receiptFile, /https:\/\/halleus\.ir\/shop\/track/);
assert.ok(receiptFile.includes(receipt.orderNumber));
assert.ok(receiptFile.includes(receipt.accessCode));
assert.throws(() => client.formatShopOrderReceipt({ orderNumber: '1', accessCode: 'invalid' }));
assert.ok(client.formatShopOrderReceipt({ orderNumber: maxOrderNumber, accessCode: receipt.accessCode }).includes(maxOrderNumber));
assert.throws(() => client.formatShopOrderReceipt({ orderNumber: '9223372036854775808', accessCode: receipt.accessCode }));
const paymentSource = readFileSync(resolve(root, 'components/shop/ShopCheckoutFlow.tsx'), 'utf8');
const ownerSource = readFileSync(resolve(root, 'components/admin/ShopOrdersWorkspace.tsx'), 'utf8');
assert.equal((paymentSource.match(/formatShopInteger\(order\.orderNumber\)/g) ?? []).length, 3);
assert.doesNotMatch(paymentSource, /Number\(order\.orderNumber\)/);
assert.match(ownerSource, /function formatNumber\(value: number \| string\) \{ return formatShopInteger\(value\); \}/);
storage.set('halleus.shop.order.receipt.v1', '{broken json');
assert.equal(client.readShopOrderReceipt(), null);
storage.set('halleus.shop.order.intent.v1', JSON.stringify({
  fingerprint: JSON.stringify({ items: [item], shipping: address }), savedAt: Date.now(),
  idempotencyKey: 'legacy-intent', guestAccessCode: 'legacy-secret',
}));
client.clearLegacyShopOrderIntent();
assert.equal(storage.has('halleus.shop.order.intent.v1'), false, 'erase legacy plaintext shipping intent');
storage.set('halleus.shop.order.intent.v1', '{bad json');
client.clearLegacyShopOrderIntent();
assert.equal(storage.has('halleus.shop.order.intent.v1'), false, 'erase invalid legacy intent');

for (const route of [
  'app/api/shop/orders/route.ts', 'app/api/shop/orders/track/route.ts',
  'app/api/shop/orders/transfer/route.ts', 'app/api/shop/orders/cancel/route.ts',
]) {
  const source = readFileSync(resolve(root, route), 'utf8');
  assert.match(source, /shopClosed\(\)/);
  assert.match(source, /readShopRequest\(/);
}
const migration = readFileSync(resolve(root, 'database/migrations/0032_private_shop_orders_shared_numbers.sql'), 'utf8');
assert.match(migration, /shared_display_numbers_seq/);
assert.match(migration, /halleus_reports_shared_display_number/);
assert.match(migration, /enable row level security/g);
assert.match(migration, /shop_order_events_no_delete/);
const adminRoute = readFileSync(resolve(root, 'app/api/admin/shop/orders/[id]/route.ts'), 'utf8');
assert.match(adminRoute, /actor\.role !== 'owner'/);
assert.match(adminRoute, /assertAdminMutationRequest/);
console.log('Shop orders: canonical amounts, tamper rejection, private code, idempotent client intent, guest operations, owner controls and production locks passed.');
