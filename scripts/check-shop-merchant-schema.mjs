import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const load = (path, deps = {}) => {
  const output = ts.transpileModule(read(path), {
    fileName: path,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  assert.equal((output.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error).length, 0,
    'TypeScript syntax: ' + path);
  const exports = {};
  vm.runInNewContext(output.outputText, {
    exports, URL,
    require: (id) => {
      assert.ok(Object.hasOwn(deps, id), path + ' unexpected dependency: ' + id);
      return deps[id];
    },
  }, { filename: path, timeout: 2500 });
  return exports;
};

const gallery = load('components/shop/birth-sky-gallery.ts');
const registry = load('components/shop/product-detail-data.ts', {
  './birth-sky-gallery': gallery,
});
const shipping = load('components/shop/shop-checkout-state.ts');
const routes = load('lib/shop/shop-product-url.ts');
const schema = load('components/shop/product-schema.ts', {
  './product-detail-data': registry,
  './shop-checkout-state': shipping,
  '@/lib/shop/shop-product-url': routes,
});
const graph = (id, enabled) => JSON.parse(JSON.stringify(
  schema.buildShopProductStructuredData(registry.getShopProduct(id), 'https://halleus.ir', enabled),
));
const product = (data) => data['@graph'].find((item) => item['@type'] === 'Product');
const p01 = graph('p01', true);
const p02 = graph('p02', true);
const p02Closed = graph('p02', false);
const p03 = graph('p03', false);

assert.equal(product(p01).offers.price, registry.SHOP_SIZES[1].price * 10);
assert.equal(product(p02).offers.price, registry.SHOP_P02_SIZES[2].price * 10);
assert.equal(product(p01).offers.priceCurrency, 'IRR');
assert.equal(product(p02).offers.priceCurrency, 'IRR');
assert.equal(product(p01).offers.availability, 'https://schema.org/InStock');
assert.equal(product(p02).offers.availability, 'https://schema.org/InStock');
assert.equal(product(p02Closed).offers.availability, 'https://schema.org/OutOfStock');
assert.equal(product(p02Closed).offers.price, product(p02).offers.price);
assert.equal(product(p02).offers.shippingDetails.shippingRate.value,
  shipping.SHOP_SHIPPING_AND_PACKAGING.post * 10);
assert.equal(product(p02).offers.shippingDetails.shippingDestination.addressCountry, 'IR');
assert.ok(product(p01).image.length >= 1);
assert.ok(product(p02).image.length === 6);
assert.equal(p01['@graph'].filter((item) => item['@type'] === 'FAQPage').length, 1);
assert.equal(p02['@graph'].filter((item) => item['@type'] === 'FAQPage').length, 0);
assert.equal(product(p03).offers, undefined, 'P03 must not advertise a fake purchasable offer');
for (const data of [p01, p02, p02Closed, p03]) {
  const text = JSON.stringify(data);
  assert.ok(!text.includes('aggregateRating'), 'no synthetic aggregate rating');
  assert.ok(!text.includes('"review"'), 'no synthetic reviews');
  assert.ok(!text.includes('MerchantReturnPolicy'), 'no invented returns policy');
  assert.ok(!text.includes('ProductGroup'), 'no synthetic preselected variant URLs');
}

const rootLayout = read('app/layout.tsx');
assert.ok(rootLayout.includes("'@type': 'Organization'"));
assert.ok(rootLayout.includes("'@type': 'WebSite'"));
assert.ok(rootLayout.includes('/#organization'));
const p02Page = read('app/shop/birth-sky-map/page.tsx');
assert.ok(p02Page.includes("getShopProduct('p02'), siteConfig.url, isShopP02OrderEnabled()"));
assert.ok(p02Page.includes('type="application/ld+json"'));
assert.ok(p02Page.includes('<BirthSkyLiveProduct purchaseEnabled={isShopP02OrderEnabled()} />'));
assert.ok(read('components/shop/ProductDetail.tsx').includes('buildShopProductStructuredData(product, siteConfig.url)'));
const shopPage = read('app/shop/page.tsx');
assert.ok(shopPage.includes("id: 'P01'"));
assert.ok(shopPage.includes("availability: 'available'"));
console.log('HALLEUS_SHOP_MERCHANT_SCHEMA=PASS P01/P02 real IRR default prices, Post fee, stock gate, Organization/WebSite, P03 closed');
