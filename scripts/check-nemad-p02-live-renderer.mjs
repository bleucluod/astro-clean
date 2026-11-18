import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const read = p => readFileSync(resolve(root, p), 'utf8');
const p02 = read('components/shop/BirthSkyLiveProduct.tsx');
const route = read('app/shop/nemad-man/[month]/page.tsx');
const oldRoute = read('app/shop/birth-sky-map/page.tsx');
const editorial = read('components/shop/NemadManEditorial.tsx');
const artwork = read('components/shop/NemadManBahmanArtwork.tsx');

for (const path of [
  'components/shop/BirthSkyLiveProduct.tsx',
  'components/shop/NemadManEditorial.tsx',
  'components/shop/NemadFullWidthIntro.tsx',
  'app/shop/nemad-man/[month]/page.tsx',
]) {
  const source = read(path);
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.ES2022, true,
    ts.ScriptKind.TSX);
  assert.deepEqual(ast.parseDiagnostics.map(e => ts.flattenDiagnosticMessageText(e.messageText, '\n')), [],
    'TSX syntax: ' + path);
}

assert.match(route, /<BirthSkyLiveProduct purchaseEnabled=\{isShopNemadOrderEnabled\(\)\} nemad=\{data\}/);
assert.match(oldRoute, /<BirthSkyLiveProduct purchaseEnabled=\{isShopP02OrderEnabled\(\)\}/);
assert.match(p02, /data-shop-page=\{nemad \? 'nm-live-product' : 'p02-live-product'\}/);
assert.match(p02, /const gallery = nemad \? nemad\.product\.gallery\.slice\(2\) : BIRTH_SKY_GALLERY/);
assert.match(p02, /const visiblePrice = selectedPrice \?\? previewBasePrice/);
assert.match(p02, /previewBasePrice = nemad && process\.env\.NODE_ENV !== 'production'/);
assert.match(p02, /const localCartReview = Boolean\(nemad && process\.env\.NODE_ENV !== 'production'\)/);
assert.match(p02, /selectedPrice === null && !localCartReview/);
assert.match(p02, /previewBasePrice !== null \? 'قیمت پایهٔ این اندازه'/);
assert.match(p02, /ثبت نهایی سفارش تا تأیید قیمت سرور امکان‌پذیر نیست/);
assert.match(read('components/shop/birth-sky-live-product.module.css'), /\.page \.priceStatus/);
const checkout = read('components/shop/ShopCheckoutFlow.tsx');
assert.match(checkout, /next === 'checkout' && prices === null && items\.length > 0/);
assert.match(checkout, /showNemadBase = process\.env\.NODE_ENV !== 'production'/);
assert.match(checkout, /items\.every\(item => item\.productId === 'nm'\)/);
assert.match(checkout, /next === 'checkout' && prices !== null \? <Link/);
assert.match(checkout, /تا دریافت قیمت قطعی از سرور، ادامهٔ سفارش و پرداخت فعال نمی‌شود/);
for (const marker of [
  'pdStyles.productHero', 'pdStyles.purchasePanel', 'pdStyles.priceBlock',
  'pdStyles.sizes', 'pdStyles.sizeGrid', 'pdStyles.personalizeForm',
  'pdStyles.dimensionsSection', 'pdStyles.zoomDialog', 'gallerySwipe.touchHandlers',
  'useShopGallerySwipe(changePhoto)', 'NemadManBahmanArtwork',
  "liveShopPrice(livePrices.prices, nemad ? 'nm' : 'p02'",
  "addShopCartItem('nm'",
  "addShopCartItem('p02'",
  "validateBahmanPreview(values.names, values.date",
  "validateShopMoment('p02', values)",
  'makeWatermarkedPreview(svg, fontFamily)',
]) assert.ok(p02.includes(marker), 'Shared renderer missing ' + marker);

assert.match(editorial, /product\.storyTitle/);
assert.match(editorial, /product\.qualityTitle/);
assert.match(editorial, /product\.preCraftSections/);
assert.match(editorial, /product\.faq\.map/);
assert.match(editorial, /product\.postCraftSections/);
assert.match(editorial, /product\.closingCopy/);
assert.match(artwork, /viewBox="0 0 900 1350"/);
assert.ok(!p02.includes("addShopCartItem('p03'"), 'NM must never enter P03 orders');
assert.match(route, /month !== 'bahman' \|\| !isShopNemadOrderEnabled\(\)/);

