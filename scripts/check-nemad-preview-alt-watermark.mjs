import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
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
  ["alt: 'تابلو ماه تولد ' + months[index].title", 'dark wall mockup'],
  ["alt: 'هدیه برای متولدین ' + months[index].title", 'dark gift mockup'],
  ["alt: 'کادو تولد ' + months[index].title", 'early dark scene'],
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
    'تابلو ماه تولد ' + month,
    'هدیه برای متولدین ' + month,
    ...(index < 3 ? ['کادو تولد ' + month] : []),
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
  const galleryDir = resolve(root, 'public/shop-preview/nemad-man/' + slug);
  const darkMockups = readdirSync(galleryDir).filter(name => /-dark-.*\.webp$/.test(name));
  assert.equal(darkMockups.length, index < 3 ? 3 : 2,
    'Unexpected count of dark mockups: ' + slug);
  for (const filename of darkMockups) {
    assert.ok(route.includes(filename), 'Missing dark scene in gallery data: ' + filename);
    const data = readFileSync(resolve(galleryDir, filename));
    assert.ok(data.length > 20_000 && data.length < 100_000);
    assert.equal(data.toString('ascii', 0, 4), 'RIFF');
    assert.equal(data.toString('ascii', 8, 12), 'WEBP');
  }
  assert.equal(darkMockups.length + 1 + (index >= 3 ? 1 : 0), 4,
    'Each Nemad month must have exactly four mockup photographs');
  galleryImages += keywords.length;
}
assert.equal(galleryImages, 72, '12 months must have 72 distinct ALT keyword assignments');
assert.match(route, /<BirthSkyLiveProduct key=\{month\} purchaseEnabled=\{isShopNemadOrderEnabled\(\)\} nemad=\{data\}/);
assert.ok(!route.includes('return <ProductDetail'), 'All months must use the Bahman renderer');
assert.match(route, /initial\.value\.sign\.id/);
assert.match(live, /const nemadMonthNumber = nemad \? nemad\.months\.findIndex/);
assert.ok(!live.includes("nemad.slug !== 'bahman'"), 'Sale gate must cover all approved Nemad months');
assert.match(live, /alt=\{nemad \? photo.alt : ''\}/);
assert.match(detail, /alt=\{nemad \? photo.alt : ''\}/);

assert.equal((live.match(/<NemadPreviewWatermark theme=\{nemadTheme\}/g) ?? []).length, 3);
assert.equal((detail.match(/<NemadPreviewWatermark theme=\{nemadTheme\}/g) ?? []).length, 4);
assert.ok(watermark.includes('aria-hidden="true"'));
assert.ok(watermark.includes('data-theme={theme}'));
assert.equal((watermark.match(/dir="rtl" lang="fa">پیش‌نمایش<\/span>/g) ?? []).length, 2);
assert.equal((watermark.match(/dir="ltr">HALLEUS<\/span>/g) ?? []).length, 2);
assert.match(css, /pointer-events: none/);
assert.match(css, /font-family: var\(--font-persian\)/);
assert.match(css, /\.surface\[data-theme='light'\] \.seal/);
assert.ok(!css.includes('mix-blend-mode'), 'Preview must not invert colors');
assert.ok(!watermark.includes('HALLEUS · پیش‌نمایش'), 'Legacy mixed-direction text must not return');
assert.match(live, /zoomText=\{\{ name: nemadPreview\.name, date: nemadPreview\.gregorianDate, sign: nemadPreview\.sign\.displayFa \}\}/);
assert.match(detail, /zoomText=\{\{ name: artwork\.name, date: artwork\.gregorianDate, sign: artwork\.sign\.displayFa \}\}/);
assert.match(watermark, /nemadPreviewEstedadFontClassName/);
assert.match(watermark, /data-zoom-text=\{zoomText \? 'true' : undefined\}/);
assert.match(watermark, /dir=\{latinName \? 'ltr' : 'rtl'\}/);
assert.match(css, /unicode-bidi: isolate/);
assert.match(css, /visibility: hidden/);
assert.match(read('components/shop/product-detail.module.css'), /\.zoomPhoto \.nemadArtwork \{/);
assert.match(read('components/shop/NemadManBahmanArtwork.tsx'), /export const nemadPreviewEstedadFontClassName = estedad\.className/);
assert.ok(!read('components/shop/NemadManBahmanArtwork.tsx').includes('NemadPreviewWatermark'),
  'Print/export SVG must never carry the customer preview watermark');
console.log('NEMAD_PREVIEW_ALT_WATERMARK=PASS: 72 distinct approved ALT keywords, 48 mockups, 12 months, shared live renderer, screen watermarks');
