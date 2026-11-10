import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(resolve(process.cwd(), 'lib/shop/bitpay-ir-client.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  fileName: 'bitpay-ir-client.ts',
  reportDiagnostics: true,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
assert.equal((compiled.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error).length, 0);
const mod = { exports: {} };
const execute = vm.runInNewContext('(function(module, exports, URL, URLSearchParams, AbortSignal) {\n' + compiled.outputText + '\n})');
execute(mod, mod.exports, URL, URLSearchParams, AbortSignal);
const client = mod.exports;
assert.equal(client.BITPAY_IR_CONTRACT_STATE, 'awaiting_merchant_documentation');
assert.equal(client.tomanToRial(100_000), 1_000_000);
for (const amount of [0, -1, 1.2, NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
  assert.throws(() => client.tomanToRial(amount));
}

const secret = 'TEST_NONPRODUCTION_KEY';
const calls = [];
const fetchFake = async (endpoint, options) => {
  const body = new URLSearchParams(options.body);
  calls.push({ endpoint, options, body });
  assert.equal(options.method, 'POST');
  assert.equal(options.redirect, 'error');
  assert.equal(body.get('api'), secret);
  if (endpoint.endsWith('gateway-send')) return { ok: true, text: async () => '12345678' };
  if (endpoint.endsWith('gateway-result-second')) {
    return { ok: true, text: async () => JSON.stringify({ status: 1, factorId: '9876543210123456', amount: 1000000, cardNum: 'REDACTED' }) };
  }
  throw new Error('unexpected endpoint');
};
const created = await client.requestBitPayIrPayment({
  apiKey: secret,
  amountToman: 100_000,
  returnUrl: 'https://halleus.ir/api/shop/payments/bitpay/return?attempt=test',
  factorId: '9876543210123456',
}, fetchFake);
assert.equal(created.providerPaymentId, '12345678');
assert.equal(created.redirectUrl, 'https://bitpay.ir/payment/gateway-12345678-get');
assert.equal(created.amountRial, 1_000_000);
assert.equal(calls[0].body.get('amount'), '1000000');
assert.equal(calls[0].body.get('factorId'), '9876543210123456');
assert.equal(calls[0].body.get('redirect'), 'https://halleus.ir/api/shop/payments/bitpay/return?attempt=test');

const verified = await client.verifyBitPayIrPayment({
  apiKey: secret,
  providerPaymentId: '12345678',
  transactionId: '99887',
  expectedAmountToman: 100_000,
  expectedFactorId: '9876543210123456',
}, fetchFake);
assert.equal(verified.status, 'paid');
assert.equal(verified.providerReference, '99887');
assert.equal(verified.confirmedAmountToman, 100_000);
assert.equal(calls[1].body.get('json'), '1');

for (const badReturn of ['https://evil.example/pay', 'http://halleus.ir/pay', 'javascript:alert(1)']) {
  await assert.rejects(client.requestBitPayIrPayment({
    apiKey: secret, amountToman: 1, factorId: '1', returnUrl: badReturn,
  }, fetchFake));
}
const wrongAmount = async () => ({ ok: true, text: async () => '{"status":1,"amount":999999,"factorId":"9876543210123456"}' });
await assert.rejects(client.verifyBitPayIrPayment({
  apiKey: secret, providerPaymentId: '12345678', transactionId: '99887', expectedAmountToman: 100_000,
  expectedFactorId: '9876543210123456',
}, wrongAmount));
const missingFactor = async () => ({ ok: true, text: async () => '{"status":1,"amount":1000000}' });
await assert.rejects(client.verifyBitPayIrPayment({
  apiKey: secret, providerPaymentId: '12345678', transactionId: '99887', expectedAmountToman: 100_000,
  expectedFactorId: '9876543210123456',
}, missingFactor));
const statusFailed = async () => ({ ok: true, text: async () => '{"status":0,"amount":1000000}' });
const failure = await client.verifyBitPayIrPayment({
  apiKey: secret, providerPaymentId: '12345678', transactionId: '99887', expectedAmountToman: 100_000,
  expectedFactorId: '9876543210123456',
}, statusFailed);
assert.equal(failure.status, 'unconfirmed');
const networkFailure = async () => { throw new Error('secret must not be echoed'); };
await assert.rejects(client.requestBitPayIrPayment({
  apiKey: secret, amountToman: 1, factorId: '1', returnUrl: 'https://halleus.ir/return',
}, networkFailure), (error) => !error.message.includes(secret));
assert.doesNotMatch(source, /process\.env|console\.log|console\.error|NODE_TLS_REJECT_UNAUTHORIZED|https?:\/\/bitpay\.com/);
assert.match(source, /awaiting_merchant_documentation/);
assert.match(source, /redirect: 'error'/);
console.log('BITPAY_IR_CLIENT_R1=PASS: transport, rial amount, redirects, verify, fail-closed fixtures');
