import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import * as astronomy from 'astronomy-engine';

const root = resolve(import.meta.dirname, '..');
const runtimeEnv = { NODE_ENV: 'development' };

function load(relativePath, dependencies = {}) {
  const source = readFileSync(resolve(root, relativePath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName: relativePath,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const mod = { exports: {} };
  const factory = vm.runInNewContext(`(function(module,exports,require){${outputText}\n})`, {
    Response, Request, Date, Buffer, Uint8Array, process: { env: runtimeEnv },
  });
  factory(mod, mod.exports, (name) => {
    if (!(name in dependencies)) throw new Error(`Unexpected test dependency ${name}`);
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
const catalog = load('src/lib/chart/fixed-star-catalog.ts', {
  'astronomy-engine': astronomy,
  './normalized-chart': { normalizeChartPlacement: () => { throw new Error('Not used by shop proof'); } },
});
const sky = load('lib/shop/shop-sky-stars.ts', {
  'astronomy-engine': astronomy,
  '@/src/lib/chart/fixed-star-catalog': catalog,
});
const orderNumber = load('lib/shop/shop-order-number.ts');
const moonEphemeris = load('lib/shop/shop-moon-ephemeris.ts', { 'astronomy-engine': astronomy });
const designZip = load('lib/shop/shop-design-handoff-zip.ts', {
  './shop-moon-ephemeris': moonEphemeris,
});
const handoff = load('lib/shop/shop-print-handoff.ts', {
  '@/components/shop/shop-cart': cart, './shop-personalization': moment, './shop-print-spec': printSpec,
  '@/lib/locations/cities': cities, './shop-sky-stars': sky,
  './shop-order-number': orderNumber,
});

const item = {
  key: 'print-line-01', productId: 'p01', size: '20x30', quantity: 2,
  details: { calendar: 'jalali', date: '1403/08/15', time: '', city: '', names: 'نام خصوصی', message: 'پیام خصوصی' },
};
const order = {
  display_number: '920', status: 'payment_verified', items: [item],
  recipient_mobile: '+989121234567', address: 'خیابان کاملاً خصوصی',
  transfer_reference: '12344321', guest_access_hash: 'never-include-secret',
};
const result = handoff.buildPrivateShopPrintHandoff(order);
assert.equal(result.orderNumber, '920');
assert.equal(result.documentKind, 'production-brief-not-print-ready-artwork');
assert.equal(result.prints[0].quantity, 2);
assert.equal(result.prints[0].sizeCm, '20x30');
assert.deepEqual(JSON.parse(JSON.stringify(result.prints[0].prepressRequirements.minimumNativePixels)), { width: 2363, height: 3544 });
assert.equal(result.prints[0].personalization.message, 'پیام خصوصی');
assert.equal(result.prints[0].personalization.gregorianDate, '2024-11-05');
assert.equal(result.prints[0].printArtworkReady, false);
assert.equal(result.prints[0].birthSkyReference, null);
assert.deepEqual(JSON.parse(JSON.stringify(result.prints[0].moonReference)), {
  source: 'local-noon-asia-tehran', timezone: 'Asia/Tehran', localTime: '12:00',
  gregorianDate: '2024-11-05', referenceUtc: '2024-11-05T08:30:00.000Z',
});
assert.equal(handoff.buildPrivateShopPrintHandoff({ ...order, display_number: '9223372036854775807' }).orderNumber,
  '9223372036854775807');
for (const display_number of ['9223372036854775808', '10000000000000000000', 9007199254740992]) {
  assert.throws(() => handoff.buildPrivateShopPrintHandoff({ ...order, display_number }));
}
const birthSkyItem = { ...item, productId: 'p02', details: {
  ...item.details, calendar: 'gregorian', date: '2024-07-01', time: '12:30',
  city: 'برلین، آلمان', cityId: 'de-berlin',
} };
assert.throws(() => handoff.buildPrivateShopPrintHandoff({ ...order, items: [birthSkyItem] }),
  'postponed P02 must not enter the first live print workflow');
const text = JSON.stringify(result);
for (const sensitive of ['+989121234567', 'خیابان کاملاً خصوصی', '12344321', 'never-include-secret']) {
  assert.ok(!text.includes(sensitive), `Unexpected sensitive field: ${sensitive}`);
}
const zipBytes = designZip.buildPrivateShopDesignHandoffZip(result);
if (process.env.HALLEUS_SHOP_HANDOFF_ZIP_QA_PATH) {
  writeFileSync(process.env.HALLEUS_SHOP_HANDOFF_ZIP_QA_PATH, zipBytes, { flag: 'wx', mode: 0o600 });
}
assert.equal(zipBytes.readUInt32LE(0), 0x04034b50);
assert.equal(zipBytes.readUInt32LE(zipBytes.length - 22), 0x06054b50);
assert.ok(zipBytes.includes(Buffer.from('manual-design-handoff.v1')));
assert.ok(zipBytes.includes(Buffer.from('نام خصوصی')));
assert.ok(zipBytes.includes(Buffer.from('illuminatedFraction')));
for (const sensitive of ['+989121234567', 'خیابان کاملاً خصوصی', '12344321', 'never-include-secret']) {
  assert.ok(!zipBytes.includes(Buffer.from(sensitive)), `ZIP includes forbidden data: ${sensitive}`);
}
assert.deepEqual(designZip.buildPrivateShopDesignHandoffZip(result), zipBytes, 'ZIP must be repeatable.');
const syntheticOrder = {
  display_number: '1', status: 'payment_verified',
  items: ['10x15', '20x30', '30x45'].map((size) => ({
    ...item, key: `synthetic-${size}`, size, quantity: 1,
    details: { ...item.details, names: 'نام نمونه', message: '' },
  })),
};
const syntheticHandoff = handoff.buildPrivateShopPrintHandoff(syntheticOrder);
assert.equal(syntheticHandoff.prints.length, 3);
const syntheticZip = designZip.buildPrivateShopDesignHandoffZip(syntheticHandoff, { sampleOnly: true });
assert.ok(syntheticZip.includes(Buffer.from('"sampleOnly": true')));
assert.ok(syntheticZip.includes(Buffer.from('"orderNumber": null')));
assert.ok(syntheticZip.includes(Buffer.from('"lineCount": 3')));
assert.ok(syntheticZip.includes(Buffer.from('"artworkGenerated": false')));
assert.ok(!syntheticZip.includes(Buffer.from('"orderNumber": "1"')));
for (const status of ['awaiting_transfer', 'transfer_declared', 'payment_rejected', 'cancel_requested', 'canceled']) {
  assert.throws(() => handoff.buildPrivateShopPrintHandoff({ ...order, status }));
}
for (const bad of [[], [{ ...item, size: '999x999' }], [item, item]]) {
  assert.throws(() => handoff.buildPrivateShopPrintHandoff({ ...order, items: bad }));
}
assert.equal(handoff.buildPrivateShopPrintHandoff({ ...order, status: 'preparing' }).prints.length, 1);
for (const invalid of [null, [], {}, { ...order, display_number: 'order-920' }, { ...order, items: null }]) {
  assert.throws(() => handoff.buildPrivateShopPrintHandoff(invalid));
}

const route = readFileSync(resolve(root, 'app/api/admin/shop/orders/[id]/print/route.ts'), 'utf8');
for (const required of [
  /!isShopMvpActive\(\)/,
  /requireAdminCapability\(request, 'shop_orders\.read'\)/,
  /actor\.role !== 'owner'/,
  /recordAdminAuditEvent/,
  /application\/zip/,
  /private, no-store/,
  /X-Content-Type-Options/,
]) assert.match(route, required);

let role = 'owner';
let auditCalls = 0;
let auditFailure = false;
let databaseReads = 0;
let stored = order;
const api = load('app/api/admin/shop/orders/[id]/print/route.ts', {
  '@/lib/shop/shop-mvp-activation': { isShopMvpActive: () => runtimeEnv.NODE_ENV !== 'production' },
  '@/lib/admin/admin-auth': { requireAdminCapability: async () => ({ role, userId: 'owner-id' }) },
  '@/lib/admin/admin-http': {
    noStoreJsonResponse: (body, status = 200) => Response.json(body, { status }),
    adminErrorResponse: () => Response.json({ ok: false }, { status: 503 }),
  },
  '@/lib/admin/admin-service': { recordAdminAuditEvent: async () => {
    auditCalls++;
    if (auditFailure) throw new Error('No audit available');
  } },
  '@/lib/shop/shop-print-handoff': handoff,
  '@/lib/shop/shop-design-handoff-zip': designZip,
  // GET handoff never invokes the owner-only JPG POST path; that path has its own focused guard.
  '@/lib/shop/shop-manual-print-archive': {},
  '@/lib/shop/shop-order-store': { getAdminShopOrder: async () => { databaseReads++; return stored; } },
});
const id = 'f8d1143a-1c64-4c01-bdb8-928a1c19b6e7';
const get = () => api.GET(new Request(`http://localhost/api/admin/shop/orders/${id}/print`), {
  params: Promise.resolve({ id }),
});

runtimeEnv.NODE_ENV = 'production';
assert.equal((await get()).status, 404);
assert.equal(databaseReads, 0);
runtimeEnv.NODE_ENV = 'development';
role = 'admin';
assert.equal((await get()).status, 403);
assert.equal(databaseReads, 0);
role = 'owner';
stored = { ...order, status: 'transfer_declared' };
assert.equal((await get()).status, 409);
assert.equal(auditCalls, 0);
stored = order;
const validResponse = await get();
assert.equal(validResponse.status, 200);
assert.equal(validResponse.headers.get('cache-control'), 'private, no-store, max-age=0');
assert.equal(validResponse.headers.get('x-content-type-options'), 'nosniff');
assert.match(validResponse.headers.get('content-disposition'), /920-design-handoff\.zip/);
assert.equal(validResponse.headers.get('content-type'), 'application/zip');
const downloaded = Buffer.from(await validResponse.arrayBuffer());
assert.deepEqual(downloaded, zipBytes);
assert.equal(auditCalls, 1);
auditFailure = true;
assert.equal((await get()).status, 503);
assert.equal(auditCalls, 2);

const client = readFileSync(resolve(root, 'components/shop/shop-order-client.ts'), 'utf8');
assert.match(client, /formatShopOrderReceipt/);
assert.match(client, /downloadShopOrderReceipt/);
assert.match(client, /URL\.createObjectURL/);
assert.match(client, /\.access\.txt|access\.txt/);

// V1 must not expose the legacy image-rendering endpoints, even to an owner
// who knows their URLs. The pure renderer tests remain independent.
const actualMode = load('lib/shop/shop-artwork-mode.ts');
assert.equal(actualMode.isShopAutomaticArtworkEnabled(), false);
for (const file of [
  'app/api/admin/shop/orders/[id]/print/preview/route.ts',
  'app/api/admin/shop/orders/[id]/print/candidate/route.ts',
]) {
  const imports = ts.preProcessFile(readFileSync(resolve(root, file), 'utf8'), true, true)
    .importedFiles.map((entry) => entry.fileName);
  const dependencies = Object.fromEntries(imports.map((name) => [name, {}]));
  dependencies['@/lib/shop/shop-artwork-mode'] = actualMode;
  dependencies['@/lib/admin/admin-http'] = {
    noStoreJsonResponse: (body, status = 200) => Response.json(body, { status }),
  };
  const disabled = load(file, dependencies);
  const context = { params: Promise.resolve({ id }) };
  assert.equal((await disabled.GET(new Request(`http://localhost/${file}`), context)).status, 404);
  if (disabled.POST) {
    assert.equal((await disabled.POST(new Request(`http://localhost/${file}`, { method: 'POST' }), context)).status, 404);
  }
}
const adminWorkspace = readFileSync(resolve(root, 'components/admin/ShopOrdersWorkspace.tsx'), 'utf8');
assert.match(adminWorkspace, /design-handoff\.zip/);
assert.doesNotMatch(adminWorkspace, /downloadNativePrintCandidate|downloadArtworkProof|print\/candidate|print\/preview/);

console.log('Shop print handoff: payment gate, private fields, product metadata, artwork-not-ready boundary, owner/audit route and guest receipt export passed.');
