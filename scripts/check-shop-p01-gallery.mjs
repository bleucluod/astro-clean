import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const expected = [
  'mockup-gibbous', 'full-both', 'mockup-crescent', 'mockup-half',
  'mockup-full', 'full-name', 'full-message', 'full-date',
  'mockup-message', 'quarter-name', 'crescent-message', 'gibbous-date',
  'gibbous-both', 'crescent-name',
].map((key) => '/shop-preview/p01/' + key + '.webp');

const data = read('components/shop/product-detail-data.ts');
const p01 = data.split("  p01: {")[1]?.split("\n  p02: {")[0];
assert.ok(p01, 'P01 product block exists');
const gallery = p01.split('    gallery: [')[1]?.split('    ],')[0];
assert.ok(gallery, 'P01 gallery is defined');
const paths = Array.from(gallery.matchAll(/src: '([^']+)'/g), (m) => m[1]);
assert.deepEqual(paths, expected, '14 approved images in editorial order');
assert.equal(new Set(paths).size, 14, 'no duplicated photos');
for (const path of paths) {
  const local = resolve(root, 'public' + path);
  assert.ok(existsSync(local), path + ' must exist in the Git tree');
  const bytes = readFileSync(local);
  assert.ok(bytes.length > 20000, path + ' must not be an empty stub');
  assert.equal(bytes.subarray(0, 4).toString(), 'RIFF', path + ' header');
  assert.equal(bytes.subarray(8, 12).toString(), 'WEBP', path + ' format');
}
const examples = p01.split('    personalizationExamples: [')[1]?.split('    ],')[0];
assert.ok(examples, 'P01 must explain all personalization states');
for (const key of ['full-both', 'full-name', 'full-message', 'full-date']) {
  assert.ok(examples.includes('/shop-preview/p01/' + key + '.webp'), key + ' example');
}
assert.equal((examples.match(/src: '/g) ?? []).length, 4);
assert.match(p01, /نام و پیام هر دو اختیاری/);
assert.match(p01, /شمسی یا میلادی/);
const view = read('components/shop/ProductDetail.tsx');
assert.match(view, /product\.personalizationExamples\.map/);
assert.match(view, /styles\.p01Thumbnails/);
assert.match(view, /product\.gallery\[photoIndex\]\.label/);
const css = read('components/shop/product-detail.module.css');
assert.match(css, /\.p01Thumbnails/);
assert.match(css, /\.personalizationExampleGrid/);
assert.match(css, /background: #050609/);
const shop = read('app/shop/page.tsx');
assert.match(shop, /\/shop-preview\/p01\/mockup-gibbous\.webp/);
assert.match(shop, /!isShopMvpActive\(\)/);
assert.match(shop, /robots: \{ index: false, follow: false \}/);
assert.match(read('app/shop/moon-phase-print/page.tsx'), /!isShopMvpActive\(\)/);
console.log('P01_REAL_RENDERER_GALLERY=PASS images=14 mockups=5 originals=9 examples=4');
