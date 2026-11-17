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
const previewClient = read('components/shop/NemadManBahmanPreview.tsx');
const batchExporter = read('scripts/export-nemad-24.mjs');
const sourcePreview = read('app/shop/nemad-man/bahman-preview/page.tsx');
assert.ok(sourcePreview.includes('initialPreview={result.value}'),
  'The original preview must receive real solar-sign results server-side');
assert.ok(sourcePreview.includes('initialPrintSize={printSize}'),
  'The requested print size must be passed as an initial React prop');
assert.ok(previewClient.includes('useState<NemadPosterSize>(initialPrintSize)'),
  'Existing React preview must initialize size from server props');
assert.ok(previewClient.includes("data-preview-hydrated={hydrated ? 'true' : 'false'}"),
  'Batch process must prove the preview has hydrated before clicking');
assert.ok(batchExporter.includes("url.searchParams.set('batchMonth',String(month))"),
  'Each sample must be loaded through the existing astronomical preview');
assert.ok(batchExporter.includes("batchUrl.searchParams.set('batchPrintSize', chosenSize)"),
  'Exporter must supply requested size before the first React mount');
assert.ok(!batchExporter.includes('Input.insertText'),
  'Do not rely on synthetic browser typing for controlled React inputs');
assert.ok(batchExporter.includes('head.readUInt32BE(16)!==pixels[0]'),
  'Every real PNG must be checked for the selected dimensions');
assert.ok(batchExporter.includes('good!==24||files.length!==24'),
  'All 24 requested images must complete');
assert.match(route, /process\.env\.NODE_ENV === 'production'\) notFound\(\)/);
assert.match(route, /robots: \{ index: false, follow: false \}/);
assert.ok(client.includes('nemad?.product ?? getShopProduct(id)'), 'Must reuse P03 ProductDetail');
assert.ok(client.includes('<NemadManBahmanArtwork'), 'Must reuse existing approved artwork SVG');
assert.ok(client.includes('validateBahmanPreview(form.names, form.date,'), 'Actual zodiac selector required');
assert.ok(client.includes('disabled={!nemad && id !== \'p01\'}'), 'Purchases stay disabled');
assert.ok(client.includes('nemad.months.map'), 'Month navigation required');
assert.ok(client.includes('href={`/shop/${item.slug}-sign`}'),
  'Month links must use direct /shop/month-sign URLs');
const canonical = read('app/shop/[slug]/page.tsx');
assert.match(canonical, /\^\(\[a-z\]\+\)-sign\$/, 'Month-sign suffix contract required');
assert.match(canonical, /monthMetadata\(await monthParams\(props\)\)/,
  'Canonical page must reuse the approved product metadata');
assert.match(canonical, /NemadMonthProductPage\(await monthParams\(props\)\)/,
  'Canonical page must reuse the existing P03 detail page');
const exporter = read('scripts/export-nemad-24.mjs');
assert.match(exporter, /Browser\.setDownloadBehavior/,
  'Batch script must drive the existing browser export');
assert.match(exporter, /24.*exports passed/,
  'Batch exporter must check all 24 images');
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
