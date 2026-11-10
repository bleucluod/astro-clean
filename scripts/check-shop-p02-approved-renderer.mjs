import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const renderPath = 'lib/shop/shop-birth-sky-artwork.ts';
const renderer = read(renderPath);
const p01 = read('lib/shop/shop-p01-r9b-master.ts');
const page = read('app/shop/birth-sky-map/page.tsx');
const client = read('components/shop/BirthSkyLiveProduct.tsx');
const quote = read('lib/shop/shop-quote.ts');
const cart = read('components/shop/shop-cart.ts');

assert.match(p01, /fontDir = 'assets\/shop-print\/fonts'/);
for (const weight of ['Light', 'Regular', 'Medium']) {
  assert.ok(p01.includes('Estedad-' + weight + '.ttf'), 'P01 typography identity');
  assert.ok(page.includes('Estedad-' + weight + '.ttf'), 'P02 must use identical source font files');
}
assert.ok(page.includes("variable: '--font-p02-estedad'"));
assert.ok(page.includes('robots: { index: true, follow: true }'));
assert.ok(client.includes('paintShopBirthSkyTypography(context'));
assert.ok(client.includes('skyOnlyArtwork.current = artModule.renderShopBirthSkyArtwork'));
assert.ok(client.includes('calculateShopGalacticAtmosphere(reference)'));
assert.ok(client.includes('typography: false, atmosphere'));
assert.ok(client.includes('context.scale(0.5, 0.5)'));
assert.ok(!client.includes('/shop-preview/'));
assert.ok(!client.includes('fetch('));
assert.ok(!client.includes('addShopCartItem('));
assert.ok(quote.includes("new Set(['p01'])"));
assert.ok(cart.includes("validProductIds: ShopProductId[] = ['p01']"));

for (const file of [renderPath, 'app/shop/birth-sky-map/page.tsx',
  'components/shop/BirthSkyLiveProduct.tsx']) {
  const js = ts.transpileModule(read(file), {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX },
  });
  assert.deepEqual((js.diagnostics ?? []).filter((d) =>
    d.category === ts.DiagnosticCategory.Error), [], 'TypeScript syntax: ' + file);
}

const js = ts.transpileModule(renderer, {
  fileName: renderPath,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
vm.runInNewContext('(function(require,exports){' + js + '\n})',
  { Object, Array, Number, Math, String, Error, Promise })(
  (name) => { throw new Error('Unexpected rendering dependency: ' + name); }, exports);
const layout = exports.SHOP_P02_POSTER_LAYOUT;
const render = exports.renderShopBirthSkyArtwork;
assert.equal(layout.width, 3000);
assert.equal(layout.height, 4500);
assert.equal(layout.background, '#000000');
assert.deepEqual(Array.from(Object.entries(layout.circle)), [['x', 1500], ['y', 1920],
  ['radius', 1135]]);
const atlas = {
  referenceUtc: '1997-02-13T16:51:00.000Z', latitude: 37.42, longitude: 46.11,
  aboveHorizonStars: [
    { x: 0, y: 0, visualMagnitude: -1.4 },
    { x: .35, y: -.55, visualMagnitude: 2.3 },
    { x: -.58, y: .25, visualMagnitude: 4.8 },
    { x: .6, y: .5, visualMagnitude: 5.7 },
  ],
};
const lines = { referenceUtc: atlas.referenceUtc, latitude: atlas.latitude,
  longitude: atlas.longitude, lines: [
    { rank: 1, points: [{ x: -.3, y: .2 }, { x: .25, y: .1 }] },
    { rank: 2, points: [{ x: -.4, y: -.2 }, { x: -.2, y: -.3 }] },
    { rank: 3, points: [{ x: -.2, y: -.2 }, { x: -.1, y: -.3 }] },
  ] };
const personal = { names: '<آراد & هالیوس>', message: 'ببینم چطور میشه',
  city: 'میانه، آذربایجان شرقی', date: '۱۳۷۵/۱۱/۲۵', time: '20:21' };
const svg = render(atlas, lines, personal);
const noText = render(atlas, lines, personal, { typography: false });
assert.match(svg, /fill="#000000"/);
assert.match(svg, /viewBox="0 0 3000 4500"/);
assert.match(svg, /r="1135"/);
assert.match(svg, /id="p02-galactic-atmosphere"/);
assert.match(svg, /id="p02-sourced-stars"/);
assert.match(svg, /id="p02-sourced-constellations"/);
assert.match(svg, /font-p02-estedad/);
assert.match(svg, /&lt;آراد &amp; هالیوس&gt;/);
assert.doesNotMatch(svg, /<آراد & هالیوس>/);
assert.ok(svg.includes('آسمان لحظهٔ تولد') && svg.includes('H  A  L  L  E  U  S'));
assert.ok(svg.includes('p02-star-halo'));
assert.ok(svg.includes('p02-dust'));
assert.match(svg, /id="p02-illustrative-atmosphere"/);
assert.match(svg, /id="p02-nebula-fractal"/);
assert.match(svg, /id="p02-sky-depth"/);
assert.match(svg, /<feTurbulence type="fractalNoise"/);
assert.ok(!renderer.includes('Math.random'), 'Art texture must be deterministic');
assert.ok(!renderer.includes('<image href='), 'No stock sky or static mapped stars allowed');
assert.ok(svg.includes('stroke-opacity=".30"'));
assert.doesNotMatch(svg, /stroke-opacity=".47"|stroke-opacity=".21"/);
assert.match(svg, /id="p02-sky-grain"/);
assert.match(svg, /id="p02-galactic-atmosphere" opacity=".045"/);
assert.doesNotMatch(renderer, /centralLane|Math\.random/);
const grainPath = svg.match(/<path id="p02-sky-grain" d="([^"]+)"/)?.[1];
assert.ok(grainPath);
const grainPoints = [...grainPath.matchAll(/M([\d.]+) ([\d.]+)h[\d.]+/g)];
assert.ok(grainPoints.length > 3500 && grainPoints.length < 6500);
const quadrants = [0, 0, 0, 0];
for (const [, sx, sy] of grainPoints) {
  const x = Number(sx), y = Number(sy);
  quadrants[(y >= 1920 ? 2 : 0) + (x >= 1500 ? 1 : 0)]++;
}
assert.ok(quadrants.every((count) => count > 600),
  'Background texture must cover all four quadrants, including upper-left');
assert.doesNotMatch(svg, /<image|shop-preview|A MOMENT WRITTEN|radialGradient id="birth-sky-surface"/);
assert.doesNotMatch(noText, /id="p02-poster-typography"/);
assert.match(noText, /<circle/);
assert.notEqual(svg, render({ ...atlas, aboveHorizonStars: [atlas.aboveHorizonStars[0]] },
  lines, personal), 'Real star geometry must change displayed artwork');
assert.equal(svg, render(atlas, lines, personal), 'Renderer must be deterministic');
assert.throws(() => render(atlas, { ...lines, referenceUtc: '1997-02-14T16:51:00.000Z' }, personal));
assert.throws(() => render({ ...atlas, aboveHorizonStars: [
  { x: Number.NaN, y: 0, visualMagnitude: 3 }] }, lines, personal));
console.log('SHOP_P02_APPROVED_BLACK_ESTEDAD_RENDERER=PASS same_geometry_real_catalog_only_font_contract');
