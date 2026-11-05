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
};
const windowMock = { localStorage: storage, dispatchEvent() {} };

function loadTypeScript(relativePath, dependencies = {}) {
  const source = readFileSync(resolve(root, relativePath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName: relativePath,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const sandboxModule = { exports: {} };
  const factory = vm.runInNewContext(`(function (module, exports, require) { ${outputText}\n})`, {
    window: windowMock, crypto: { randomUUID: () => 'new-item' }, Event: class Event {},
  });
  factory(sandboxModule, sandboxModule.exports, (name) => {
    if (!(name in dependencies)) throw new Error(`Unexpected test dependency: ${name}`);
    return dependencies[name];
  });
  return sandboxModule.exports;
}

const productData = loadTypeScript('components/shop/product-detail-data.ts');
const cart = loadTypeScript('components/shop/shop-cart.ts', { './product-detail-data': productData });
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

for (const route of ['cart', 'checkout', 'payment']) {
  const source = readFileSync(resolve(root, `app/shop/${route}/page.tsx`), 'utf8');
  assert.match(source, /process\.env\.NODE_ENV === 'production'/);
  assert.match(source, /index: false/);
}
const paymentSource = readFileSync(resolve(root, 'components/shop/ShopCheckoutFlow.tsx'), 'utf8');
assert.match(paymentSource, /disabled><span>اعلام واریز/);
assert.match(paymentSource, /هزینهٔ ارسال/);
console.log('Shop checkout preview: cart parsing, persistence, edit, subtotal and production locks passed.');
