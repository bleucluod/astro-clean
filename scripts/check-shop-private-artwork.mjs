import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const record = { exports: {} };
  const factory = vm.runInNewContext(`(function(module,exports,require){${outputText}\n})`, {
    Response, Request, Date, URL, process: { env: runtimeEnv },
  });
  factory(record, record.exports, (name) => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  });
  return record.exports;
}

const productData = load('components/shop/product-detail-data.ts');
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
  './product-detail-data': productData, '@/lib/shop/shop-personalization': moment,
  '@/lib/locations/cities': cities,
});
const printSpec = load('lib/shop/shop-print-spec.ts', { '@/components/shop/product-detail-data': productData });
const fixedStars = load('src/lib/chart/fixed-star-catalog.ts', {
  'astronomy-engine': astronomy,
  './normalized-chart': { normalizeChartPlacement: () => { throw new Error('Unused'); } },
});
const brightStars = load('lib/shop/shop-sky-stars.ts', {
  'astronomy-engine': astronomy, '@/src/lib/chart/fixed-star-catalog': fixedStars,
});
const orderNumber = load('lib/shop/shop-order-number.ts');
const handoff = load('lib/shop/shop-print-handoff.ts', {
  '@/components/shop/shop-cart': cart, './shop-personalization': moment,
  './shop-print-spec': printSpec, '@/lib/locations/cities': cities,
  './shop-sky-stars': brightStars, './shop-order-number': orderNumber,
});
const bsc5 = JSON.parse(readFileSync(resolve(root, 'lib/shop/catalog/bsc5-bright-stars-mag6.json'), 'utf8'));
const stars = load('lib/shop/shop-sky-atlas.ts', {
  'astronomy-engine': astronomy, './catalog/bsc5-bright-stars-mag6.json': bsc5,
  './shop-sky-stars': brightStars,
});
const figuresData = JSON.parse(readFileSync(resolve(root, 'lib/shop/catalog/constellations-d3-celestial-v1.json'), 'utf8'));
const figures = load('lib/shop/shop-constellation-lines.ts', {
  'astronomy-engine': astronomy, './catalog/constellations-d3-celestial-v1.json': figuresData,
  './shop-sky-stars': brightStars,
});
const renderer = load('lib/shop/shop-sky-atlas-svg.ts');
const artworkText = load('lib/shop/shop-artwork-text.ts', { './shop-print-handoff': handoff });
const artwork = load('lib/shop/shop-private-artwork.ts', {
  './shop-print-handoff': handoff,
  './shop-artwork-text': artworkText,
  './shop-sky-atlas': stars,
  './shop-constellation-lines': figures,
  './shop-sky-atlas-svg': renderer,
});

const line = {
  key: 'private-sky', productId: 'p02', size: '30x45', quantity: 2,
  details: {
    calendar: 'gregorian', date: '2024-07-01', time: '12:30',
    city: 'برلین، آلمان', cityId: 'de-berlin', names: 'نام نمونهٔ الف و ب', message: 'یک پیام آزمایشی',
  },
};
const unrelatedLine = { ...line, key: 'unrelated', productId: 'p01', details: {
  ...line.details, time: '', city: '', cityId: '', names: '', message: '',
} };
const order = {
  display_number: '920', status: 'payment_verified', items: [unrelatedLine, line],
  recipient_mobile: '+989121234567', address: 'نشانی محرمانه',
  transfer_reference: 'bank-record-4922', guest_access_hash: 'never-expose-guest-secret',
};

