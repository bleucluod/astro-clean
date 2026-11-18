import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const route = read('app/shop/nemad-man/[month]/page.tsx');
const live = read('components/shop/BirthSkyLiveProduct.tsx');
const detail = read('components/shop/ProductDetail.tsx');
const watermark = read('components/shop/NemadPreviewWatermark.tsx');
const css = read('components/shop/nemad-preview-watermark.module.css');

for (const file of [
  'app/shop/nemad-man/[month]/page.tsx',
  'components/shop/BirthSkyLiveProduct.tsx',
  'components/shop/ProductDetail.tsx',
  'components/shop/NemadPreviewWatermark.tsx',
]) {
  const ast = ts.createSourceFile(file, read(file), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
  assert.deepEqual(ast.parseDiagnostics.map(e => ts.flattenDiagnosticMessageText(e.messageText, '\n')), [],
    'TSX parse failure: ' + file);
}

assert.match(route, /validateBahmanPreview\('نام شما', sampleDate\)/);
assert.ok(!route.includes("validateBahmanPreview('آراد', sampleDate)"));
assert.match(live, /cityId: '', names: '', message: ''/);
assert.match(live, /placeholder=\{nemad \? 'نام شما'/);
assert.match(detail, /placeholder=\{nemad \? 'نام شما'/);
assert.ok(!route.includes('مینیمال مشکی'));
assert.ok(!live.includes('مینیمال مشکی'));
assert.ok(!detail.includes('مینیمال مشکی'));
assert.ok(route.includes("label: 'مینیمال تیره'"));
assert.ok(live.includes("['dark', 'مینیمال تیره']"));
assert.ok(detail.includes("'مینیمال تیره' : 'مینیمال روشن'"));

for (const [marker, keyword] of [
  ["alt: 'تابلو نماد ماه تولد ' + month", 'dark theme'],
  ["alt: 'تابلو نماد ماه ' + month", 'light theme'],
  ["alt: 'تابلو نماد ' + months[index].title + ' سفارشی", 'first light mockup'],
  ["alt: 'تابلو ماه تولد ' + months[index].title + ' با اسم", 'additional light mockup'],
  ['تابلو ماه تولد بهمن؛ موکاپ تیره', 'Bahman wall mockup'],
  ['هدیه برای متولدین بهمن؛ موکاپ تیره', 'Bahman gift mockup'],
]) assert.ok(route.includes(marker), 'Missing distinct approved ALT keyword: ' + keyword);

const months = [
  ['farvardin', 'فروردین'], ['ordibehesht', 'اردیبهشت'], ['khordad', 'خرداد'],
  ['tir', 'تیر'], ['mordad', 'مرداد'], ['shahrivar', 'شهریور'],
  ['mehr', 'مهر'], ['aban', 'آبان'], ['azar', 'آذر'],
  ['dey', 'دی'], ['bahman', 'بهمن'], ['esfand', 'اسفند'],
];
let galleryImages = 0;
for (let index = 0; index < months.length; index++) {
  const [slug, month] = months[index];
  const approved = read('content/shop-seo/2026-11-06/nemad-man/' +
    slug + '-approved-' + (slug === 'bahman' ? 'v3' : 'v2') + '.md');
  const keywords = [
    'تابلو نماد ماه تولد ' + month,
    'تابلو نماد ماه ' + month,
    ...(slug === 'bahman' ? ['تابلو ماه تولد بهمن', 'هدیه برای متولدین بهمن'] : []),
    'تابلو نماد ' + month + ' سفارشی',
    ...(index >= 3 ? ['تابلو ماه تولد ' + month + ' با اسم'] : []),
  ];
  assert.equal(new Set(keywords).size, keywords.length, 'Repeated keyword on ' + slug);
  for (const keyword of keywords)
    assert.ok(approved.includes(keyword), 'Keyword not exact-match approved: ' + slug + ' / ' + keyword);
  assert.ok(existsSync(resolve(root, 'public/shop-preview/nemad-man/' +
    slug + '/arad-light-black-edge-20261118.webp')));
  if (index >= 3) assert.ok(existsSync(resolve(root, 'public/shop-preview/nemad-man/' +
    slug + '/halle-light-30x45-black-edge-20261118.webp')));
  galleryImages += keywords.length;
}
assert.equal(galleryImages, 47, '12 months must have 47 distinct gallery image keyword assignments');
assert.match(live, /alt=\{nemad \? photo.alt : ''\}/);
assert.match(detail, /alt=\{nemad \? photo.alt : ''\}/);

assert.equal((live.match(/<NemadPreviewWatermark>/g) ?? []).length, 3);
assert.equal((detail.match(/<NemadPreviewWatermark>/g) ?? []).length, 4);
assert.ok(watermark.includes('aria-hidden="true"'));
assert.ok(watermark.includes('HALLEUS · پیش‌نمایش'));
assert.match(css, /pointer-events: none/);
assert.match(css, /mix-blend-mode: difference/);
assert.ok(!read('components/shop/NemadManBahmanArtwork.tsx').includes('NemadPreviewWatermark'),
  'Print/export SVG must never carry the customer preview watermark');
console.log('NEMAD_PREVIEW_ALT_WATERMARK=PASS: 47 distinct approved ALT keywords, 12 months, blank customer name, 7 screen watermarks, no print watermark');
