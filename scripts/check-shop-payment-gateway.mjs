import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const policySource = readFileSync(resolve(root, 'lib/shop/shop-payment-gateway.ts'), 'utf8');
const contractSource = readFileSync(resolve(root, 'lib/shop/shop-order-contract.ts'), 'utf8');
const orderStoreSource = readFileSync(resolve(root, 'lib/shop/shop-order-store.ts'), 'utf8');
const orderApiSource = readFileSync(resolve(root, 'app/api/shop/orders/route.ts'), 'utf8');

const compiled = ts.transpileModule(policySource, {
  fileName: 'lib/shop/shop-payment-gateway.ts',
  reportDiagnostics: true,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const errors = (compiled.diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
assert.equal(errors.length, 0, 'Gateway typescript syntax must be valid');

const mod = { exports: {} };
const factory = vm.runInNewContext(`(function (module, exports) {
${compiled.outputText}
})`);
factory(mod, mod.exports);
const gateway = mod.exports;

assert.equal(gateway.SHOP_ONLINE_GATEWAY_ENABLED, false, 'An online gateway must remain disabled');
assert.deepEqual(
  Array.from(gateway.SHOP_ENABLED_PAYMENT_METHODS),
  ['manual_transfer'],
  'Only manual transfer may be offered to customers',
);
assert.equal(Object.isFrozen(gateway.SHOP_ENABLED_PAYMENT_METHODS), true);
assert.equal(gateway.isShopManualPaymentSelection(undefined), true, 'Legacy checkout clients remain supported');
assert.equal(gateway.isShopManualPaymentSelection('manual_transfer'), true);
for (const invalid of ['online_gateway', 'card', '', null, true, 0, {}, []]) {
  assert.equal(gateway.isShopManualPaymentSelection(invalid), false, 'Unsupported payment requests must fail closed');
}
assert.match(contractSource, /import\s*\{\s*isShopManualPaymentSelection\s*\}\s*from\s*['"]\.\/shop-payment-gateway['"]/);
assert.match(contractSource, /!isShopManualPaymentSelection\(body\.paymentMethod\)/);
assert.match(orderApiSource, /parseShopOrderDraft\(/);
assert.match(orderStoreSource, /'awaiting_transfer'/);
assert.match(orderStoreSource, /'verify_payment'/);
assert.doesNotMatch(policySource, /process\.env|\bfetch\s*\(|\bpayment_verified\s*\(/);
console.log('shop payment gateway guard: manual transfer only; future adapter contract remains inactive (PASS)');
