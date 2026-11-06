import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const data = new Map();
const storage = {
  getItem(key) { return data.get(key) ?? null; },
  setItem(key, value) { data.set(key, value); },
  removeItem(key) { data.delete(key); },
};
const windowMock = { localStorage: storage, sessionStorage: storage, dispatchEvent() {} };
const runtimeEnv = { NODE_ENV: 'development' };
let quoteFetchCalls = 0;
let quoteFetchBody;

function loadTypeScript(relativePath, dependencies = {}) {
  const source = readFileSync(resolve(root, relativePath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName: relativePath,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const sandboxModule = { exports: {} };
  const factory = vm.runInNewContext(`(function (module, exports, require) { ${outputText}\n})`, {
    window: windowMock, crypto: { randomUUID: () => 'new-item' }, Event: class Event {},
    Response, Request, URL, Buffer, TextDecoder, process: { env: runtimeEnv },
    fetch: async (path, options) => {
      assert.equal(path, '/api/shop/quote');
      quoteFetchCalls += 1;
      quoteFetchBody = JSON.parse(options.body);
      return quoteRoute.POST(new Request(`http://localhost${path}`, {
        method: options.method, headers: options.headers, body: options.body,
      }));
    },
  });
  factory(sandboxModule, sandboxModule.exports, (name) => {
    if (!(name in dependencies)) throw new Error(`Unexpected test dependency: ${name}`);
    return dependencies[name];
  });
  return sandboxModule.exports;
}

const productData = loadTypeScript('components/shop/product-detail-data.ts');
const jalali = loadTypeScript('lib/date/jalali.ts');
const iranCities = loadTypeScript('lib/locations/iran-cities.ts');
const globalCities = loadTypeScript('lib/locations/global-cities.ts');
const cities = loadTypeScript('lib/locations/cities.ts', {
  '@/lib/locations/iran-cities': iranCities, '@/lib/locations/global-cities': globalCities,
});
const civilTime = loadTypeScript('lib/shop/shop-civil-time.ts');
const moment = loadTypeScript('lib/shop/shop-personalization.ts', {
  '@/lib/date/jalali': jalali, '@/lib/locations/cities': cities, './shop-civil-time': civilTime,
});
const cart = loadTypeScript('components/shop/shop-cart.ts', {
  './product-detail-data': productData, '@/lib/shop/shop-personalization': moment,
  '@/lib/locations/cities': cities,
});
const checkout = loadTypeScript('components/shop/shop-checkout-state.ts');
const quote = loadTypeScript('lib/shop/shop-quote.ts', {
  '@/components/shop/product-detail-data': productData,
  '@/components/shop/shop-checkout-state': checkout,
});
const origin = loadTypeScript('lib/admin/admin-origin.ts');
const http = loadTypeScript('lib/shop/shop-order-http.ts', {
  '@/lib/admin/admin-origin': origin,
  '@/lib/config/env': { getHalleusRuntimeEnv: () => ({ siteUrl: 'https://halleus.ir' }) },
  './shop-shared-rate-limit': { enforceShopSharedRateLimit: async () => {} },
  './shop-order-contract': { ShopOrderInputError: class ShopOrderInputError extends Error {} },
  './shop-order-store': { ShopOrderStateError: class ShopOrderStateError extends Error {
    constructor(message, status = 409) { super(message); this.status = status; }
  } },
});
const quoteRoute = loadTypeScript('app/api/shop/quote/route.ts', {
  '@/lib/shop/shop-quote': quote, '@/lib/shop/shop-order-http': http,
});
const quoteClient = loadTypeScript('components/shop/shop-quote-client.ts');
const details = { calendar: 'jalali', date: '1403/06/12', time: '', city: '', names: 'نام', message: '' };

assert.deepEqual(Array.from(cart.parseShopCart(null)), []);
assert.deepEqual(Array.from(cart.parseShopCart([{ key: 'x', productId: 'p01', size: 'fake', details, quantity: 1 }])), []);
assert.deepEqual(Array.from(cart.parseShopCart([{ key: 'x', productId: 'p01', size: '20x30', details, quantity: -1 }])), []);
assert.deepEqual(Array.from(cart.parseShopCart([{ key: 'x', productId: 'p02', size: '20x30', details, quantity: 1 }])), []);
assert.deepEqual(Array.from(cart.parseShopCart([{ key: 'x', productId: 'p01', size: '20x30', details: { ...details, date: '' }, quantity: 1 }])), []);
assert.equal(cart.addShopCartItem('p01', '20x30', details), true);
assert.equal(cart.readShopCart().length, 1);
assert.equal(cart.readShopCart()[0].key, 'new-item');
assert.equal(cart.shopCartSubtotal(cart.readShopCart()), 1_599_000);

const first = cart.readShopCart()[0];
assert.equal(cart.writeShopCart([{ ...first, quantity: 2 }]), true);
assert.equal(cart.shopCartSubtotal(cart.readShopCart()), 3_198_000);
assert.equal(cart.addShopCartItem('p01', '10x15', { ...details, names: 'ویرایش' }, 'new-item'), true);
assert.equal(cart.readShopCart()[0].quantity, 2);
assert.equal(cart.readShopCart()[0].details.names, 'ویرایش');
assert.equal(cart.shopCartSubtotal(cart.readShopCart()), 1_800_000);
assert.equal(cart.addShopCartItem('p01', '10x15', details, 'missing'), false);

data.set(cart.SHOP_CART_STORAGE_KEY, '{invalid json');
assert.deepEqual(Array.from(cart.readShopCart()), []);

assert.equal(checkout.SHOP_SHIPPING_AND_PACKAGING.post, 100_000);
assert.equal(checkout.SHOP_SHIPPING_AND_PACKAGING.tipax, 50_000);
assert.equal(checkout.normalizeMobileTail('+989123456789'), '9123456789');
assert.equal(checkout.normalizeMobileTail('۰۹۱۲۳۴۵۶۷۸۹'), '9123456789');
assert.equal(checkout.normalizeMobileTail('۹۱۲۳۴۵۶۷۸۹'), '9123456789');

const shipping = {
  ...checkout.blankShipping, name: 'نام گیرنده', mobile: '9123456789', province: 'تهران',
  city: 'تهران', address: 'خیابان نمونه، پلاک ۱۲', postalCode: '1234567890',
};
assert.equal(checkout.validateShipping(shipping), null);
assert.match(checkout.validateShipping({ ...shipping, mobile: '09123456789' }), /شماره/);
assert.match(checkout.validateShipping({ ...shipping, postalCode: '123' }), /پستی/);
data.set('halleus.shop.checkout.session.v1', JSON.stringify({
  form: shipping, cartFingerprint: JSON.stringify([first]), savedAt: Date.now(),
}));
checkout.clearCheckoutSession();
assert.equal(data.has('halleus.shop.checkout.session.v1'), false, 'erase old saved delivery address');
assert.equal(checkout.readCheckoutSession, undefined, 'never restore recipient PII from browser storage');
assert.equal(checkout.saveCheckoutSession, undefined, 'never persist recipient PII in browser storage');

const minimalLine = { productId: 'p01', size: '20x30', quantity: 2 };
const quotedPost = quote.quoteShopItems({ carrier: 'post', items: [minimalLine] });
assert.equal(quotedPost.subtotal, 3_198_000);
assert.equal(quotedPost.shippingAndPackaging, 100_000);
assert.equal(quotedPost.total, 3_298_000);
assert.equal(quotedPost.itemCount, 2);
assert.equal(quote.quoteShopItems({ carrier: 'tipax', items: [minimalLine] }).total, 3_248_000);
assert.equal(quote.quoteShopItems({ carrier: 'post', items: [{ ...minimalLine, price: 1 }] }).total, 3_298_000);
for (const payload of [
  null, { carrier: 'post', items: [] }, { carrier: 'post', items: Array(21).fill(minimalLine) },
  { carrier: 'courier', items: [minimalLine] },
  { carrier: 'post', items: [{ ...minimalLine, size: 'unknown' }] },
  { carrier: 'post', items: [{ ...minimalLine, productId: 'p04' }] },
  { carrier: 'post', items: [{ ...minimalLine, quantity: 11 }] },
  { carrier: 'post', items: [{ ...minimalLine, quantity: 0 }] },
  { carrier: 'post', items: [{ ...minimalLine, quantity: 1.5 }] },
]) {
  assert.throws(() => quote.quoteShopItems(payload), /Invalid shop quote request/);
}

const apiResponse = await quoteRoute.POST(new Request('http://localhost/api/shop/quote', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ carrier: 'post', items: [minimalLine] }),
}));
assert.equal(apiResponse.status, 200);
assert.equal(apiResponse.headers.get('cache-control'), 'private, no-store');
assert.equal((await apiResponse.json()).quote.total, 3_298_000);
for (const body of ['{', '{}', JSON.stringify({ carrier: 'post', items: [{ ...minimalLine, quantity: -1 }] })]) {
  const invalidResponse = await quoteRoute.POST(new Request('http://localhost/api/shop/quote', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
  }));
  assert.equal(invalidResponse.status, 400);
}
const oversized = await quoteRoute.POST(new Request('http://localhost/api/shop/quote', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ carrier: 'post', items: [minimalLine], filler: 'z'.repeat(8001) }),
}));
assert.equal(oversized.status, 413);
const foreignQuote = await quoteRoute.POST(new Request('http://localhost/api/shop/quote', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://attacker.invalid' },
  body: JSON.stringify({ carrier: 'post', items: [minimalLine] }),
}));
assert.equal(foreignQuote.status, 403);
const trustedQuote = await quoteRoute.POST(new Request('http://localhost/api/shop/quote', {
  method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8', Origin: 'https://halleus.ir' },
  body: JSON.stringify({ carrier: 'post', items: [minimalLine] }),
}));
assert.equal(trustedQuote.status, 200);
const splitQuoteBody = new TextEncoder().encode(JSON.stringify({ carrier: 'post', items: [minimalLine] }));
const streamedQuote = await quoteRoute.POST(new Request('http://localhost/api/shop/quote', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, duplex: 'half',
  body: new ReadableStream({
    start(controller) {
      controller.enqueue(splitQuoteBody.subarray(0, 17));
      controller.enqueue(splitQuoteBody.subarray(17));
      controller.close();
    },
  }),
}));
assert.equal(streamedQuote.status, 200, 'accept valid JSON split over multiple network chunks');
for (const contentType of ['text/plain', 'application/jsonp', 'application/x-www-form-urlencoded']) {
  const response = await quoteRoute.POST(new Request('http://localhost/api/shop/quote', {
    method: 'POST', headers: { 'Content-Type': contentType }, body: '{}',
  }));
  assert.equal(response.status, 415, `${contentType} must not masquerade as JSON`);
}
const declaredOversize = await quoteRoute.POST(new Request('http://localhost/api/shop/quote', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': '999999' }, body: '{}',
}));
assert.equal(declaredOversize.status, 413);
let canceledLargeStream = false;
const chunkedOversize = await quoteRoute.POST(new Request('http://localhost/api/shop/quote', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, duplex: 'half',
  body: new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(5_000));
      controller.enqueue(new Uint8Array(5_000));
    },
    cancel() { canceledLargeStream = true; },
  }),
}));
assert.equal(chunkedOversize.status, 413);
assert.equal(canceledLargeStream, true, 'stop consuming oversized requests instead of buffering them');
const invalidUtf8 = await quoteRoute.POST(new Request('http://localhost/api/shop/quote', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: Uint8Array.from([0xc3, 0x28]),
}));
assert.equal(invalidUtf8.status, 400);
const persianOversize = await quoteRoute.POST(new Request('http://localhost/api/shop/quote', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ carrier: 'post', items: [minimalLine], filler: 'آ'.repeat(4_001) }),
}));
assert.equal(persianOversize.status, 413, 'enforce UTF-8 bytes, not JavaScript character count');
runtimeEnv.NODE_ENV = 'production';
const closed = await quoteRoute.POST(new Request('http://localhost/api/shop/quote', {
  method: 'POST', body: JSON.stringify({ carrier: 'post', items: [minimalLine] }),
}));
assert.equal(closed.status, 404);
runtimeEnv.NODE_ENV = 'development';

