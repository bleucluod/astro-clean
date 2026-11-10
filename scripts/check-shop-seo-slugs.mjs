import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const slugs = [
  ['p01', 'moon-phase-print'],
  ['p02', 'birth-sky-map'],
  ['p03', 'milky-way-print'],
];
const urlMap = read('lib/shop/shop-product-url.ts');
const catalog = read('app/shop/page.tsx');
const checkout = read('components/shop/ShopCheckoutFlow.tsx');
const detail = read('components/shop/ProductDetail.tsx');
const copy = read('components/shop/product-detail-data.ts');
const schema = read('components/shop/product-schema.ts');
const registry = JSON.parse(read('content/shop-seo/2026-11-06/page-registry.json'));
const nextConfig = read('next.config.ts');

for (const [id, slug] of slugs) {
  const oldPath = 'app/shop/' + id + '/page.tsx';
  const newPath = 'app/shop/' + slug + '/page.tsx';
  const url = '/shop/' + slug;
  assert.equal(existsSync(resolve(root, oldPath)), false, oldPath + ' must be 404');
  assert.equal(existsSync(resolve(root, newPath)), true, newPath + ' must exist');
  const page = read(newPath);
  assert.ok(page.includes("canonical: '" + url + "'"), newPath + ' canonical');

  assert.ok(page.includes('robots: { index: true, follow: true }'),
    newPath + ' is always indexable regardless of checkout availability');
  assert.ok(!page.includes('index: false'), newPath + ' must not declare noindex');
  assert.ok(urlMap.includes(id + ": '" + url + "'"), id + ' mapping');
  assert.ok(catalog.includes("href: getShopProductUrl('" + id + "')"), id + ' catalog link');
  const registered = registry.pages.find((item) => item.page_id === id.toUpperCase());
  assert.equal(registered.url, url, id + ' registry ownership');
  assert.ok(!page.includes("canonical: '/shop/" + id + "'"));
}
assert.match(read('app/shop/moon-phase-print/page.tsx'), /!isShopMvpActive\(\)/);
const p02Page = read('app/shop/birth-sky-map/page.tsx');
assert.match(p02Page, /<BirthSkyLiveProduct purchaseEnabled=\{isShopP02OrderEnabled\(\)\} \/>/, 'P02 must show real computed artwork and gated purchase');
assert.ok(p02Page.includes('robots: { index: true, follow: true }'), 'P02 always indexable');
assert.doesNotMatch(p02Page, /process\.env\.NODE_ENV === 'production'/, 'P02 display is publicly reviewable');
assert.match(read('app/shop/milky-way-print/page.tsx'), /process\.env\.NODE_ENV === 'production'/);

assert.match(catalog, /product\.id === 'P01'/);
assert.ok(catalog.includes('robots: { index: true, follow: true }'));
const sitemap = read('app/sitemap.ts');
assert.ok(sitemap.includes('shopPageEntries: MetadataRoute.Sitemap = ['));
assert.ok(!sitemap.includes('isShopMvpActive'), 'sitemap must not depend on checkout state');
for (const slug of ['moon-phase-print', 'birth-sky-map', 'milky-way-print']) {
  assert.ok(sitemap.includes('/shop/' + slug), slug + ' must be in sitemap');
}
assert.ok(sitemap.includes('/shop`'), 'shop root must remain in sitemap');
assert.match(checkout, /getShopProductUrl\(item\.productId\)/);
assert.match(detail, /getShopProductUrl\(item\.id\)/);
assert.match(schema, /getShopProductUrl\(product\.id\)/);
for (const source of [catalog, checkout, detail, copy, schema]) {
  assert.doesNotMatch(source, /\/shop\/p0[123]/, 'no legacy product URL in runtime sources');
}
for (const slug of ['moon-phase-print', 'birth-sky-map', 'milky-way-print']) {
  assert.ok(detail.includes(slug), slug + ' inline link matcher');
}
assert.doesNotMatch(nextConfig, /source:\s*.*\/shop\//, 'no product redirects');
console.log('Shop SEO direct routes, links, canonical/schema, preserved IDs, launch guards and legacy 404 sources: PASS');
