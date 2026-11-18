import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const read = p => readFileSync(resolve(root, p), 'utf8');
const p02 = read('components/shop/BirthSkyLiveProduct.tsx');
const route = read('app/shop/nemad-man/[month]/page.tsx');
const oldRoute = read('app/shop/birth-sky-map/page.tsx');
const editorial = read('components/shop/NemadManEditorial.tsx');
const artwork = read('components/shop/NemadManBahmanArtwork.tsx');

for (const path of [
  'components/shop/BirthSkyLiveProduct.tsx',
  'components/shop/NemadManEditorial.tsx',
  'app/shop/nemad-man/[month]/page.tsx',
]) {
  const source = read(path);
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.ES2022, true,
    ts.ScriptKind.TSX);
  assert.deepEqual(ast.parseDiagnostics.map(e => ts.flattenDiagnosticMessageText(e.messageText, '\n')), [],
    'TSX syntax: ' + path);
}

assert.match(route, /<BirthSkyLiveProduct purchaseEnabled=\{isShopNemadOrderEnabled\(\)\} nemad=\{data\}/);
assert.match(oldRoute, /<BirthSkyLiveProduct purchaseEnabled=\{isShopP02OrderEnabled\(\)\}/);
assert.match(p02, /data-shop-page=\{nemad \? 'nm-live-product' : 'p02-live-product'\}/);
assert.match(p02, /const gallery = nemad \? nemad\.product\.gallery\.slice\(2\) : BIRTH_SKY_GALLERY/);
for (const marker of [
  'pdStyles.productHero', 'pdStyles.purchasePanel', 'pdStyles.priceBlock',
  'pdStyles.sizes', 'pdStyles.sizeGrid', 'pdStyles.personalizeForm',
  'pdStyles.dimensionsSection', 'pdStyles.zoomDialog', 'gallerySwipe.touchHandlers',
  'useShopGallerySwipe(changePhoto)', 'NemadManBahmanArtwork',
  "liveShopPrice(livePrices.prices, nemad ? 'nm' : 'p02'",
  "addShopCartItem('nm'",
  "addShopCartItem('p02'",
  "validateBahmanPreview(values.names, values.date",
  "validateShopMoment('p02', values)",
  'makeWatermarkedPreview(svg, fontFamily)',
]) assert.ok(p02.includes(marker), 'Shared renderer missing ' + marker);

assert.match(editorial, /product\.storyTitle/);
assert.match(editorial, /product\.qualityTitle/);
assert.match(editorial, /product\.preCraftSections/);
assert.match(editorial, /product\.faq\.map/);
assert.match(editorial, /product\.postCraftSections/);
assert.match(editorial, /product\.closingCopy/);
assert.match(artwork, /viewBox="0 0 900 1350"/);
assert.ok(!p02.includes("addShopCartItem('p03'"), 'NM must never enter P03 orders');
assert.match(route, /month !== 'bahman' \|\| !isShopNemadOrderEnabled\(\)/);

const mockups = [
  '01-mahsa-1387-11-12-light-console.webp',
  '02-nora-1370-11-18-dark-wall-bench.webp',
  '03-reza-1372-11-14-light-workdesk.webp',
  '04-sina-1373-11-16-dark-gift-wrap.webp',
];
for (const name of mockups) {
  const file = resolve(root, 'public/shop-preview/nemad-man/bahman', name);
  assert.ok(existsSync(file), 'Missing Bahman mockup: ' + name);
  assert.ok(statSync(file).size < 70000, 'Bahman mockup exceeds 70 kB: ' + name);
}
console.log('NEMAD_P02_LIVE_RENDERER=PASS: P02 DOM/CSS, NM gallery, theme, cart, approved copy, four WebP');