const proof = artwork.buildPrivateShopSkyArtworkProof(order, 2);
assert.equal(proof.orderNumber, '920');
assert.equal(proof.lineNumber, 2);
assert.equal(proof.quantity, 2);
assert.equal(proof.sizeCm, '30x45');
assert.equal(proof.referenceUtc, '2024-07-01T10:30:00.000Z');
assert.equal(proof.printArtworkReady, false);
assert.equal(proof.retainedOnServer, false);
assert.match(proof.documentKind, /not-print-ready/);
assert.match(proof.svg, /<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
assert.match(proof.svg, /width="3544" height="5315"/);
assert.match(proof.svg, /نام نمونهٔ الف و ب/);
assert.match(proof.svg, /یک پیام آزمایشی/);
assert.match(proof.svg, /2024-07-01 · 12:30/);
assert.match(proof.svg, /2024-07-01T10:30:00\.000Z/);
assert.match(proof.svg, /NOT APPROVED FOR PRINT/);
assert.ok((proof.svg.match(/fill="#ecf7ff"/g) ?? []).length > 1000);
assert.ok((proof.svg.match(/stroke="#b4d2e5"/g) ?? []).length > 30);
assert.equal(proof.svg, artwork.buildPrivateShopSkyArtworkProof(order, 2).svg);
for (const secret of [order.recipient_mobile, order.address, order.transfer_reference, order.guest_access_hash]) {
  assert.ok(!proof.svg.includes(secret), 'Private order unrelated fields must not be included in artwork.');
}

for (const badLine of [0, 1, 3, -1, 2.5, NaN, Infinity]) {
  assert.throws(() => artwork.buildPrivateShopSkyArtworkProof(order, badLine));
}
for (const status of ['awaiting_transfer', 'transfer_declared', 'payment_rejected', 'cancel_requested', 'canceled']) {
  assert.throws(() => artwork.buildPrivateShopSkyArtworkProof({ ...order, status }, 2));
}
for (const unsafe of ['<script>alert(1)</script>', '<svg onload="alert(1)">', '& < > "']) {
  const output = artwork.buildPrivateShopSkyArtworkProof({
    ...order, items: [unrelatedLine, { ...line, details: { ...line.details, message: unsafe } }],
  }, 2).svg;
  assert.ok(!output.includes(unsafe), 'Unescaped customer markup.');
  assert.ok(!output.includes('<script>') && !output.includes('<svg onload='));
  assert.match(output, /&lt;/);
}
for (const badText of ['\u0000bad', 'bad\nline', '\u202Eoverride', '\u2066isolate', '\ud800', '\ufffe']) {
  assert.throws(() => artwork.buildPrivateShopSkyArtworkProof({
    ...order, items: [unrelatedLine, { ...line, details: { ...line.details, names: badText } }],
  }, 2));
}
const changedName = artwork.buildPrivateShopSkyArtworkProof({
  ...order, items: [unrelatedLine, { ...line, details: { ...line.details, names: 'نام متفاوت' } }],
}, 2);
assert.notEqual(changedName.svg, proof.svg);
const changedTime = artwork.buildPrivateShopSkyArtworkProof({
  ...order, items: [unrelatedLine, { ...line, details: { ...line.details, time: '20:30' } }],
}, 2);
assert.notEqual(changedTime.svg, proof.svg);

let role = 'owner';
let reads = 0;
let audits = [];
let failAudit = false;
let stored = order;
const route = load('app/api/admin/shop/orders/[id]/print/preview/route.ts', {
  '@/lib/admin/admin-auth': { requireAdminCapability: async () => ({ role, userId: 'test-owner' }) },
  '@/lib/admin/admin-http': {
    noStoreJsonResponse: (body, status = 200) => Response.json(body, { status }),
    adminErrorResponse: () => Response.json({ ok: false }, { status: 503 }),
  },
  '@/lib/admin/admin-service': { recordAdminAuditEvent: async (event) => {
    audits.push(event);
    if (failAudit) throw new Error('Audit is unavailable');
  } },
  '@/lib/shop/shop-private-artwork': artwork,
  '@/lib/shop/shop-private-moon-artwork': { buildPrivateShopMoonArtworkProof: async () => { throw new Error('P01 has its own guard'); } },
  '@/lib/shop/shop-night-artwork': { buildPrivateShopNightArtworkProof: async () => { throw new Error('P03 is covered by its own test'); } },
  '@/lib/shop/shop-print-handoff': handoff,
  '@/lib/shop/shop-order-store': { getAdminShopOrder: async () => { reads++; return stored; } },
});
const id = 'f8d1143a-1c64-4c01-bdb8-928a1c19b6e7';
const get = (query = '?line=2', orderId = id) => route.GET(
  new Request(`http://localhost/api/admin/shop/orders/${orderId}/print/preview${query}`),
  { params: Promise.resolve({ id: orderId }) },
);

runtimeEnv.NODE_ENV = 'production';
assert.equal((await get()).status, 404);
assert.equal(reads, 0);
runtimeEnv.NODE_ENV = 'development';
role = 'admin';
assert.equal((await get()).status, 403);
assert.equal(reads, 0);
role = 'owner';
for (const query of ['', '?line=0', '?line=2&line=1', '?line=02', '?line=abc', '?line=2&debug=true']) {
  assert.equal((await get(query)).status, 400);
}
assert.equal((await get('?line=2', 'not-a-uuid')).status, 400);
assert.equal(reads, 0);
stored = null;
assert.equal((await get()).status, 404);
stored = { ...order, status: 'transfer_declared' };
assert.equal((await get()).status, 409);
stored = order;
// P01 has its own real-PNG route guard now; this guard focuses on P02.
assert.equal(audits.length, 0);
const response = await get();
assert.equal(response.status, 200);
assert.match(response.headers.get('content-type'), /^image\/svg\+xml;/);
assert.equal(response.headers.get('cache-control'), 'private, no-store, max-age=0');
assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
assert.match(response.headers.get('content-disposition'), /920-p02-line-2-proof\.svg/);
assert.match(response.headers.get('content-security-policy'), /default-src 'none'; sandbox/);
assert.equal(await response.text(), proof.svg);
assert.equal(audits.length, 1);
assert.equal(audits[0].action, 'shop.print_proof.downloaded');
assert.equal(audits[0].afterSummary.line, 2);
assert.ok(!JSON.stringify(audits).includes('نام نمونهٔ الف و ب'));
failAudit = true;
assert.equal((await get()).status, 503);
assert.equal(audits.length, 2);

const ui = readFileSync(resolve(root, 'components/admin/ShopOrdersWorkspace.tsx'), 'utf8');
assert.match(ui, /downloadArtworkProof\(index \+ 1\)/);
assert.match(ui, /\['p01', 'p02', 'p03'\]\.includes\(item\.productId\)/);
assert.match(ui, /productId === 'p02' \? 'svg' : 'png'/);
assert.match(ui, /print\/preview\?line=/);
for (const sourceFile of [
  'lib/shop/shop-private-artwork.ts', 'app/api/admin/shop/orders/[id]/print/preview/route.ts',
]) {
  const source = readFileSync(resolve(root, sourceFile), 'utf8');
  assert.doesNotMatch(source, /(?:writeFile|mkdir|createWriteStream|localStorage|public\/shop-preview)/);
}

console.log('Shop private artwork: verified per-order sky proof, deterministic personal text, XML/control safety, owner/payment/audit, dev-only/no-store/no-retention all passed.');

if (process.argv.includes('--render-synthetic-preview')) {
  const { default: sharp } = await import('sharp');
  const preview = '/tmp/halleus-synthetic-private-sky-proof.png';
  const details = await sharp(Buffer.from(proof.svg)).resize({ width: 800 }).png().toFile(preview);
  console.log('Synthetic/private-plaintext-free visual smoke:', preview, details.width, details.height);
}