const monthSlugs = [
  'farvardin', 'ordibehesht', 'khordad', 'tir', 'mordad', 'shahrivar',
  'mehr', 'aban', 'azar', 'dey', 'bahman', 'esfand',
];
assert.match(route, /product\.gallery\.push\(\{/);
assert.match(route, /'\/shop-preview\/nemad-man\/' \+ slug \+ '\/arad-light-black-edge-20261118\.webp'/);
for (const slug of monthSlugs) {
  const path = 'public/shop-preview/nemad-man/' + slug + '/arad-light-black-edge-20261118.webp';
  const file = resolve(root, path);
  assert.ok(existsSync(file), 'Missing approved new light mockup: ' + path);
  assert.ok(statSync(file).size > 20_000 && statSync(file).size < 100_000,
    'New approved mockup exceeds size bounds: ' + path);
  const bytes = readFileSync(file);
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', 'Invalid WebP header: ' + path);
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', 'Invalid WebP brand: ' + path);
}
const extraLightMonths = monthSlugs.slice(3);
assert.equal(extraLightMonths.length, 9);
assert.match(route, /if \(index >= 3\) product\.gallery\.push\(\{/);
assert.match(route, /'\/shop-preview\/nemad-man\/' \+ slug \+ '\/halle-light-30x45-black-edge-20261118\.webp'/);
for (const slug of extraLightMonths) {
  const path = 'public/shop-preview/nemad-man/' + slug + '/halle-light-30x45-black-edge-20261118.webp';
  const file = resolve(root, path);
  assert.ok(existsSync(file), 'Missing approved 30x45 light mockup: ' + path);
  const bytes = readFileSync(file);
  assert.ok(bytes.length > 20_000 && bytes.length < 100_000,
    'New 30x45 mockup exceeds size bounds: ' + path);
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
}
for (const dark of ['02-nora-1370-11-18-dark-wall-bench.webp',
  '04-sina-1373-11-16-dark-gift-wrap.webp']) {
  const file = resolve(root, 'public/shop-preview/nemad-man/bahman', dark);
  assert.ok(existsSync(file), 'Missing retained dark mockup: ' + dark);
  assert.match(route, new RegExp(dark.replaceAll('.', '\\.')));
}
for (const oldLight of ['01-mahsa-1387-11-12-light-console.webp',
  '03-reza-1372-11-14-light-workdesk.webp']) {
  assert.ok(!route.includes(oldLight), 'Deprecated light mockup remains in Bahman gallery: ' + oldLight);
}
const legacyGallery = read('components/shop/ProductDetail.tsx');
assert.match(legacyGallery, /!nemad && product\.galleryNote/);
assert.match(legacyGallery, /!nemad && id === 'p01'/);
assert.match(p02, /\{!nemad \? <>/);
assert.ok(!p02.includes('nemad.product.galleryNote'),
  'Do not display approved editorial gallery note under Nemad gallery');
const p02CaptionBlock = p02.match(/\{!nemad \? <>([\s\S]*?)<\/> : null\}/)?.[1] ?? '';
assert.ok(p02CaptionBlock.includes('pdStyles.galleryPosition') &&
  p02CaptionBlock.includes('pdStyles.galleryCaption'),
  'Gallery position and caption must be present only in the original P02 branch');
// Product pages must start with the lowest-priced 10x15 size, including P01, P02, P03 and NM.
assert.match(p02, /const \[sizeIndex, setSizeIndex\] = useState\(0\)/);
assert.match(legacyGallery, /const \[sizeIndex, setSizeIndex\] = useState\(0\)/);
assert.match(p02, /const \[photoIndex, setPhotoIndex\] = useState\(nemad \? 1 : 5\)/);
const nemadGuide = p02.match(/\(nemad \? \[([\s\S]*?)\] : \[/)?.[1] ?? '';
assert.match(nemadGuide, /gallery\[1\]\.src[^\n]+size: '۱۰ × ۱۵'/);
assert.match(nemadGuide, /gallery\[0\]\.src[^\n]+size: '۲۰ × ۳۰'/);
assert.match(nemadGuide, /gallery\[3\]\.src[^\n]+size: '۳۰ × ۴۵'/);
// The Nemad introduction and both specifications live outside the form column.
const overview = read('components/shop/NemadFullWidthIntro.tsx');
const overviewCss = read('components/shop/product-detail.module.css');
assert.match(overview, /className=\{styles\.nemadWideOverview\}/);
assert.match(overview, /\{introduction\}/);
assert.match(overview, /محاسبهٔ نشان خورشیدی بر اساس تاریخ تولد/);
assert.match(overview, /چاپ مات روی شاسی بدون قاب در سه اندازه/);
assert.match(overviewCss, /\.nemadWideOverview\s*\{[^}]*width: 100%/);
assert.match(overviewCss, /\.page \.nemadWideIntroduction\s*\{[^}]*max-width: none/);
for (const [source, formClass, introProp, heroClass, guideClass] of [
  [p02, 'pdStyles', 'nemad.product.introduction', 'pdStyles.productHero', 'pdStyles.dimensionsSection'],
  [legacyGallery, 'styles', 'product.introduction', 'styles.productHero', 'styles.dimensionsSection'],
]) {
  const heroStart = source.indexOf('className={' + heroClass + '}');
  const heroEnd = source.indexOf('</section>', heroStart);
  const overviewAt = source.indexOf('<NemadFullWidthIntro introduction={' + introProp + '} />');
  const sizeGuideAt = source.indexOf('className={' + guideClass + '}');
  assert.ok(heroStart >= 0 && heroEnd > heroStart && overviewAt > heroEnd &&
    sizeGuideAt > overviewAt, 'Nemad overview must follow the hero and precede size guide');
  assert.equal(source.split('<NemadFullWidthIntro introduction={').length - 1, 1,
    'Render Nemad overview exactly once per product page');
  assert.ok(source.includes('{!nemad ? <p className={' + formClass + '.introduction}>'),
    'Keep original non-Nemad introduction unchanged');
  assert.ok(!source.includes('{nemad ? <p className={' + formClass + '.introduction}>'),
    'Do not render Nemad copy inside the form column');
}
assert.ok(read('content/shop-seo/2026-11-06/nemad-man/bahman-approved-v3.md')
  .includes('«نماد من» تصویر آشنای آکواریوس (Aquarius)'));
console.log('NEMAD_P02_LIVE_RENDERER=PASS: P02 unchanged, 21 approved light WebPs, Bahman dark mockups, no Nemad gallery captions');
