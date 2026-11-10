import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
function load(path, env = {}, imports = {}) {
  const source = readFileSync(resolve(root, path), 'utf8');
  const compiled = ts.transpileModule(source, {
    fileName: path, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  assert.equal((compiled.diagnostics ?? []).filter(x => x.category === ts.DiagnosticCategory.Error).length, 0);
  const mod = { exports: {} };
  const factory = vm.runInNewContext('(function(module,exports,require,process,Buffer){\n'
    + compiled.outputText + '\n})');
  factory(mod, mod.exports, key => {
    if (!(key in imports)) throw new Error('Unexpected dependency: ' + key);
    return imports[key];
  }, { env }, Buffer);
  return mod.exports;
}

const enabled = {
  HALLEUS_BITPAY_SOURCE_READY: 'true',
  HALLEUS_BITPAY_LEDGER_READY: 'true',
  HALLEUS_BITPAY_PAYMENTS_ENABLED: 'true',
  HALLEUS_BITPAY_API_KEY: 'SYNTHETIC_KEY_NOT_REAL',
  HALLEUS_BITPAY_CALLBACK_SECRET: 'SYNTHETIC_CALLBACK_SECRET_MORE_THAN_32_CHARS',
};
function available(env) {
  const gateway = load('lib/shop/shop-payment-gateway.ts', env);
  const readiness = load('lib/shop/shop-bitpay-readiness.ts', env,
    { './shop-payment-gateway': gateway });
  return readiness.isShopBitPayAvailable();
}
assert.equal(available({}), false);
assert.equal(available(enabled), true);
for (const key of Object.keys(enabled)) {
  const missing = { ...enabled };
  delete missing[key];
  assert.equal(available(missing), false, 'missing gate: ' + key);
}
assert.equal(available({ ...enabled, HALLEUS_BITPAY_CALLBACK_SECRET: 'short' }), false);
assert.equal(available({ ...enabled, HALLEUS_BITPAY_API_KEY: 'x' }), false);
for (const key of ['HALLEUS_BITPAY_SOURCE_READY', 'HALLEUS_BITPAY_LEDGER_READY',
  'HALLEUS_BITPAY_PAYMENTS_ENABLED']) {
  assert.equal(available({ ...enabled, [key]: 'false' }), false, 'explicit boolean gate: ' + key);
}
const defaultPolicy = load('lib/shop/shop-payment-gateway.ts', {});
assert.deepEqual(Array.from(defaultPolicy.SHOP_ENABLED_PAYMENT_METHODS), ['manual_transfer']);
assert.equal(defaultPolicy.isShopManualPaymentSelection(undefined), true);
assert.equal(defaultPolicy.isShopManualPaymentSelection('manual_transfer'), true);
for (const invalid of ['online_gateway', 'bitpay', null, 0, true, {}]) {
  assert.equal(defaultPolicy.isShopManualPaymentSelection(invalid), false);
}
console.log('BITPAY_ACTIVATION_GATE=PASS: all independent server flags, default off, manual transfer intact');
