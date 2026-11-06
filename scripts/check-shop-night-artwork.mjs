import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import sharp from 'sharp';
import * as astronomy from 'astronomy-engine';

const root = resolve(import.meta.dirname, '..');
const runtimeEnv = { NODE_ENV: 'development' };

function load(relativePath, dependencies = {}) {
  const source = readFileSync(resolve(root, relativePath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName: relativePath,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const record = { exports: {} };
  vm.runInNewContext(`(function(module,exports,require){${outputText}\n})`, {
    Date, Buffer, Request, Response, URL, Uint8Array,
    process: { env: runtimeEnv, cwd: () => root },
  })(record, record.exports, (name) => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`);
    return dependencies[name];
  });
  return record.exports;
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
  './normalized-chart': { normalizeChartPlacement: () => { throw new Error('Unused'); } },
});
const skyStars = load('lib/shop/shop-sky-stars.ts', {
  'astronomy-engine': astronomy, '@/src/lib/chart/fixed-star-catalog': starCatalog,
});
const orderNumber = load('lib/shop/shop-order-number.ts');
const handoff = load('lib/shop/shop-print-handoff.ts', {
  '@/components/shop/shop-cart': cart, './shop-personalization': moment,
  './shop-print-spec': printSpec, '@/lib/locations/cities': cities,
  './shop-sky-stars': skyStars, './shop-order-number': orderNumber,
});
const text = load('lib/shop/shop-artwork-text.ts', { './shop-print-handoff': handoff });
const sourcePath = resolve(root, 'assets/shop-print/p03-milky-way-proof-v1.webp');
let backgroundReads = 0;
let missingFile = false;
const night = load('lib/shop/shop-night-artwork.ts', {
  'node:fs/promises': { readFile: async (path) => {
    backgroundReads++;
    assert.equal(path, sourcePath, 'Only the pinned P03 proof may be read.');
    if (missingFile) throw new Error('External proof asset unavailable');
    return readFileSync(sourcePath);
  } },
  'node:path': { join },
  sharp,
  './shop-print-handoff': handoff,
  './shop-artwork-text': text,
  './shop-print-spec': printSpec,
});

const item = {
  key: 'night-line', productId: 'p03', size: '20x30', quantity: 3,
  details: {
    calendar: 'jalali', date: '1403/08/15', time: '', city: '', cityId: '',
    names: 'نام آزمایشی اول و دوم', message: 'این یک پیام آزمایشی است',
  },
};
const order = {
  display_number: '932', status: 'payment_verified', items: [item],
  recipient_mobile: '+989120000000', address: 'نشانی ساختگی', transfer_reference: 'bank-fixture',
  guest_access_hash: 'synthetic-secret-never-include',
};

const proof = await night.buildPrivateShopNightArtworkProof(order, 1);
assert.equal(proof.format, 'halleus.private.p03-night-proof.v1');
assert.equal(proof.productId, 'p03');
assert.equal(proof.orderNumber, '932');
assert.equal(proof.quantity, 3);
assert.equal(proof.sizeCm, '20x30');
assert.deepEqual(JSON.parse(JSON.stringify(proof.nativePixels)), { width: 1024, height: 1536 });
assert.deepEqual(JSON.parse(JSON.stringify(proof.minimumNativePixels)), { width: 2363, height: 3544 });
assert.equal(proof.printArtworkReady, false);
assert.equal(proof.retainedOnServer, false);
assert.match(proof.claim, /artistic.*not-time-location-reconstruction/);
const raster = await sharp(proof.bytes).metadata();
assert.equal(raster.format, 'png');
assert.equal(raster.width, 1024);
assert.equal(raster.height, 1536);
assert.equal(raster.channels, 3);
assert.equal(raster.space, 'srgb');
assert.equal(printSpec.checkShopRasterPrepress({
  productId: 'p03', size: '10x15', width: raster.width, height: raster.height,
  channels: raster.channels, space: raster.space, isApprovedFinalMaster: false,
}).readyToPrint, false);
const originalTop = await sharp(sourcePath).extract({ left: 0, top: 0, width: 512, height: 720 }).raw().toBuffer();
const proofTop = await sharp(proof.bytes).extract({ left: 0, top: 0, width: 512, height: 720 }).raw().toBuffer();
assert.deepEqual(proofTop, originalTop, 'Keep the approved-looking gallery composition intact.');
const same = await night.buildPrivateShopNightArtworkProof(order, 1);
assert.deepEqual(same.bytes, proof.bytes);
const changed = await night.buildPrivateShopNightArtworkProof({
  ...order, items: [{ ...item, details: { ...item.details, names: 'نام ساختگی متفاوت' } }],
}, 1);
assert.notDeepEqual(changed.bytes, proof.bytes);
const clean = await night.buildPrivateShopNightArtworkProof({
  ...order, items: [{ ...item, details: { ...item.details, names: '', date: '', message: '' } }],
}, 1);
assert.equal((await sharp(clean.bytes).metadata()).width, 1024);
for (const status of ['awaiting_transfer', 'transfer_declared', 'payment_rejected', 'cancel_requested', 'canceled']) {
  await assert.rejects(() => night.buildPrivateShopNightArtworkProof({ ...order, status }, 1));
}
for (const line of [0, 2, -1, NaN, 1.5]) {
  await assert.rejects(() => night.buildPrivateShopNightArtworkProof(order, line));
}
await assert.rejects(() => night.buildPrivateShopNightArtworkProof({
  ...order, items: [{ ...item, productId: 'p01' }],
}, 1));
for (const bad of ['\u0000bad', '\ud800', '\u202ebidi', 'bad\nline']) {
  await assert.rejects(() => night.buildPrivateShopNightArtworkProof({
    ...order, items: [{ ...item, details: { ...item.details, message: bad } }],
  }, 1));
}
for (const unsafe of ['<script>evil</script>', '<svg onload="evil">', '& < > "']) {
  const encoded = text.xmlShopArtworkText(unsafe);
  assert.ok(!encoded.includes('<script>') && !encoded.includes('<svg onload='));
  assert.match(encoded, /&lt;/);
  const customerProof = await night.buildPrivateShopNightArtworkProof({
    ...order, items: [{ ...item, details: { ...item.details, message: unsafe } }],
  }, 1);
  assert.equal((await sharp(customerProof.bytes).metadata()).format, 'png');
}
missingFile = true;
await assert.rejects(() => night.buildPrivateShopNightArtworkProof(order, 1), /unavailable/);
missingFile = false;
assert.ok(backgroundReads >= 5);

let role = 'owner';
let reads = 0;
let audits = [];
let stored = order;
let failedAudit = false;
const route = load('app/api/admin/shop/orders/[id]/print/preview/route.ts', {
  '@/lib/admin/admin-auth': { requireAdminCapability: async () => ({ role, userId: 'synthetic-owner' }) },
  '@/lib/admin/admin-http': {
    noStoreJsonResponse: (body, status = 200) => Response.json(body, { status }),
    adminErrorResponse: () => Response.json({ ok: false }, { status: 503 }),
  },
  '@/lib/admin/admin-service': { recordAdminAuditEvent: async (event) => {
    audits.push(event);
    if (failedAudit) throw new Error('Audit failed');
  } },
  '@/lib/shop/shop-private-artwork': { buildPrivateShopSkyArtworkProof: () => { throw new Error('Wrong product route'); } },
  '@/lib/shop/shop-private-moon-artwork': { buildPrivateShopMoonArtworkProof: async () => { throw new Error('P01 has its own guard'); } },
  '@/lib/shop/shop-night-artwork': night,
  '@/lib/shop/shop-print-handoff': handoff,
  '@/lib/shop/shop-order-store': { getAdminShopOrder: async () => { reads++; return stored; } },
});
const id = 'f8d1143a-1c64-4c01-bdb8-928a1c19b6e7';
const get = () => route.GET(new Request(`http://localhost/api/admin/shop/orders/${id}/print/preview?line=1`), {
  params: Promise.resolve({ id }),
});
runtimeEnv.NODE_ENV = 'production';
assert.equal((await get()).status, 404);
assert.equal(reads, 0);
runtimeEnv.NODE_ENV = 'development';
role = 'admin';
assert.equal((await get()).status, 403);
assert.equal(reads, 0);
role = 'owner';
stored = { ...order, status: 'transfer_declared' };
assert.equal((await get()).status, 409);
stored = order;
const response = await get();
assert.equal(response.status, 200);
assert.equal(response.headers.get('content-type'), 'image/png');
assert.match(response.headers.get('content-disposition'), /932-p03-line-1-proof\.png/);
assert.equal(response.headers.get('cache-control'), 'private, no-store, max-age=0');
assert.match(response.headers.get('content-security-policy'), /default-src 'none'; sandbox/);
assert.equal((await sharp(Buffer.from(await response.arrayBuffer())).metadata()).format, 'png');
assert.equal(audits.length, 1);
assert.equal(audits[0].afterSummary.productId, 'p03');
assert.ok(!JSON.stringify(audits).includes(item.details.names));
failedAudit = true;
assert.equal((await get()).status, 503);

const ui = readFileSync(resolve(root, 'components/admin/ShopOrdersWorkspace.tsx'), 'utf8');
assert.match(ui, /\['p01', 'p02', 'p03'\]\.includes\(item\.productId\)/);
assert.match(ui, /downloadArtworkProof\(index \+ 1\)/);
const source = readFileSync(resolve(root, 'lib/shop/shop-night-artwork.ts'), 'utf8');
assert.doesNotMatch(source, /(?:writeFile|createWriteStream|mkdir|public\/shop-preview)/);
console.log('Shop P03 private night proof: same gallery image, private optional text, 1024x1536 RGB source, strict no-print/owner/payment/audit and memory-only PNG passed.');

if (process.argv.includes('--render-synthetic-preview')) {
  const path = '/tmp/halleus-p03-synthetic-night-proof.png';
  const output = await sharp(proof.bytes).toFile(path);
  console.log('Synthetic visual preview:', path, output.width, output.height);
}
