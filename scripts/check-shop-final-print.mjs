import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import sharp from 'sharp';
// This test renders several distinct native artworks in one process; avoid
// holding libvips decoded pixel caches between independent assertions.
sharp.cache(false);
import * as astronomy from 'astronomy-engine';

const root = resolve(import.meta.dirname, '..');
const requireNode = createRequire(import.meta.url);
const cache = new Map();
const fixedStars = { normalizeChartPlacement: () => { throw new Error('Unused.'); } };
const runtimeEnv = { NODE_ENV: 'development' };
const mocks = {};

function load(relativePath) {
  const canonical = relativePath.replaceAll('\\', '/');
  if (cache.has(canonical)) return cache.get(canonical);
  if (canonical.endsWith('.json')) return JSON.parse(readFileSync(resolve(root, canonical), 'utf8'));
  const source = readFileSync(resolve(root, canonical), 'utf8');
  const js = ts.transpileModule(source, { fileName: canonical, compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText;
  const record = { exports: {} };
  cache.set(canonical, record.exports);
  const execute = vm.runInNewContext(`(function(module,exports,require){${js}\n})`, {
    Buffer, process: { cwd: () => root, env: runtimeEnv, platform: process.platform },
    Date, Request, Response, URL, Uint8Array,
  });
  execute(record, record.exports, (name) => {
    if (name in mocks) return mocks[name];
    if (name === 'sharp') return sharp;
    if (name === 'astronomy-engine') return astronomy;
    if (name.startsWith('node:')) return requireNode(name);
    if (name === './normalized-chart') return fixedStars;
    if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`);
    if (name.startsWith('.')) {
      const segment = join(canonical, '..', name).replaceAll('\\', '/');
      const file = resolve(root, segment).slice(root.length + 1);
      if (name.endsWith('.json')) return load(file);
      return load(`${file}.ts`);
    }
    throw new Error(`Unexpected dependency: ${canonical} -> ${name}`);
  });
  return record.exports;
}

const renderer = load('lib/shop/shop-final-print.ts');
const actualArtworkMode = load('lib/shop/shop-artwork-mode.ts');
assert.equal(actualArtworkMode.isShopAutomaticArtworkEnabled(), false);
const spec = load('lib/shop/shop-print-spec.ts');
assert.equal(spec.getShopPrintSpec('10x15').minimumSafeInsetPixels, 60);
assert.equal(spec.getShopPrintSpec('30x45').finalFormat, 'JPEG');
const personal = { calendar: 'gregorian', date: '2024-07-01', time: '12:30',
  city: 'برلین، آلمان', cityId: 'de-berlin', names: 'نام الف و ب', message: 'یک پیام آزمایشی' };
const item = { key: 'sky-01', productId: 'p02', size: '10x15', quantity: 1, details: personal };
const order = { display_number: '9223372036854775807', status: 'payment_verified', items: [item],
  address: 'private delivery address', recipient_mobile: 'private mobile',
  transfer_reference: 'private bank transfer' };

async function assertJpeg(candidate, size) {
  const metadata = await sharp(candidate.bytes).metadata();
  const expected = spec.getShopPrintSpec(size).minimumNativePixels;
  assert.equal(candidate.printArtworkReady, false);
  assert.equal(candidate.retainedOnServer, false);
  assert.equal(candidate.safeAreaMm, 5);
  assert.equal(candidate.finalFormat, 'JPEG');
  assert.deepEqual(JSON.parse(JSON.stringify(candidate.nativePixels)), JSON.parse(JSON.stringify(expected)));
  assert.deepEqual({ format: metadata.format, width: metadata.width,
    height: metadata.height, space: metadata.space, channels: metadata.channels,
    density: metadata.density, hasProfile: metadata.hasProfile },
  { format: 'jpeg', width: expected.width, height: expected.height, space: 'srgb',
    channels: 3, density: 300, hasProfile: true });
  for (const secret of [order.address, order.recipient_mobile, order.transfer_reference]) {
    assert.ok(!candidate.bytes.includes(Buffer.from(secret)));
  }
}

const sky = await renderer.buildPrivateShopFinalPrintCandidate(order, 1);
assert.equal(sky.productId, 'p02');
assert.equal(sky.sourceManifest, null);
await assertJpeg(sky, '10x15');
if (process.argv.includes('--p02-10x15')) {
  // The native 20x30 and 30x45 R9 print tests are independent. Their
  // previously observed successes are not invalidated by this mode.
  // The combined legacy stress suite below exercises repeated P02/P01/P03
  // raster operations and is deliberately not a short launch smoke.
  assert.ok(sky.bytes.length <= 8 * 1024 * 1024,
    'Small native JPEG must fit the owner-only manual archive limit');
  console.log('P02_NATIVE_10x15_PASS: 1182x1772 300PPI/sRGB, private candidate, owner-archive size limit');
  process.exit(0);
}
if (process.env.HALLEUS_SHOP_SYNTHETIC_QA_IMAGE) {
  const downsampled = await sharp(sky.bytes).resize({ width: 750 }).jpeg({ quality: 88 }).toBuffer();
  await writeFile(process.env.HALLEUS_SHOP_SYNTHETIC_QA_IMAGE, downsampled);
}
const skyAgain = await renderer.buildPrivateShopFinalPrintCandidate(order, 1);
assert.deepEqual(sky.bytes, skyAgain.bytes, 'Sky export must be deterministic.');
const changed = await renderer.buildPrivateShopFinalPrintCandidate({
  ...order, items: [{ ...item, details: { ...personal, time: '20:30' } }],
}, 1);
assert.notDeepEqual(sky.bytes, changed.bytes, 'Order time must affect printed stars.');
// The native 30x45 P02 JPEG is verified by check-shop-native-middle-sky-print
// --large in a separate Node process. Keeping all native sizes + repeated
// P01/P03 renders in this process exhausts the Windows ArrayBuffer allocator.

const moonItem = { ...item, key: 'moon-01', productId: 'p01',
  details: { ...personal, time: '', city: '', cityId: '' } };
const nightItem = { ...item, key: 'night-01', productId: 'p03',
  details: { ...personal, time: '', city: '', cityId: '' } };
for (const candidate of [moonItem, nightItem]) {
  await assert.rejects(() => renderer.buildPrivateShopFinalPrintCandidate({
    ...order, items: [candidate],
  }, 1), (error) => error.status === 409);
}

function source(bytes) {
  return { bytes, sha256: createHash('sha256').update(bytes).digest('hex'),
    creator: 'Synthetic print guard', sourceUrl: 'https://example.org/test',
    license: 'Synthetic internal fixture', rightsConfirmed: true };
}
const moonSource = source(await sharp({ create: {
  width: 1200, height: 1200, channels: 3, background: '#ccd3d8',
} }).png().toBuffer());
const photoSource = source(await sharp({ create: {
  width: 1250, height: 1880, channels: 3, background: '#1d324a',
} }).png().toBuffer());
const moonOrder = { ...order, items: [moonItem] };
const nightOrder = { ...order, items: [nightItem] };
const moon = await renderer.buildPrivateShopFinalPrintCandidate(moonOrder, 1, { moonDisc: moonSource });
assert.equal(moon.productId, 'p01');
await assertJpeg(moon, '10x15');
assert.equal(renderer.formatShopP01DisplayDate('1375-11-25', 'jalali'), '1375/11/25');
assert.equal(renderer.formatShopP01DisplayDate('2024-07-01', 'gregorian'), '2024/07/01');
// A flat synthetic moon must exhibit actual phase-dependent directional lighting.
const handoff = load('lib/shop/shop-print-handoff.ts').buildPrivateShopPrintHandoff(moonOrder);
const referenceUtc = handoff.prints[0].moonReference.referenceUtc;
const phase = load('lib/shop/shop-moon-ephemeris.ts').calculateShopMoonAtUtc(referenceUtc);
const pixels = await sharp(moon.bytes).raw().toBuffer({ resolveWithObject: true });
const sampleMoon = (relativeX) => {
  const diameter = Math.floor(pixels.info.width * .69);
  const x = Math.floor(pixels.info.width / 2 + relativeX * diameter);
  const y = Math.floor(pixels.info.height * .42);
  const index = (y * pixels.info.width + x) * pixels.info.channels;
  return (pixels.data[index] + pixels.data[index + 1] + pixels.data[index + 2]) / 3;
};
const leftBrightness = sampleMoon(-.43);
const rightBrightness = sampleMoon(.43);
const expectedDifference = phase.phaseAngleDegrees <= 180
  ? rightBrightness - leftBrightness : leftBrightness - rightBrightness;
assert.ok(expectedDifference > 20,
  `Natural Moon shading must follow the ephemeris: ${expectedDifference}`);
const moonAgain = await renderer.buildPrivateShopFinalPrintCandidate(moonOrder, 1, { moonDisc: moonSource });
assert.deepEqual(moonAgain.bytes, moon.bytes, 'P01 output must be deterministic.');
const approvedR9b = load('lib/shop/shop-p01-r9b-master.ts');
assert.equal(approvedR9b.SHOP_P01_R9B_STYLE.id, 'halleus.p01.r9b.approved-composition.v1');
assert.equal(approvedR9b.SHOP_P01_R9B_STYLE.moonDiameterRatio, .70);
const pinnedSky = readFileSync(join(root, approvedR9b.SHOP_P01_R9B_STYLE.skyAsset));
assert.equal(createHash('sha256').update(pinnedSky).digest('hex'),
  approvedR9b.SHOP_P01_R9B_STYLE.approvedSkySha256);
assert.equal(approvedR9b.shopP01R9bPrintDate('1375/11/25', 'jalali'), '1375/11/25');
const personalizedMoon = await renderer.buildPrivateShopFinalPrintCandidate({
  ...moonOrder, items: [{ ...moonItem, details: {
    ...moonItem.details, names: 'نام آزمایشی دیگر', message: 'پیام متفاوت', date: '2024-07-02',
  } }],
}, 1, { moonDisc: moonSource });
await assertJpeg(personalizedMoon, '10x15');
assert.notDeepEqual(personalizedMoon.bytes, moon.bytes, 'Different P01 orders must not reuse another customer artwork.');
console.log('[PASS] P01 R9b: pinned sky, Persian date, independent personalized native artwork');
const mapSource = source(await sharp({ create: {
  width: 2048, height: 1024, channels: 3, background: '#aabdc8',
} }).png().toBuffer());
const projectedMoon = await renderer.buildPrivateShopFinalPrintCandidate(moonOrder, 1, { moonMap: mapSource });
await assertJpeg(projectedMoon, '10x15');
assert.notDeepEqual(moon.bytes, projectedMoon.bytes, 'Equirectangular map must be projected, not square-cropped.');
await assert.rejects(() => renderer.buildPrivateShopFinalPrintCandidate(moonOrder, 1,
  { moonDisc: moonSource, moonMap: mapSource }));
const night = await renderer.buildPrivateShopFinalPrintCandidate(nightOrder, 1, { milkyWayPhoto: photoSource });
assert.equal(night.productId, 'p03');
await assertJpeg(night, '10x15');
for (const bad of [
  { ...photoSource, rightsConfirmed: false },
  { ...photoSource, sha256: '0'.repeat(64) },
  { ...photoSource, creator: '' },
  source(await sharp({ create: { width: 1024, height: 1536, channels: 3, background: '#1d324a' } }).png().toBuffer()),
]) {
  await assert.rejects(() => renderer.buildPrivateShopFinalPrintCandidate(nightOrder, 1, {
    milkyWayPhoto: bad,
  }));
}
for (const status of ['transfer_declared', 'cancel_requested', 'awaiting_transfer']) {
  await assert.rejects(() => renderer.buildPrivateShopFinalPrintCandidate({ ...order, status }, 1));
}
for (const invalid of [0, 2, -1, 1.1, NaN]) {
  await assert.rejects(() => renderer.buildPrivateShopFinalPrintCandidate(order, invalid));
}

let role = 'owner';
let reads = 0;
let audits = 0;
let failAudit = false;
let stored = order;
mocks['@/lib/admin/admin-auth'] = {
  requireAdminCapability: async (_request, capability) => {
    assert.ok(['shop_orders.read', 'shop_orders.write'].includes(capability));
    return { role, id: 'synthetic-actor' };
  },
  assertAdminMutationRequest: (request) => {
    if (request.headers.get('origin') !== 'https://example.test' ||
        request.headers.get('content-type') !== 'application/json') throw new Error('Untrusted mutation');
  },
};
mocks['@/lib/admin/admin-http'] = {
  noStoreJsonResponse: (body, status = 200) => Response.json(body, { status }),
  adminErrorResponse: () => Response.json({ ok: false }, { status: 503 }),
};
mocks['@/lib/admin/admin-service'] = {
  recordAdminAuditEvent: async (event) => {
    audits++;
    assert.equal(event.afterSummary.productId, 'p02');
    assert.equal(event.afterSummary.printArtworkReady, false);
    assert.ok(['shop.print_candidate.downloaded', 'shop.print_candidate.archived'].includes(event.action));
    if (failAudit) throw new Error('Audit unavailable');
  },
};
mocks['@/lib/shop/shop-order-store'] = {
  getAdminShopOrder: async () => { reads++; return stored; },
  ShopOrderStateError: class extends Error {},
};
mocks['@/lib/shop/shop-order-http'] = { readShopRequest: async (request) => request.json() };
mocks['@/lib/shop/shop-order-contract'] = { ShopOrderInputError: class extends Error {} };
let legacyArtworkTestEnabled = true;
mocks['@/lib/shop/shop-artwork-mode'] = {
  isShopAutomaticArtworkEnabled: () => legacyArtworkTestEnabled,
};
let savedArchiveCalls = 0;
mocks['@/lib/shop/shop-print-archive'] = {
  archivePrivateShopPrintCandidate: async (_root, _id, candidate) => {
    savedArchiveCalls++;
    assert.equal(candidate.printArtworkReady, false);
    assert.equal(candidate.productId, 'p02');
    return { idempotent: savedArchiveCalls > 1, sha256: 'a'.repeat(64) };
  },
};
const route = load('app/api/admin/shop/orders/[id]/print/candidate/route.ts');
const context = { params: Promise.resolve({ id: 'e781a653-fb02-4b3d-8469-d5d100902cea' }) };
const request = (query = '?line=1') => new Request(`https://example.test/api/admin/shop/orders/${
  'e781a653-fb02-4b3d-8469-d5d100902cea'}/print/candidate${query}`);
const served = await route.GET(request(), context);
assert.equal(served.status, 200);
assert.equal(served.headers.get('content-type'), 'image/jpeg');
assert.match(served.headers.get('content-disposition'), /attachment; filename="halleus-order-/);
assert.match(served.headers.get('cache-control'), /no-store/);
await assertJpeg({ ...sky, bytes: Buffer.from(await served.arrayBuffer()) }, '10x15');
assert.equal(audits, 1);
const readsAfterSuccess = reads;
role = 'admin';
assert.equal((await route.GET(request(), context)).status, 403);
assert.equal(reads, readsAfterSuccess, 'Non-owner must not query order.');
role = 'owner';
for (const query of ['', '?line=1&line=2', '?line=1&debug=1', '?line=0']) {
  assert.equal((await route.GET(request(query), context)).status, 400);
}
stored = nightOrder;
assert.equal((await route.GET(request(), context)).status, 409);
stored = { ...order, status: 'transfer_declared' };
assert.equal((await route.GET(request(), context)).status, 409);
stored = null;
assert.equal((await route.GET(request(), context)).status, 404);
stored = order;
failAudit = true;
assert.equal((await route.GET(request(), context)).status, 503);
failAudit = false;
runtimeEnv.NODE_ENV = 'production';
assert.equal((await route.GET(request(), context)).status, 404);
const post = (body = { acknowledgePendingApproval: true }) => new Request(
  `https://example.test/api/admin/shop/orders/e781a653-fb02-4b3d-8469-d5d100902cea/print/candidate?line=1`,
  { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://example.test' },
    body: JSON.stringify(body) },
);
assert.equal((await route.POST(post(), context)).status, 404);
runtimeEnv.NODE_ENV = 'development';
assert.equal((await route.POST(post({ acknowledgePendingApproval: false }), context)).status, 400);
role = 'admin';
assert.equal((await route.POST(post(), context)).status, 403);
role = 'owner';
assert.equal((await route.POST(post(), context)).status, 409);
if (process.platform === 'linux') {
  runtimeEnv.HALLEUS_SHOP_PRINT_ARCHIVE_ROOT = '/synthetic/isolated-shop-archive';
  const archived = await route.POST(post(), context);
  assert.equal(archived.status, 200);
  assert.equal((await archived.json()).archivedPendingApproval, true);
  assert.equal(savedArchiveCalls, 1);
  runtimeEnv.HALLEUS_SHOP_PRINT_ARCHIVE_ROOT = undefined;
}
legacyArtworkTestEnabled = false;
const readsWhenDisabled = reads;
assert.equal((await route.GET(request(), context)).status, 404);
assert.equal((await route.POST(post(), context)).status, 404);
assert.equal(reads, readsWhenDisabled, 'Disabled automated artwork must not read orders.');

// The archive must live outside repo/releases/public, with an operator-owned
// private marker; it does not get exercised against a live storage root.
console.log('[PASS] shop-final-print: native JPG, RGB/ICC, 300ppi, 5mm, personalized P02, source-gated P01/P03');
