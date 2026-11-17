import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const root = join(import.meta.dirname, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');
for (const path of [
  'app/shop/nemad-man/[month]/page.tsx',
  'components/shop/ProductDetail.tsx',
  'components/shop/product-detail-data.ts',
]) {
  const result = ts.transpileModule(read(path), {
    fileName: path, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const errors = (result.diagnostics ?? []).filter(x => x.category === ts.DiagnosticCategory.Error);
  assert.deepEqual(errors.map(x => ts.flattenDiagnosticMessageText(x.messageText, '\n')), [], 'Parse: ' + path);
}
const route = read('app/shop/nemad-man/[month]/page.tsx');
const client = read('components/shop/ProductDetail.tsx');
const poster = read('components/shop/NemadManBahmanArtwork.tsx');
assert.match(route, /process\.env\.NODE_ENV === 'production'\) notFound\(\)/);
assert.match(route, /robots: \{ index: false, follow: false \}/);
assert.ok(client.includes('nemad?.product ?? getShopProduct(id)'), 'Must reuse P03 ProductDetail');
assert.ok(client.includes('<NemadManBahmanArtwork'), 'Must reuse existing approved artwork SVG');
assert.ok(client.includes('validateBahmanPreview(form.names, form.date,'), 'Actual zodiac selector required');
assert.ok(client.includes('disabled={!nemad && id !== \'p01\'}'), 'Purchases stay disabled');
assert.ok(client.includes('nemad.months.map'), 'Month navigation required');
assert.ok(poster.includes('cx="450" cy="430" r="380"'), 'Approved artwork unchanged');
const months = [
  'farvardin','ordibehesht','khordad','tir','mordad','shahrivar',
  'mehr','aban','azar','dey','bahman','esfand',
];
for (const slug of months) {
  const path = 'content/shop-seo/2026-11-06/nemad-man/' + slug +
    '-approved-' + (slug === 'bahman' ? 'v3' : 'v2') + '.md';
  assert.ok(existsSync(join(root, path)), 'Missing approved copy ' + slug);
  const md = read(path);
  const starts = [...md.matchAll(/<!-- شروع متن قابل‌نمایش محصول[^\n]*-->/g)];
  const ends = [...md.matchAll(/<!-- پایان متن قابل‌نمایش محصول[^\n]*-->/g)];
  assert.equal(starts.length, 1);
  assert.equal(ends.length, 1);
  assert.ok(starts[0].index < ends[0].index);
  const visible = md.slice(starts[0].index + starts[0][0].length, ends[0].index);
  assert.match(visible, /^# /m);
  assert.match(visible, /^## /m);
  assert.match(visible, /^### /m);
  assert.ok(!visible.includes('## گزارش کنترل') && !visible.includes('## یادداشت تحریری'),
    'Internal SEO notes leaked: ' + slug);
}
assert.equal((route.match(/\{ slug: '[a-z]+', title: '/g) ?? []).length, 12);
console.log('NEMAD_MAN_PRODUCT_PAGES=12; APPROVED_CONTENT_BOUNDED=PASS; PURCHASE_DISABLED=PASS');
