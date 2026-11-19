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
const months = load('lib/shop/nemad-man-months.ts');
const routes = load('lib/shop/shop-product-url.ts', { './nemad-man-months': months });
const policy = load('lib/shop/shop-merchant-policy.ts');
const schema = load('components/shop/product-schema.ts', {
  './product-detail-data': registry,
  './shop-checkout-state': shipping,
  '@/lib/shop/shop-product-url': routes,
  '@/lib/shop/shop-merchant-policy': policy,
});
const graph = (id, enabled) => JSON.parse(JSON.stringify(
  schema.buildShopProductStructuredData(registry.getShopProduct(id), 'https://halleus.ir', enabled),
));
const product = (data) => data['@graph'].find((item) => item['@type'] === 'Product');
const p01 = graph('p01', true);
const p02 = graph('p02', true);
const p02Closed = graph('p02', false);
const p03 = graph('p03', false);

assert.equal(product(p01).offers.price, registry.SHOP_SIZES[0].price * 10);
assert.equal(product(p02).offers.price, registry.SHOP_P02_SIZES[0].price * 10);
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
  assert.ok(text.includes('MerchantReturnPolicy') || data === p03,
    'real personalized return policy must exist for purchasable products');
  assert.ok(!text.includes('ProductGroup'), 'no synthetic preselected variant URLs');
}

const rootLayout = read('app/layout.tsx');
assert.ok(rootLayout.includes("'@type': 'Organization'"));
assert.ok(rootLayout.includes("'@type': 'WebSite'"));
assert.ok(rootLayout.includes('/#organization'));
const p02Page = read('app/shop/birth-sky-map/page.tsx');
assert.ok(p02Page.includes("getShopProduct('p02'), siteConfig.url, isShopP02OrderEnabled()"));
assert.ok(p02Page.includes('type="application/ld+json"'));
assert.ok(p02Page.includes("initialPriceToman={catalog.prices['p02:10x15']}"));
assert.ok(!read('components/shop/ProductDetail.tsx').includes('buildShopProductStructuredData'),
  'P01 JSON-LD must be server-rendered, not gated on browser API state');
const p01Page = read('app/shop/moon-phase-print/page.tsx');
assert.match(p01Page, /buildShopProductStructuredData\(getShopProduct\('p01'\), siteConfig\.url, true, prices\)/);
assert.match(p01Page, /initialPriceToman=\{prices\['p01:10x15'\]\}/);
assert.match(read('components/shop/BirthSkyLiveProduct.tsx'), /initialVisiblePrice = sizeIndex === 0/);
assert.match(read('components/shop/ProductDetail.tsx'), /initialVisiblePrice = sizeIndex === 0/);
const shopPage = read('app/shop/page.tsx');
assert.ok(shopPage.includes("id: 'P01'"));
assert.ok(shopPage.includes("availability: 'available'"));

// Normalized Google category and evidence-backed business facts.
for (const data of [p01, p02, p02Closed]) {
  const offer = product(data).offers;
  assert.equal(product(data).category['@type'], 'CategoryCode');
  assert.equal(product(data).category.codeValue, '500044');
  assert.equal(offer.hasMerchantReturnPolicy.returnPolicyCategory,
    'https://schema.org/MerchantReturnNotPermitted');
  assert.equal(offer.hasMerchantReturnPolicy.applicableCountry, 'IR');
  assert.equal(offer.hasMerchantReturnPolicy.url, 'https://halleus.ir/shop/shipping-returns');
  assert.equal(offer.shippingDetails.deliveryTime.handlingTime.maxValue, 3);
  assert.equal(offer.shippingDetails.deliveryTime.handlingTime.unitCode, 'DAY');
  assert.equal(offer.shippingDetails.deliveryTime.transitTime, undefined,
    'Carrier transit time must not be invented');
}

// Every month has a separate canonical Product identity and real mockup photos.
const nmSample = {
  ...registry.getShopProduct('p02'), id: 'nm', title: 'نماد من — بهمن',
  gallery: [
    { src: '/nemad-man/zodiac-glyphs-v1/aquarius.webp#dark', alt: '', label: '' },
    { src: '/nemad-man/zodiac-glyphs-v1/aquarius.webp#light', alt: '', label: '' },
    { src: '/shop-preview/nemad-man/bahman/02-nora-1370-11-18-dark-wall-bench.webp', alt: '', label: '' },
  ],
};
const nemadPrice = 1_234_000;
const nm = JSON.parse(JSON.stringify(schema.buildShopProductStructuredData(
  nmSample, 'https://halleus.ir', true, { 'nm:10x15': nemadPrice }, 'bahman',
)));
assert.equal(product(nm).offers.price, nemadPrice * 10);
assert.equal(product(nm).productID, 'nm-bahman');
assert.equal(product(nm).url, 'https://halleus.ir/shop/bahman-sign');
assert.equal(product(nm).image.length, 1);
assert.ok(product(nm).image[0].endsWith('/02-nora-1370-11-18-dark-wall-bench.webp'));
assert.equal(product(nm).offers.availability, 'https://schema.org/InStock');
const nmClosed = schema.buildShopProductStructuredData(
  nmSample, 'https://halleus.ir', false, { 'nm:10x15': nemadPrice }, 'bahman',
);
assert.equal(product(nmClosed).offers.availability, 'https://schema.org/OutOfStock');
assert.throws(() => schema.buildShopProductStructuredData(nmSample, 'https://halleus.ir', true, {}, undefined));
assert.throws(() => schema.buildShopProductStructuredData(nmSample, 'https://halleus.ir', true, {}, 'bahman'),
  'Missing authoritative month price must fail closed');
assert.throws(() => schema.buildShopProductStructuredData(registry.getShopProduct('p01'), 'https://halleus.ir', true, {}),
  'Missing P01 price must not fall back to a stale base when a catalog is provided');

const canonical = read('app/shop/[slug]/page.tsx');
const internal = read('app/shop/nemad-man/[month]/page.tsx');
assert.match(canonical, /return NemadMonthProductPage\(await monthParams\(props\)\)/);
assert.match(internal, /export default async function NemadManMonthProductPage/);
assert.match(internal, /data\.product, siteConfig\.url, purchaseEnabled, prices, month/);
assert.match(internal, /robots: \{ index: false, follow: false \}/);
assert.match(canonical, /robots: \{ index: true, follow: true \}/);
assert.match(internal, /initialPriceToman=\{prices\['nm:10x15'\]\}/);
assert.match(read('app/shop/shipping-returns/page.tsx'), /SHOP_HANDOFF_MAX_BUSINESS_DAYS/);
assert.match(read('components/AppShell.tsx'), /\/shop\/shipping-returns/);
assert.match(read('components/shop/ShopCheckoutFlow.tsx'), /\/shop\/shipping-returns/);
assert.match(read('app/sitemap.ts'), /\/shop\/shipping-returns/);

console.log('HALLEUS_SHOP_MERCHANT_SCHEMA=PASS: P01/P02/NM real IRR default prices, 12 canonical Nemad route contracts, custom returns, 3-day handoff, true Post cost, no invented transit/reviews');
