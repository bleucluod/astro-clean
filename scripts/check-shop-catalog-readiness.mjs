import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
function load(path, dependencies = {}) {
  const source = readFileSync(resolve(root, path), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const record = { exports: {} };
  vm.runInNewContext(`(function(module,exports,require){${outputText}\n})`, {})(
    record, record.exports, (name) => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`);
      return dependencies[name];
    },
  );
  return record.exports;
}

const sourceCatalog = load('components/shop/product-detail-data.ts');
const readiness = load('lib/shop/shop-catalog-readiness.ts', {
  '@/components/shop/product-detail-data': sourceCatalog,
}).getShopCatalogReadiness();
assert.deepEqual(JSON.parse(JSON.stringify(readiness.map((item) => item.id))), ['p01', 'p02', 'p03']);
assert.equal(sourceCatalog.SHOP_SIZES.length, 3);
const seenGallery = new Set();
for (const entry of readiness) {
  const source = sourceCatalog.getShopProduct(entry.id);
  assert.equal(entry.title, source.title);
  assert.equal(entry.isReadyForProduction, false);
  assert.equal(entry.hasApprovedFinalArtwork, false);
  assert.equal(entry.gallery.length, 4, `${entry.id} needs four genuine gallery views.`);
  assert.equal(entry.sizes.length, 3);
  assert.ok(entry.pendingDecisions.length >= 2);
  assert.ok(entry.pendingDecisions.includes('D-S1-03'));
  assert.ok(entry.pendingDecisions.includes('D-S1-04'));
  for (let index = 0; index < entry.sizes.length; index++) {
    const rendered = entry.sizes[index];
    const canonical = sourceCatalog.SHOP_SIZES[index];
    assert.deepEqual({ label: rendered.label, dimension: rendered.dimension, price: rendered.priceToman },
      { label: canonical.label, dimension: canonical.dimension, price: canonical.price });
    assert.ok(Number.isSafeInteger(rendered.priceToman) && rendered.priceToman > 0);
  }
  for (const gallery of entry.gallery) {
    assert.match(gallery.src, /^\/shop-preview\/[a-z0-9-]+\.webp$/);
    assert.ok(gallery.alt.trim() && gallery.label.trim());
    assert.ok(!seenGallery.has(gallery.src), 'Products must not quietly share mockup sources.');
    seenGallery.add(gallery.src);
    const file = resolve(root, 'public', gallery.src.slice(1));
    assert.ok(existsSync(file), `Gallery file missing: ${file}`);
    const info = await sharp(file).metadata();
    assert.equal(info.format, 'webp');
    assert.ok(info.width >= 500 && info.height >= 800, 'Gallery mockups are preview-sized, not print masters.');
  }
  if (entry.proofNativePixels) {
    assert.deepEqual({ width: entry.proofNativePixels.width, height: entry.proofNativePixels.height },
      { width: 1024, height: 1536 });
  }
}
assert.ok(readiness[0].pendingDecisions.includes('D-S1-01'));
assert.ok(readiness[0].pendingDecisions.includes('D-S1-06'));
assert.ok(readiness[1].pendingDecisions.includes('D-S1-02'));
assert.ok(readiness[2].pendingDecisions.includes('D-S1-05'));
const p03Proof = await sharp(resolve(root, 'assets/shop-print/p03-milky-way-proof-v1.webp')).metadata();
assert.equal(p03Proof.width, 1024);
assert.equal(p03Proof.height, 1536);
assert.ok(existsSync(resolve(root, 'lib/shop/shop-moon-artwork.ts')));
assert.ok(existsSync(resolve(root, 'lib/shop/shop-private-artwork.ts')));

const admin = readFileSync(resolve(root, 'components/admin/AdminConsole.tsx'), 'utf8');
const workspace = readFileSync(resolve(root, 'components/admin/ShopOrdersWorkspace.tsx'), 'utf8');
const board = readFileSync(resolve(root, 'components/admin/ShopCatalogReadiness.tsx'), 'utf8');
assert.match(admin, /activeTab === "orders" && session\?\.role === "owner"/);
assert.match(workspace, /<ShopCatalogReadiness\s*\/>/);
assert.match(board, /getShopCatalogReadiness\(\)/);
assert.match(board, /تغییر قیمت، تصویر یا مجوز چاپ از این پنل انجام نمی‌شود/);
assert.doesNotMatch(board, /\b(onClick|onSubmit|fetch|PATCH|POST|PUT|DELETE)\b/);
const readinessSource = readFileSync(resolve(root, 'lib/shop/shop-catalog-readiness.ts'), 'utf8');
assert.doesNotMatch(readinessSource, /\b(writeFile|createWriteStream|localStorage|sessionStorage|fetch)\b/);
const shopPage = readFileSync(resolve(root, 'app/shop/page.tsx'), 'utf8');
const orderHttp = readFileSync(resolve(root, 'lib/shop/shop-order-http.ts'), 'utf8');
assert.match(shopPage, /process\.env\.NODE_ENV === 'production'/);
assert.match(orderHttp, /process\.env\.NODE_ENV === 'production'/);

const manifest = readFileSync(resolve(root, 'docs/HALLEUS_SHOP_LAUNCH_EXECUTION.md'), 'utf8');
for (const pending of readiness.flatMap((item) => item.pendingDecisions)) {
  assert.ok(manifest.includes(`| ${pending} |`), `Decision missing in durable ledger: ${pending}`);
}
console.log('Shop catalog owner review: 3 canonical products, 12 actual gallery assets, identical 3-size prices, original-proof boundaries, pending decisions, read-only owner-only UI and production closures passed.');
