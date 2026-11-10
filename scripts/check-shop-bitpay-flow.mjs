import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
function compile(path, dependencies, env = {}) {
  const source = readFileSync(resolve(root, path), 'utf8');
  const js = ts.transpileModule(source, { fileName: path, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  assert.equal((js.diagnostics ?? []).filter(x => x.category === ts.DiagnosticCategory.Error).length, 0);
  const mod = { exports: {} };
  const loader = vm.runInNewContext('(function(module,exports,require){\n' + js.outputText + '\n})', {
    URL, URLSearchParams, Buffer, TextDecoder, Request, Response, process: { env },
  });
  loader(mod, mod.exports, key => {
    assert.ok(key in dependencies, `Unexpected dependency: ${key}`);
    return dependencies[key];
  });
  return mod.exports;
}
const orderNumber = '987654321012345678';
const attemptId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const accessHash = 'a'.repeat(64);
const secret = 'fake-secret-for-synthetic-fixture-only-1234';
const apiKey = 'fake-api-not-a-real-merchant-credential';
let providerCalls = 0, settleCalls = 0, proof = '', current = null, id = null;
let providerStatus = 'paid', alreadyVerified = false;
const deps = {
  'node:crypto': { createHash, createHmac },
  './bitpay-ir-client': {
    requestBitPayIrPayment: async input => {
      providerCalls++;
      assert.equal(input.factorId, orderNumber);
      assert.equal(input.amountToman, 100000);
      assert.equal(input.apiKey, apiKey);
      proof = new URL(input.returnUrl).searchParams.get('proof');
      assert.match(proof, /^[a-f0-9]{64}$/);
      return { providerPaymentId: '12345678', redirectUrl: 'https://bitpay.ir/payment/gateway-12345678-get' };
    },
    verifyBitPayIrPayment: async input => {
      assert.equal(input.expectedFactorId, orderNumber);
      assert.equal(input.expectedAmountToman, 100000);
      assert.equal(input.providerPaymentId, '12345678');
      return providerStatus === 'paid'
        ? { status: 'paid', providerReference: '99887', confirmedAmountToman: 100000 }
        : { status: 'unconfirmed', providerReference: null };
    },
  },
  './shop-bitpay-attempt-store': {
    ShopBitPayAttemptError: class extends Error {},
    reserveBitPayAttempt: async input => {
      if (current) {
        assert.equal(current.callbackTokenHash, input.callbackTokenHash);
        return { id: attemptId, status: id ? 'redirect_ready' : 'created',
          providerPaymentId: id, orderNumber, amountToman: 100000, createdNow: false };
      }
      current = input;
      return { id: attemptId, status: 'created', providerPaymentId: null,
        orderNumber, amountToman: 100000, createdNow: true };
    },
    recordBitPayRedirect: async input => { assert.equal(input.attemptId, attemptId); id = input.providerPaymentId; },
    getBitPayReturnAttempt: async input => input.attemptId === attemptId
      && input.callbackTokenHash === current.callbackTokenHash && id
      ? { attemptId, orderNumber, amountToman: 100000, providerPaymentId: id, status: alreadyVerified ? 'verified' : 'redirect_ready', providerTransactionId: alreadyVerified ? '99887' : null } : null,
    settleVerifiedBitPayAttempt: async input => { settleCalls++; assert.equal(input.trustedVerification.status, 'paid'); },
  },
};
const flow = compile('lib/shop/shop-bitpay-flow.ts', deps, {
  HALLEUS_BITPAY_API_KEY: apiKey, HALLEUS_BITPAY_CALLBACK_SECRET: secret,
});
const first = await flow.startBitPayPayment({ orderNumber, accessHash });
assert.equal(first.redirectUrl, 'https://bitpay.ir/payment/gateway-12345678-get');
await flow.startBitPayPayment({ orderNumber, accessHash });
assert.equal(providerCalls, 1, 'repeat must reuse provider ID');
assert.equal(current.callbackTokenHash, createHash('sha256').update(proof).digest('hex'));
const callback = `https://halleus.ir/api/shop/payments/bitpay/return?attempt=${attemptId}&proof=${proof}&id_get=12345678&trans_id=99887`;
assert.equal(flow.parseBitPayReturnQuery(callback).providerPaymentId, '12345678');
for (const changed of [callback + '&trans_id=9', callback.replace('proof=' + proof, 'proof=0'),
  callback.replace('id_get=12345678', 'id_get=bad')]) {
  await assert.rejects(flow.finishBitPayReturn(changed));
}
providerStatus = 'unconfirmed';
assert.equal(await flow.finishBitPayReturn(callback), 'pending');
assert.equal(settleCalls, 0);
providerStatus = 'paid';
assert.equal(await flow.finishBitPayReturn(callback), 'paid');
assert.equal(settleCalls, 1);
alreadyVerified = true;
assert.equal(await flow.finishBitPayReturn(callback), 'paid', 'genuine duplicate callback');
await assert.rejects(flow.finishBitPayReturn(callback.replace('trans_id=99887', 'trans_id=111')));
assert.equal(settleCalls, 1, 'replays never double settle');
alreadyVerified = false;
current = null; id = null;
await flow.startBitPayPayment({ orderNumber, accessHash });
assert.equal(providerCalls, 2);
current = { ...current }; id = null;
await assert.rejects(flow.startBitPayPayment({ orderNumber, accessHash }));
assert.equal(providerCalls, 2, 'ambiguous payment cannot be requested twice');
const missing = compile('lib/shop/shop-bitpay-flow.ts', deps, {});
await assert.rejects(missing.startBitPayPayment({ orderNumber, accessHash }));
const closedDeps = {
  '@/lib/shop/shop-bitpay-readiness': { isShopBitPayAvailable: () => false },
  '@/lib/shop/shop-bitpay-attempt-store': { ShopBitPayAttemptError: class extends Error {} },
  '@/lib/shop/shop-order-contract': { parseGuestAccess: () => { throw new Error('closed'); } },
  '@/lib/shop/shop-order-http': { shopClosed: () => false,
    shopJson: (body, status) => Response.json(body, { status }),
    readShopRequest: () => { throw new Error('closed'); }, shopErrorResponse: () => { throw new Error('closed'); } },
  '@/lib/shop/shop-bitpay-flow': { startBitPayPayment: () => { throw new Error('closed'); },
    finishBitPayReturn: () => { throw new Error('closed'); } },
  '@/lib/shop/shop-shared-rate-limit': { enforceShopSharedRateLimit: () => { throw new Error('closed'); } },
};
const start = compile('app/api/shop/payments/bitpay/start/route.ts', closedDeps);
const ret = compile('app/api/shop/payments/bitpay/return/route.ts', closedDeps);
assert.equal((await start.POST(new Request('https://halleus.ir/api/shop/payments/bitpay/start'))).status, 404);
assert.equal((await ret.GET(new Request(callback))).status, 404);
const allowed = { ...closedDeps,
  '@/lib/shop/shop-bitpay-readiness': { isShopBitPayAvailable: () => true },
  '@/lib/shop/shop-order-http': { ...closedDeps['@/lib/shop/shop-order-http'],
    readShopRequest: async () => ({}), shopErrorResponse: () => Response.json({ ok: false }, { status: 503 }) },
  '@/lib/shop/shop-order-contract': { parseGuestAccess: () => ({ orderNumber, accessHash }) },
  '@/lib/shop/shop-bitpay-flow': { startBitPayPayment: async () => first, finishBitPayReturn: async () => 'paid' },
  '@/lib/shop/shop-shared-rate-limit': { enforceShopSharedRateLimit: async () => {} },
};
const open = compile('app/api/shop/payments/bitpay/return/route.ts', allowed);
const response = await open.GET(new Request(callback));
assert.equal(response.status, 303);
assert.equal(response.headers.get('Location'), 'https://halleus.ir/shop/payment?bitpay=paid');
assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
assert.ok(!response.headers.get('Location').includes(proof));
const post = await open.POST(new Request(
  'https://halleus.ir/api/shop/payments/bitpay/return?attempt=' + attemptId + '&proof=' + proof,
  { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'id_get=12345678&trans_id=99887' },
));
assert.equal(post.status, 303, 'form POST callback supported');
const longBody = await open.POST(new Request('https://halleus.ir/api/shop/payments/bitpay/return', {
  method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: 'a=' + 'b'.repeat(2200),
}));
assert.equal(longBody.status, 413, 'oversize callbacks denied');
const wrongType = await open.POST(new Request('https://halleus.ir/api/shop/payments/bitpay/return', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
}));
assert.equal(wrongType.status, 415, 'untrusted JSON callbacks denied');

const rate = readFileSync(resolve(root, 'lib/shop/shop-shared-rate-limit.ts'), 'utf8');
assert.match(rate, /'\/api\/shop\/payments\/bitpay\/start': 'bitpay_start'/);
assert.match(rate, /'\/api\/shop\/payments\/bitpay\/return': 'bitpay_return'/);
const ledger = readFileSync(resolve(root, 'lib/shop/shop-bitpay-attempt-store.ts'), 'utf8');
assert.match(ledger, /callback_token_hash = /);
assert.match(ledger, /createdNow: false/);
assert.match(ledger, /createdNow: true/);
console.log('BITPAY_R3_FLOW=PASS: GET/POST callback, duplicate safety, bounded form, disabled route and rate limits');
