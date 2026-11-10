import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const source = readFileSync(resolve(root, 'lib/shop/shop-mvp-activation.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText;
const env = { NODE_ENV: 'development' };
const mod = { exports: {} };
vm.runInNewContext(`(function(module,exports){${compiled}\n})`, {
  Buffer, process: { env },
})(mod, mod.exports);
const active = mod.exports.isShopMvpActive;
const p02Active = mod.exports.isShopP02OrderEnabled;
assert.equal(p02Active(), true, 'P02 preview/sale is locally testable in development');
assert.equal(active(), true, 'development remains previewable');
env.NODE_ENV = 'production';
assert.equal(active(), false, 'production must stay closed by default');
assert.equal(p02Active(), false, 'P02 must remain separately locked in production');
env.HALLEUS_SHOP_MVP_ENABLED = 'true';
assert.equal(active(), false, 'an opt-in alone is insufficient');
Object.assign(env, {
  HALLEUS_SHOP_SHARED_RATE_ENABLED: 'true',
  HALLEUS_SHOP_TRUSTED_CLIENT_IP: 'nginx-overwrite-v1',
  HALLEUS_SHOP_RATE_SECRET: 'a'.repeat(48),
  HALLEUS_SHOP_PRINT_ORIGINALS_DIR: '/private/fixture-originals',
  HALLEUS_SHOP_PRINT_ARCHIVE_ROOT: '/private/fixture-archive',
});
assert.equal(active(), true, 'all explicit release prerequisites permit the intended activation');
assert.equal(p02Active(), false, 'P01 live must never implicitly unlock P02');
env.HALLEUS_SHOP_P02_ORDERS_ENABLED = 'true';
assert.equal(p02Active(), true, 'separate P02 approval plus shop prerequisites');
env.HALLEUS_SHOP_P02_ORDERS_ENABLED = 'false';
assert.equal(p02Active(), false, 'P02 opt-out closes orders');
env.HALLEUS_SHOP_P02_ORDERS_ENABLED = 'true';
for (const [name, replacement] of [
  ['HALLEUS_SHOP_SHARED_RATE_ENABLED', 'false'],
  ['HALLEUS_SHOP_TRUSTED_CLIENT_IP', 'unverified'],
  ['HALLEUS_SHOP_RATE_SECRET', 'short'],
  ['HALLEUS_SHOP_PRINT_ORIGINALS_DIR', ''],
  ['HALLEUS_SHOP_PRINT_ARCHIVE_ROOT', ''],
]) {
  const previous = env[name];
  env[name] = replacement;
  assert.equal(active(), false, `production gate must reject invalid ${name}`);
  assert.equal(p02Active(), false, `P02 must reject invalid ${name}`);
  env[name] = previous;
}
const guardedPages = ['app/shop/page.tsx', 'app/shop/moon-phase-print/page.tsx',
  ...['cart', 'checkout', 'payment', 'track'].map((page) => `app/shop/${page}/page.tsx`)];
const guardedAdmin = ['app/api/admin/shop/orders/route.ts',
  'app/api/admin/shop/orders/[id]/route.ts',
  ...['print/route.ts', 'print/preview/route.ts', 'print/candidate/route.ts'].map(
    (path) => `app/api/admin/shop/orders/[id]/${path}`)];
for (const path of [...guardedPages, ...guardedAdmin]) {
  const contents = readFileSync(resolve(root, path), 'utf8');
  assert.match(contents, /!isShopMvpActive\(\)/, `${path} must honor the closed release boundary`);
}
const p02Page = readFileSync(resolve(root, 'app/shop/birth-sky-map/page.tsx'), 'utf8');
const p02Preview = readFileSync(resolve(root, 'components/shop/BirthSkyLiveProduct.tsx'), 'utf8');
assert.match(p02Page, /<BirthSkyLiveProduct purchaseEnabled=\{isShopP02OrderEnabled\(\)\} \/>/,
  'P02 cart action must honor separate server gate');
assert.ok(p02Page.includes('robots: { index: true, follow: true }'), 'P02 SEO is independent of checkout');
assert.match(p02Preview, /validateShopMoment\('p02', values\)/, 'P02 date, clock and city must be validated');
assert.match(p02Preview, /addShopCartItem\('p02'/, 'P02 must add real personalized items to cart');
assert.doesNotMatch(p02Preview, /fetch\(/, 'P02 preview must not transmit birth inputs');
assert.match(readFileSync(resolve(root, 'app/shop/milky-way-print/page.tsx'), 'utf8'),
  /process\.env\.NODE_ENV === 'production'/, 'P03 must remain closed even when P02 is previewable');
for (const [path, expected] of [
  ['lib/shop/shop-quote.ts', "new Set(['p01', 'p02'])"],
  ['components/shop/shop-cart.ts', "['p01', 'p02']"],
]) {
  const contents = readFileSync(resolve(root, path), 'utf8');
  assert.ok(contents.includes(expected), `${path} allows P01/P02 only; P03 remains blocked`);
}
console.log('Shop MVP activation: default production closure, explicit ingress/private gates, P01 plus separately gated P02; P03 remains closed passed.');
