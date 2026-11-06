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
assert.equal(active(), true, 'development remains previewable');
env.NODE_ENV = 'production';
assert.equal(active(), false, 'production must stay closed by default');
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
  env[name] = previous;
}
const guardedPages = ['app/shop/page.tsx', 'app/shop/p01/page.tsx',
  ...['cart', 'checkout', 'payment', 'track'].map((page) => `app/shop/${page}/page.tsx`)];
const guardedAdmin = ['app/api/admin/shop/orders/route.ts',
  'app/api/admin/shop/orders/[id]/route.ts',
  ...['print/route.ts', 'print/preview/route.ts', 'print/candidate/route.ts'].map(
    (path) => `app/api/admin/shop/orders/[id]/${path}`)];
for (const path of [...guardedPages, ...guardedAdmin]) {
  const contents = readFileSync(resolve(root, path), 'utf8');
  assert.match(contents, /!isShopMvpActive\(\)/, `${path} must honor the closed release boundary`);
}
for (const product of ['p02', 'p03']) {
  const page = readFileSync(resolve(root, `app/shop/${product}/page.tsx`), 'utf8');
  assert.match(page, /process\.env\.NODE_ENV === 'production'/,
    `${product} must remain closed even if the first product is activated`);
}
for (const [path, expected] of [
  ['lib/shop/shop-quote.ts', "new Set(['p01'])"],
  ['components/shop/shop-cart.ts', "['p01']"],
]) {
  const contents = readFileSync(resolve(root, path), 'utf8');
  assert.ok(contents.includes(expected), `${path} must refuse postponed products`);
}
console.log('Shop MVP activation: default production closure, explicit ingress/private gates, P01-only sale and postponed P02/P03 passed.');
