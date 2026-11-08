import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const rendererPath = 'lib/shop/shop-birth-sky-artwork.ts';
const rendererSource = read(rendererPath);
const route = read('app/shop/birth-sky-map/page.tsx');
const client = read('components/shop/BirthSkyLiveProduct.tsx');
const css = read('components/shop/birth-sky-live-product.module.css');
const home = read('components/shop/ShopV01Home.tsx');
const homeCss = read('components/shop/shop-v01-home.module.css');
const quote = read('lib/shop/shop-quote.ts');
const cart = read('components/shop/shop-cart.ts');
const times = read('lib/shop/shop-personalization.ts');
const cityCatalog = read('lib/locations/iran-cities.ts');
const actualPrint = read('lib/shop/shop-final-print.ts');

for (const path of [rendererPath, 'components/shop/BirthSkyLiveProduct.tsx',
  'app/shop/birth-sky-map/page.tsx']) {
  const src = read(path);
  const js = ts.transpileModule(src, {
    fileName: path, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX },
  });
  assert.deepEqual((js.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error), [],
    'TypeScript/TSX syntax must remain parseable: ' + path);
}

const js = ts.transpileModule(rendererSource, {
  fileName: rendererPath,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
vm.runInNewContext('(function(require, exports){' + js + '\n})', {
  Object, Array, Number, Math, String, Error,
})((name) => { throw new Error('Artwork renderer must be dependency-free: ' + name); }, exports);
const render = exports.renderShopBirthSkyArtwork;
assert.equal(typeof render, 'function');

const atlas = {
  referenceUtc: '2024-11-05T17:30:00.000Z',
  latitude: 35.7081327, longitude: 51.4139829,
  aboveHorizonStars: [{ x: 0, y: 0, visualMagnitude: 1.3 },
    { x: 0.7, y: -0.3, visualMagnitude: 4.2 }],
};
const figures = {
  referenceUtc: atlas.referenceUtc, latitude: atlas.latitude, longitude: atlas.longitude,
  lines: [{ rank: 1, points: [{ x: -0.5, y: 0.1 }, { x: 0.5, y: 0.1 }] }],
};
const details = { names: '<نام & آزمون>', message: 'برای تو & من',
  date: '۱۴۰۳/۰۸/۱۵', time: '21:00', city: 'تهران' };
const art = render(atlas, figures, details);
assert.match(art, /viewBox="0 0 3000 4500"/);
assert.match(art, /<circle cx="1500.00" cy="1930.00"/);
assert.match(art, /<path d="M/);
assert.match(art, /&lt;نام &amp; آزمون&gt;/);
assert.match(art, /برای تو &amp; من/);
assert.doesNotMatch(art, /<نام & آزمون>/);
assert.doesNotMatch(art, /CALCULATION PROOF|NOT APPROVED FOR PRINT|shop-preview|<script|<image/);
assert.equal(art, render(atlas, figures, details), 'Rendering must be deterministic.');
assert.notEqual(art, render({ ...atlas, aboveHorizonStars: [
  { x: .1, y: -.2, visualMagnitude: 2 },
] }, figures, details), 'Star coordinates must affect the real poster.');
assert.throws(() => render(atlas, { ...figures, referenceUtc: '2024-11-05T18:30:00.000Z' }, details));

const cssNames = [...client.matchAll(/styles\.([A-Za-z][\w]*)/g)].map(x => x[1]);
for (const name of new Set(cssNames)) {
  assert.match(css, new RegExp('\\.' + name + '(?![\\w-])'), 'Missing P02 CSS class: ' + name);
}
assert.ok(route.includes('<BirthSkyLiveProduct'));
assert.ok(route.includes('index: false'), 'Product must remain noindex before image/price approval');
assert.ok(!route.includes("process.env.NODE_ENV === 'production'"),
  'P02 actual live design must now be publicly accessible');
for (const marker of [
  "validateShopMoment('p02', values)", 'findHalleusCityById(values.cityId)',
  "import('@/lib/shop/shop-sky-atlas')", "import('@/lib/shop/shop-constellation-lines')",
  "import('@/lib/shop/shop-birth-sky-artwork')",
  'dangerouslySetInnerHTML={{ __html: artwork }}',
  "canvas.toBlob(", "URL.revokeObjectURL(svgUrl)",
  'از داده‌های نجومی واقعی', 'امکان خرید، پرداخت و سفارش',
]) assert.ok(client.includes(marker), 'Missing P02 live-preview contract: ' + marker);
assert.ok(!client.includes('/shop-preview/') && !client.includes('addShopCartItem('));
assert.ok(!client.includes("fetch("), 'Personal birth inputs must not be sent to a server for this preview');
assert.ok(cityCatalog.includes('"id": "iran-229"') && cityCatalog.includes('"faName": "تهران"'));
assert.ok(times.includes("resolveShopCivilTimeUtc(gregorianIso!, time, city.timezone)"));
assert.ok(home.includes('href="/shop/birth-sky-map"') && home.includes('styles.p02Invitation'));
assert.ok(homeCss.includes('.p02Invitation'));
assert.ok(quote.includes("new Set(['p01'])"));
assert.ok(cart.includes("validProductIds: ShopProductId[] = ['p01']"));
assert.ok(actualPrint.includes("calculateShopStarAtlas(input)") &&
  actualPrint.includes("calculateShopConstellationLines(input)"),
  'Public artwork must share actual star/constellation inputs with print candidate');
console.log('P02_LIVE_COMPUTED_ARTWORK=PASS browser_only_real_sky_no_mockups_cart_closed');
