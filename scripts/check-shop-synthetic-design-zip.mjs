import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const source = readFileSync(resolve(root, 'app/api/admin/shop/design-sample/route.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const calls = [];
const deps = {
  '@/lib/admin/admin-auth': {
    assertAdminMutationRequest: (request) => {
      if (!request.headers.get('content-type')?.includes('application/json')) throw Object.assign(new Error('content type'), { status: 415 });
      if (request.headers.get('origin') !== 'https://halleus.ir') throw Object.assign(new Error('origin'), { status: 403 });
    },
    requireAdminCapability: async (request, capability) => {
      assert.equal(capability, 'shop_orders.read');
      if (request.headers.get('authorization') !== 'Bearer owner') throw Object.assign(new Error('unauthorized'), { status: 401 });
      return { role: request.headers.get('x-test-role') ?? 'owner' };
    },
  },
  '@/lib/admin/admin-http': {
    noStoreJsonResponse: (data, status = 200) => Response.json(data, { status }),
    adminErrorResponse: (error) => Response.json({ ok: false }, { status: error.status ?? 500 }),
  },
  '@/lib/shop/shop-design-handoff-zip': {
    buildPrivateShopDesignHandoffZip: (handoff, options) => {
      calls.push({ handoff, options });
      return Buffer.from('PK\x03\x04mock zip');
    },
  },
  '@/lib/shop/shop-print-handoff': {
    buildPrivateShopPrintHandoff: (order) => order,
  },
  '@/lib/shop/shop-personalization': {
    validateShopMoment: (_productId, details) => details.date === 'bad' ? { ok: false, message: 'invalid date' } : { ok: true },
  },
};
const mod = { exports: {} };
const factory = vm.runInNewContext(`(function(module,exports,require){${outputText}\n})`, { Buffer, Request, Response, Uint8Array });
factory(mod, mod.exports, (name) => {
  if (!(name in deps)) throw new Error(`Unexpected dependency: ${name}`);
  return deps[name];
});

function request(input, overrides = {}) {
  return new Request('https://halleus.ir/api/admin/shop/design-sample', {
    method: 'POST',
    headers: { origin: 'https://halleus.ir', authorization: 'Bearer owner', 'content-type': 'application/json', ...overrides },
    body: JSON.stringify(input),
  });
}
const valid = { calendar: 'jalali', date: '۱۴۰۳/۰۸/۱۵', names: 'نام نمونه', message: '' };
const good = await mod.exports.POST(request(valid));
assert.equal(good.status, 200);
assert.equal(good.headers.get('content-type'), 'application/zip');
assert.equal(good.headers.get('cache-control'), 'private, no-store, max-age=0');
assert.equal(calls.length, 1);
assert.equal(calls[0].options.sampleOnly, true);
assert.equal(calls[0].handoff.display_number, '1');
assert.equal(calls[0].handoff.status, 'payment_verified');
assert.deepEqual(Array.from(calls[0].handoff.items, (item) => item.size), ['10x15', '20x30', '30x45']);
assert.ok(calls[0].handoff.items.every((item) => item.productId === 'p01' && item.details.date === valid.date));

for (const [body, headers, status] of [
  [valid, { authorization: 'Bearer invalid' }, 401],
  [valid, { 'x-test-role': 'editor' }, 403],
  [valid, { origin: 'https://attacker.example' }, 403],
  [valid, { 'content-type': 'text/plain' }, 415],
  [{ ...valid, date: 'bad' }, {}, 422],
  [{ ...valid, calendar: 'untrusted' }, {}, 422],
  [{ ...valid, names: 'x'.repeat(61) }, {}, 422],
  [{ ...valid, message: 'y'.repeat(61) }, {}, 422],
  [{ ...valid, names: 'x'.repeat(2100) }, {}, 413],
]) {
  assert.equal((await mod.exports.POST(request(body, headers))).status, status);
}
assert.equal(calls.length, 1, 'Failed requests must not create ZIPs.');
assert.ok(!source.includes('isShopMvpActive'), 'Sample route must work with public shop closed.');
assert.ok(!source.includes('getAdminShopOrder'), 'Sample route must not access production orders.');
const adminConsoleSource = readFileSync(resolve(root, 'components/admin/AdminConsole.tsx'), 'utf8');
const adminAst = ts.createSourceFile('AdminConsole.tsx', adminConsoleSource, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
let availableTabsExpression = '';
function inspectNode(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(adminAst) === 'availableTabs') {
    availableTabsExpression = node.initializer?.getText(adminAst) ?? '';
  }
  ts.forEachChild(node, inspectNode);
}
inspectNode(adminAst);
assert.ok(availableTabsExpression.includes('hasCapability(session, tab.capability)'), 'Admin tabs must require capabilities.');
assert.ok(!availableTabsExpression.includes('NODE_ENV'), 'Owner shop tab must be visible in production.');
assert.ok(!availableTabsExpression.includes('isShopMvpActive'), 'Admin panel must remain open with public shop closed.');
assert.ok(adminConsoleSource.includes('activeTab === "orders" && session?.role === "owner"'), 'Orders workspace remains owner-only.');
console.log('SHOP_SYNTHETIC_DESIGN_ZIP=PASS');
