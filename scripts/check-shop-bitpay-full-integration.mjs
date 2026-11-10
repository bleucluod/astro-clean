import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const read = p => readFileSync(resolve(import.meta.dirname, '..', p), 'utf8');
const paths = [
  'lib/shop/shop-bitpay-readiness.ts', 'lib/shop/shop-bitpay-flow.ts',
  'lib/shop/shop-bitpay-attempt-store.ts', 'lib/shop/shop-order-store.ts',
  'components/shop/ShopCheckoutFlow.tsx', 'components/shop/shop-order-client.ts',
  'app/shop/payment/page.tsx', 'app/api/shop/payments/bitpay/start/route.ts',
  'app/api/shop/payments/bitpay/return/route.ts',
];
for (const path of paths) {
  const src = ts.createSourceFile(path, read(path), ts.ScriptTarget.ES2022, true,
    path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  assert.equal(src.parseDiagnostics.length, 0, 'TS/TSX syntax ' + path + ': '
    + src.parseDiagnostics.map(e => ts.flattenDiagnosticMessageText(e.messageText, ' ')).join('; '));
}
const get = read('lib/shop/shop-order-store.ts');
const readiness = read('lib/shop/shop-bitpay-readiness.ts');
const page = read('app/shop/payment/page.tsx');
const ui = read('components/shop/ShopCheckoutFlow.tsx');
const migration = read('database/migrations/0034_private_shop_bitpay_attempts.sql');
const route = read('app/api/shop/payments/bitpay/return/route.ts');
assert.match(read('lib/shop/shop-payment-gateway.ts'), /SHOP_ONLINE_GATEWAY_ENABLED = process\.env\.HALLEUS_BITPAY_SOURCE_READY === 'true'/);
for (const name of ['HALLEUS_BITPAY_LEDGER_READY', 'HALLEUS_BITPAY_PAYMENTS_ENABLED', 'HALLEUS_BITPAY_CALLBACK_SECRET']) {
  assert.ok(readiness.includes(name), 'mandatory live gate ' + name);
}
assert.match(page, /onlineEnabled=\{isShopBitPayAvailable\(\)\}/);
assert.match(ui, /startShopBitPayPayment\(receipt\)/);
assert.match(ui, /order\.onlinePaymentPending/);
assert.match(get, /onlinePaymentPending: await hasPendingShopBitPayAttempt/g);
assert.equal((get.match(/to_regclass\('halleus_private\.shop_payment_attempts'\)/g) ?? []).length, 4);
assert.doesNotMatch(get, /isShopBitPayAvailable/);
assert.match(route, /export async function POST/);
assert.match(route, /2_000/);
assert.match(route, /'Referrer-Policy': 'no-referrer'/);
for (const entry of ['one_unresolved_per_order', 'callback_token_hash text not null unique',
  'provider_transaction_id text unique', 'enable row level security', 'on delete restrict']) {
  assert.ok(migration.includes(entry));
}
assert.doesNotMatch(migration, /drop table|truncate|delete from/i);

const client = read('components/shop/shop-order-client.ts');
const js = ts.transpileModule(client, { fileName: 'shop-order-client.ts',
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const responses = new Map();
const mod = { exports: {} };
const load = vm.runInNewContext('(function(module,exports,require){\n' + js + '\n})', {
  fetch: async path => Response.json(responses.get(path)),
  Response, Request, URL, crypto: {},
});
load(mod, mod.exports, name => {
  if (name === '@/lib/shop/shop-order-number') return { isValidShopOrderNumber: () => true };
  throw new Error('Unexpected module: ' + name);
});
const name = '/api/shop/payments/bitpay/start';
const receipt = { orderNumber: '12', accessCode: 'a'.repeat(64) };
responses.set(name, { ok: true, redirectUrl: 'https://bitpay.ir/payment/gateway-123-get' });
assert.equal(await mod.exports.startShopBitPayPayment(receipt),
  'https://bitpay.ir/payment/gateway-123-get');
for (const bad of ['https://bitpay.ir.evil.test/payment/gateway-123-get',
  'https://bitpay.ir/payment/gateway-123-get?x=1',
  'http://bitpay.ir/payment/gateway-123-get',
  'https://bitpay.ir/payment/gateway-123-get#leak']) {
  responses.set(name, { ok: true, redirectUrl: bad });
  await assert.rejects(mod.exports.startShopBitPayPayment(receipt));
}
console.log('BITPAY_FULL_INTEGRATION=PASS: syntax, privacy, live gate, order concurrency, checkout and redirect origin');