const clientPrice = await quoteClient.fetchShopQuote([first], 'tipax');
assert.equal(clientPrice.total, 1_649_000);
assert.equal(quoteFetchCalls, 1);
assert.equal(quoteFetchBody.items[0].productId, 'p01');
assert.equal(quoteFetchBody.items[0].quantity, 1);
assert.equal(quoteFetchBody.items[0].details, undefined);
assert.equal(quoteFetchBody.items[0].key, undefined);

for (const route of ['cart', 'checkout', 'payment', 'track']) {
  const source = readFileSync(resolve(root, `app/shop/${route}/page.tsx`), 'utf8');
  assert.match(source, /process\.env\.NODE_ENV === 'production'/);
  assert.match(source, /index: false/);
}
const paymentSource = readFileSync(resolve(root, 'components/shop/ShopCheckoutFlow.tsx'), 'utf8');
assert.match(paymentSource, /submitShopTransfer\(/);
assert.match(paymentSource, /createShopOrderRequest\(/);
assert.match(paymentSource, /fetchShopOrder\(/);
assert.match(paymentSource, /cancelShopOrder\(/);
assert.match(paymentSource, /هزینه ارسال و بسته‌بندی/);
assert.match(paymentSource, /6219861495472721/);
assert.match(paymentSource, /IR840560611828015359847901/);
assert.doesNotMatch(paymentSource, /بدون ثبت‌نام|MVP|نرخ در انتظار تعیین|پیش‌نمایش صفحهٔ پرداخت|disabled><span>اعلام واریز/);
assert.match(paymentSource, /fetchShopQuote\(items, form\.carrier\)/);
assert.match(paymentSource, /clearLegacyShopOrderIntent\(\)/);
assert.doesNotMatch(paymentSource, /readCheckoutSession|saveCheckoutSession/);
assert.match(paymentSource, /money\(order\.totalToman\)/);
for (const name of ['post', 'tipax']) {
  const png = readFileSync(resolve(root, `public/shop-shipping/${name}.png`));
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
}
console.log('Shop checkout: cart, server-canonical quote/rejections, private persisted order flow, shipping, transfer inputs, PNG assets and production locks passed.');
