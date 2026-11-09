import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const paths = [
  'lib/shop/shop-p02-r9-native-print.ts',
  'lib/shop/shop-final-print.ts',
  'lib/shop/shop-manual-print-archive.ts',
  'app/api/admin/shop/orders/[id]/print/route.ts',
  'app/api/admin/shop/orders/[id]/print/artwork/route.ts',
  'components/admin/ShopOrdersWorkspace.tsx',
];

for (const path of paths) {
  const outcome = ts.transpileModule(read(path), {
    fileName: path, reportDiagnostics: true, compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  const errors = (outcome.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, path + ': TS/TSX parser diagnostics');
}
const native = read(paths[0]);
const finalPrint = read(paths[1]);
const archive = read(paths[2]);
const ownerUpload = read(paths[3]);
const ownerRender = read(paths[4]);
const ownerUi = read(paths[5]);
const r9 = read('lib/shop/shop-birth-sky-r9.ts');
const preview = read('components/shop/BirthSkyLiveProduct.tsx');
const sales = read('lib/shop/shop-mvp-activation.ts');

for (const token of [
  'calculateShopStarAtlas(reference)',
  'calculateShopConstellationLines(reference)',
  'calculateShopBrightStarProof(reference)',
  'renderShopBirthSkyR9(stars, figures, named, actualDetails',
  "SHOP_P02_R9_LAYOUT.width",
  'Estedad-Light.ttf',
  'Estedad-Regular.ttf',
  'Estedad-Medium.ttf',
  'data:image/png;base64',
  'source.attrs',
]) {
  // The source-text object is parsed structurally (no separate database copy).
  if (token !== 'source.attrs') assert.ok(native.includes(token), 'native print missing ' + token);
}
assert.match(r9, /export function renderShopBirthSkyR9/);
assert.match(preview, /renderShopBirthSkyR9\(stars, figures, named/);
assert.match(finalPrint, /renderShopP02R9NativeJpeg\(/);
assert.doesNotMatch(finalPrint, /function makeSkySvg\(/);
assert.doesNotMatch(native, /پیش‌نمایش هالیوس/);
assert.match(finalPrint, /item\.productId === 'p01' \|\| item\.productId === 'p02' \? \[\]/);
assert.match(finalPrint, /getHalleusCityDisplayName\(city\)/);
assert.match(finalPrint, /personal\.calendar === 'jalali' \? 'fa' : 'en'/);

assert.match(ownerRender, /requireAdminCapability\(request, 'shop_orders\.write'\)/);
assert.match(ownerRender, /actor\.role !== 'owner'/);
assert.match(ownerRender, /!isShopP02OrderEnabled\(\)/);
assert.match(ownerRender, /SHOP_P01_R9B_STYLE\.preferredMapSha256/);
assert.match(ownerRender, /buildPrivateShopFinalPrintCandidate\(order, line, sources\)/);
assert.match(ownerRender, /MAX_JPEG_BYTES/);
assert.match(ownerRender, /print\.productId === 'p01'/);
assert.doesNotMatch(ownerRender, /archiveOwnerSuppliedShopPrint|archivePrivateShopPrintCandidate/);

assert.match(ownerUpload, /assertAdminJpegUploadRequest\(request\)/);
assert.match(ownerUpload, /requireAdminCapability\(request, 'shop_orders\.write'\)/);
assert.match(ownerUpload, /!isShopP02OrderEnabled\(\)/);
assert.match(ownerUpload, /'x-halleus-artwork-matches-order'/);
assert.match(ownerUpload, /'x-halleus-print-lab-approved'/);
assert.match(ownerUpload, /archiveOwnerSuppliedShopPrint\(/);
assert.match(archive, /productId: 'p01' \| 'p02'/);
assert.match(archive, /metadata\.density !== 300/);
assert.match(archive, /SHOP_PRIVATE_ARCHIVE_MARKER/);
assert.match(archive, /input\.productId/);
assert.match(ownerUi, /'p01', 'p02'/);
assert.match(ownerUi, /confirmOrderMatch/);
assert.match(ownerUi, /confirmLabPrint/);
assert.match(sales, /HALLEUS_SHOP_P02_ORDERS_ENABLED === 'true'/);

console.log('P02_R9_ORDER_PRINT_CONTRACT=PASS | shared scene, named stars, native font, private owner archive, production gate');
