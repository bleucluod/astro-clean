import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
function load(path, dependencies = {}) {
  const source = readFileSync(resolve(root, path), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const record = { exports: {} };
  vm.runInNewContext(`(function(module,exports,require){${compiled}\n})`)(
    record, record.exports, (name) => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  );
  return record.exports;
}
const numbers = load('lib/shop/shop-order-number.ts');
const notice = load('lib/shop/shop-manual-notice.ts', { './shop-order-number': numbers });
const number = '9223372036854775807';
const verified = notice.buildShopManualCustomerNotice({ orderNumber: number, status: 'payment_verified' });
assert.match(verified, /پس از بررسی واریز، تأیید شد/);
assert.match(verified, /halleus.ir\/shop\/track/);
assert.match(notice.buildShopManualCustomerNotice({ orderNumber: number, status: 'preparing' }), /۷۲ ساعت کاری/);
const shipped = notice.buildShopManualCustomerNotice({ orderNumber: number, status: 'shipped',
  carrier: 'post', trackingCode: 'POST12345678' });
assert.match(shipped, /پست/);
assert.match(shipped, /POST12345678/);
assert.match(notice.buildShopManualCustomerNotice({ orderNumber: number, status: 'shipped',
  carrier: 'tipax', trackingCode: '1234ABC' }), /تیپاکس/);
for (const status of ['awaiting_transfer', 'transfer_declared', 'payment_rejected', 'cancel_requested', 'canceled', 'delivered']) {
  assert.equal(notice.buildShopManualCustomerNotice({ orderNumber: number, status }), null);
}
for (const code of ['', 'a', '\nhttp://evil.test', '<script>', 'abc\rdef']) {
  assert.equal(notice.buildShopManualCustomerNotice({ orderNumber: number, status: 'shipped',
    carrier: 'post', trackingCode: code }), null);
}
assert.equal(notice.buildShopManualCustomerNotice({ orderNumber: '0', status: 'payment_verified' }), null);
console.log('[PASS] shop-manual-notice: copy-only status messages, private tracking, no premature shipping claim or provider');
