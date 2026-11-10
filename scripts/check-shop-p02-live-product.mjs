import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const clientPath = 'components/shop/BirthSkyLiveProduct.tsx';
const client = read(clientPath);
const renderer = read('lib/shop/shop-birth-sky-r9.ts');
const route = read('app/shop/birth-sky-map/page.tsx');
const gallery = read('components/shop/birth-sky-gallery.ts');
const copy = read('components/shop/birth-sky-content.ts');
const css = read('components/shop/birth-sky-live-product.module.css');
const quote = read('lib/shop/shop-quote.ts');
const cart = read('components/shop/shop-cart.ts');

for (const path of [clientPath, 'lib/shop/shop-birth-sky-r9.ts',
  'components/shop/birth-sky-content.ts', 'components/shop/birth-sky-gallery.ts']) {
  const transpiled = ts.transpileModule(read(path), {
    fileName: path, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX },
  });
  assert.deepEqual((transpiled.diagnostics ?? []).filter((d) =>
    d.category === ts.DiagnosticCategory.Error), [], 'Parseable TS/TSX: ' + path);
}

for (const key of [
  "validateShopMoment('p02', values)",
  'renderShopBirthSkyR9(stars, figures, named',
  'makeWatermarkedPreview(svg, fontFamily)',
  'paintShopBirthSkyR9Text(context, svg, fontFamily)',
  "canvas.toDataURL('image/webp'",
  'setPhotoIndex(0)',
  'setArtwork(null)',
  'galleryCount = BIRTH_SKY_GALLERY.length + 1',
  'disabled={!artwork}',
  'SHOP_P02_SIZES[sizeIndex].price',
  "addShopCartItem('p02'",
  'disabled={!artwork || busy}',
  'purchaseEnabled',
  "router.push('/shop/cart')",
  "window.document.fonts.load('500 31px '",
  "context.fillText('پیش‌نمایش هالیوس', canvas.width / 2, canvas.height / 2)",
  '<BirthSkyEditorial />',
]) assert.ok(client.includes(key), 'P02 missing contract: ' + key);
for (const forbidden of [
  'downloadPng', 'skyOnlyArtwork', 'canvas.toBlob(', 'dangerouslySetInnerHTML',
  'fetch(', 'p02-live-preview',
]) assert.ok(!client.includes(forbidden), 'Unsafe/outdated preview behavior: ' + forbidden);

assert.match(read('components/shop/product-detail-data.ts'),
  /SHOP_P02_SIZES = \[/);
assert.match(client, /PREVIEW_SIZE = \{ width: 720, height: 1080 \}/);
assert.match(client, /context\.fillText\(/);
assert.match(client, /URL\.revokeObjectURL\(url\)/);
assert.match(client, /BIRTH_SKY_GALLERY\.map\(/);
assert.match(css, /\.previewThumbEmpty/);
assert.match(css, /\.previewCaption/);
assert.match(copy, /"button": "پیش‌نمایش تابلوی من"/);
assert.ok(route.includes('robots: { index: true, follow: true }'));
assert.ok(!client.includes('initial, true'), 'No automatic initial personal preview');
assert.match(quote, /new Set\(\['p01', 'p02'\]\)/);
assert.match(quote, /isShopP02OrderEnabled\(\)/);
assert.match(cart, /validProductIds: ShopProductId\[\] = \['p01', 'p02'\]/);
assert.equal((client.match(/context\.fillText\('پیش‌نمایش هالیوس'/g) ?? []).length, 1,
  'exactly one baked-in centered watermark');
assert.doesNotMatch(client, /for \(let y = -620|for \(let x = -640/);
assert.match(client, /galleryRef\.current\?\.scrollIntoView/);
assert.match(read('app/shop/birth-sky-map/page.tsx'), /purchaseEnabled=\{isShopP02OrderEnabled\(\)\}/);
assert.match(read('lib/shop/shop-birth-sky-r9.ts'), /name\?personalNameText\(/);

const expected = [
  'public/shop-preview/p02/01-arad-10x15-tabletop.webp',
  'public/shop-preview/p02/02-arad-haleh-10x15-pair.webp',
];
for (const path of expected) {
  const file = readFileSync(resolve(root, path));
  assert.ok(file.length > 30_000, 'Full product mockup must be present: ' + path);
  assert.equal(file.toString('ascii', 0, 4), 'RIFF', 'WebP container required: ' + path);
  assert.equal(file.toString('ascii', 8, 12), 'WEBP', 'WebP brand required: ' + path);
  assert.ok(gallery.includes('/' + path.replace(/^public\//, '')), 'Gallery reference missing: ' + path);
}
assert.equal((gallery.match(/"src":/g) ?? []).length, 6);
assert.ok(!gallery.includes('01-hale-10x15-tabletop.webp'));
assert.ok(!gallery.includes('02-hale-arad-10x15-pair.webp'));
assert.match(renderer, /export function renderShopBirthSkyR9/);
console.log('SHOP_P02_GALLERY_WATERMARK_ORDER=PASS six_mockups_one_center_watermark_p02_cart_separate_gate');
