import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import sharp from 'sharp';
import * as astronomy from 'astronomy-engine';

const root = resolve(import.meta.dirname, '..');
const runtimeEnv = { NODE_ENV: 'development' };
function load(file, dependencies = {}) {
  const source = readFileSync(resolve(root, file), 'utf8');
  const js = ts.transpileModule(source, { fileName: file, compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(`(function(module,exports,require){${js}\n})`, {
    Date, Buffer, Uint8Array, URL, Request, Response,
    process: { cwd: () => root, env: runtimeEnv },
  })(mod, mod.exports, (name) => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency in ${file}: ${name}`);
    return dependencies[name];
  });
  return mod.exports;
}

const products = load('components/shop/product-detail-data.ts');
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
  './product-detail-data': products, '@/lib/shop/shop-personalization': moment,
  '@/lib/locations/cities': cities,
});
const printSpec = load('lib/shop/shop-print-spec.ts', { '@/components/shop/product-detail-data': products });
const starCatalog = load('src/lib/chart/fixed-star-catalog.ts', {
  'astronomy-engine': astronomy,
  './normalized-chart': { normalizeChartPlacement: () => { throw new Error('Unneeded'); } },
});
const stars = load('lib/shop/shop-sky-stars.ts', {
  'astronomy-engine': astronomy, '@/src/lib/chart/fixed-star-catalog': starCatalog,
});
const orderNumber = load('lib/shop/shop-order-number.ts');
const handoff = load('lib/shop/shop-print-handoff.ts', {
  '@/components/shop/shop-cart': cart, './shop-personalization': moment,
  './shop-print-spec': printSpec, './shop-order-number': orderNumber,
  '@/lib/locations/cities': cities, './shop-sky-stars': stars,
});
const artworkText = load('lib/shop/shop-artwork-text.ts', { './shop-print-handoff': handoff });
const ephemeris = load('lib/shop/shop-moon-ephemeris.ts', { 'astronomy-engine': astronomy });
const sourcePath = resolve(root, 'public/halleus-visuals/moon-apollo11.webp');
let sourceReads = 0;
const moon = load('lib/shop/shop-moon-artwork.ts', {
  'node:fs/promises': { readFile: async (path) => {
    sourceReads++;
    assert.equal(path, sourcePath, 'Moon source must be pinned to the existing site proof.');
    return readFileSync(path);
  } },
  'node:path': { join }, sharp,
  './shop-moon-ephemeris': ephemeris, './shop-artwork-text': artworkText,
});
const privateMoon = load('lib/shop/shop-private-moon-artwork.ts', {
  './shop-moon-artwork': moon, './shop-print-handoff': handoff,
  './shop-print-spec': printSpec,
});

const item = {
  key: 'moon-01', productId: 'p01', size: '20x30', quantity: 2,
  details: {
    calendar: 'jalali', date: '1403/08/15', time: '', city: '', cityId: '',
    names: 'نام خصوصی', message: 'پیام خصوصی',
  },
};
const order = {
  display_number: '9223372036854775807', status: 'payment_verified', items: [item],
  recipient_mobile: '+989121234567', address: 'private synthetic address',
  guest_access_hash: 'never-expose-guest-secret', transfer_reference: '987654321',
};
const proof = await privateMoon.buildPrivateShopMoonArtworkProof(order, 1);
assert.equal(proof.productId, 'p01');
assert.equal(proof.lineNumber, 1);
assert.equal(proof.orderNumber, order.display_number);
assert.equal(proof.referenceUtc, '2024-11-05T08:30:00.000Z');
assert.equal(proof.quantity, 2);
assert.equal(proof.sizeCm, '20x30');
assert.deepEqual(JSON.parse(JSON.stringify(proof.minimumNativePixels)), { width: 2363, height: 3544 });
assert.equal(proof.source, 'existing-site-texture-not-cleared-native-master');
assert.equal(proof.printArtworkReady, false);
assert.equal(proof.retainedOnServer, false);
assert.match(proof.documentKind, /not-print-ready/);
const metadata = await sharp(proof.bytes).metadata();
assert.deepEqual({ format: metadata.format, width: metadata.width, height: metadata.height, space: metadata.space },
  { format: 'png', width: 1024, height: 1536, space: 'srgb' });
const beforeInvalid = sourceReads;
for (const invalid of [0, -1, 2, 1.2, NaN]) {
  await assert.rejects(() => privateMoon.buildPrivateShopMoonArtworkProof(order, invalid));
}
await assert.rejects(() => privateMoon.buildPrivateShopMoonArtworkProof({ ...order, items: [{ ...item, productId: 'p03' }] }, 1));
await assert.rejects(() => privateMoon.buildPrivateShopMoonArtworkProof({ ...order, status: 'transfer_declared' }, 1));
assert.equal(sourceReads, beforeInvalid, 'Reject wrong state/product before reading image bytes.');
const modified = await privateMoon.buildPrivateShopMoonArtworkProof({
  ...order, items: [{ ...item, details: { ...item.details, names: 'نام دیگر' } }],
}, 1);
assert.notDeepEqual(modified.bytes, proof.bytes);

let role = 'owner';
let databaseReads = 0;
let auditCalls = 0;
let auditFailure = false;
let stored = order;
const route = load('app/api/admin/shop/orders/[id]/print/preview/route.ts', {
  '@/lib/shop/shop-artwork-mode': { isShopAutomaticArtworkEnabled: () => true },
  '@/lib/admin/admin-auth': { requireAdminCapability: async () => ({ role, userId: 'synthetic-owner' }) },
  '@/lib/admin/admin-http': {
    noStoreJsonResponse: (body, status = 200) => Response.json(body, { status }),
    adminErrorResponse: () => Response.json({ ok: false }, { status: 503 }),
  },
  '@/lib/admin/admin-service': { recordAdminAuditEvent: async (event) => {
    auditCalls++;
    assert.equal(event.afterSummary.productId, 'p01');
    assert.equal(event.afterSummary.printArtworkReady, false);
    if (auditFailure) throw new Error('Audit store unavailable');
  } },
  '@/lib/shop/shop-private-moon-artwork': privateMoon,
  '@/lib/shop/shop-private-artwork': { buildPrivateShopSkyArtworkProof: () => { throw new Error('Unexpected P02 renderer'); } },
  '@/lib/shop/shop-night-artwork': { buildPrivateShopNightArtworkProof: async () => { throw new Error('Unexpected P03 renderer'); } },
  '@/lib/shop/shop-print-handoff': handoff,
  '@/lib/shop/shop-order-store': { getAdminShopOrder: async () => { databaseReads++; return stored; } },
});
const id = 'f8d1143a-1c64-4c01-bdb8-928a1c19b6e7';
const get = (query = '?line=1') => route.GET(
  new Request(`http://localhost/api/admin/shop/orders/${id}/print/preview${query}`),
  { params: Promise.resolve({ id }) },
);
runtimeEnv.NODE_ENV = 'production';
assert.equal((await get()).status, 404);
assert.equal(databaseReads, 0);
runtimeEnv.NODE_ENV = 'development';
role = 'admin';
assert.equal((await get()).status, 403);
assert.equal(databaseReads, 0);
role = 'owner';
for (const query of ['?line=0', '?line=1&line=1', '?line=01', '?line=1&debug=x']) {
  assert.equal((await get(query)).status, 400);
}
stored = { ...order, status: 'awaiting_transfer' };
assert.equal((await get()).status, 409);
stored = order;
const response = await get();
assert.equal(response.status, 200);
assert.equal(response.headers.get('content-type'), 'image/png');
assert.equal(response.headers.get('cache-control'), 'private, no-store, max-age=0');
assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
assert.match(response.headers.get('content-disposition'), /p01-line-1-proof\.png/);
assert.match(response.headers.get('content-security-policy'), /default-src 'none'; sandbox/);
const image = Buffer.from(await response.arrayBuffer());
assert.deepEqual(image, proof.bytes);
assert.equal(auditCalls, 1);
for (const secret of [order.recipient_mobile, order.address, order.guest_access_hash]) {
  assert.ok(!JSON.stringify(response.headers).includes(secret));
}
auditFailure = true;
assert.equal((await get()).status, 503);
assert.equal(auditCalls, 2);

const ui = readFileSync(resolve(root, 'components/admin/ShopOrdersWorkspace.tsx'), 'utf8');
assert.match(ui, /\['p01', 'p02', 'p03'\]\.includes\(item\.productId\)/);
assert.match(ui, /productId === 'p02' \? 'svg' : 'png'/);
const wrapper = readFileSync(resolve(root, 'lib/shop/shop-private-moon-artwork.ts'), 'utf8');
assert.doesNotMatch(wrapper, /(?:writeFile|createWriteStream|mkdir|public\/shop-preview)/);
console.log('Shop P01 private noon proof: owner-only, exact UTC, real PNG, privacy, payment/audit gate, no-store, non-print and no-retention passed.');
