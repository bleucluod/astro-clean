import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const source = readFileSync(resolve(root, 'lib/shop/shop-manual-print-archive.ts'), 'utf8');
const route = readFileSync(resolve(root, 'app/api/admin/shop/orders/[id]/print/route.ts'), 'utf8');
const ui = readFileSync(resolve(root, 'components/admin/ShopOrdersWorkspace.tsx'), 'utf8');
assert.match(route, /assertAdminJpegUploadRequest\(request\)/);
const adminAuth = readFileSync(resolve(root, 'lib/admin/admin-auth.ts'), 'utf8');
assert.match(adminAuth, /export function assertAdminJpegUploadRequest\(request: Request\)/);
assert.match(adminAuth, /assertTrustedAdminRequestOrigin\(request, "Cross-origin admin print upload was rejected\."\)/);
assert.match(route, /requireAdminCapability\(request, 'shop_orders\.write'\)/);
assert.match(route, /actor\.role !== 'owner'/);
assert.match(route, /buildPrivateShopPrintHandoff\(order\)/);
assert.match(route, /\['payment_verified', 'preparing'\]\.includes\(order\.status\)/);
assert.match(route, /request\.body\?\.getReader\(\)/);
assert.match(route, /size > maxBytes/);
assert.match(route, /archiveOwnerSuppliedShopPrint\(/);
assert.match(route, /shop\.manual_final_print\.archived/);
assert.match(ui, /uploadFinalPrint\(\)/);
assert.match(ui, /'X-Halleus-Artwork-Matches-Order': 'confirmed'/);
assert.match(ui, /'X-Halleus-Print-Lab-Approved': 'confirmed'/);
assert.match(source, /owner-manual-upload-confirmation/);

const result = ts.transpileModule(source, { fileName: 'shop-manual-print-archive.ts',
  reportDiagnostics: true, compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } });
assert.equal(result.diagnostics?.length ?? 0, 0, 'archive TypeScript parser');
if (process.platform === 'linux') {
  const marker = { name: '.halleus-private-shop-archive', contents: 'HALLEUS_PRIVATE_SHOP_ARCHIVE_V1\n' };
  const mod = { exports: {} };
  vm.runInNewContext(`(function(module,exports,require){${result.outputText}\n})`, {
    process: { platform: 'linux', cwd: () => root }, Buffer,
  })(mod, mod.exports, (name) => {
    if (name === 'sharp') return sharp;
    if (name === './shop-order-number') return { isValidShopOrderNumber: (v) => /^[1-9]\d*$/.test(v) };
    if (name === './shop-print-spec') return { getShopPrintSpec: (size) => {
      assert.equal(size, '10x15');
      return { minimumNativePixels: { width: 1182, height: 1772 } };
    } };
    if (name === './shop-print-archive') return { SHOP_PRIVATE_ARCHIVE_MARKER: marker };
    return createRequire(import.meta.url)(name);
  });
  const archive = mod.exports;
  const temp = await mkdtemp(join(tmpdir(), 'halleus-shop-owner-final-'));
  try {
    const id = '7f0a4b7e-5d87-43e5-87ab-1cb61f09845c';
    const master = await sharp({ create: {
      width: 1182, height: 1772, channels: 3, background: '#233247',
    } }).jpeg({ quality: 90 }).withMetadata({ density: 300, icc: 'srgb' }).toBuffer();
    const input = { root: temp, orderId: id, orderNumber: '9223372036854775807',
      lineNumber: 1, productId: 'p01', size: '10x15', jpeg: master };
    await assert.rejects(() => archive.archiveOwnerSuppliedShopPrint(input));
    await writeFile(join(temp, marker.name), marker.contents, { mode: 0o600 });
    const first = await archive.archiveOwnerSuppliedShopPrint(input);
    assert.equal(first.idempotent, false);
    assert.equal(first.sha256, createHash('sha256').update(master).digest('hex'));
    const second = await archive.archiveOwnerSuppliedShopPrint(input);
    assert.equal(second.idempotent, true);
    const folder = join(temp, id, 'line-1-p01-10x15-manual-final');
    assert.ok(existsSync(join(folder, 'artwork.jpg')));
    assert.deepEqual(await readFile(join(folder, 'artwork.jpg')), master);
    const manifest = JSON.parse(await readFile(join(folder, 'manifest.json'), 'utf8'));
    assert.equal(manifest.printArtworkReady, true);
    assert.equal(manifest.orderNumber, input.orderNumber);
    assert.equal(manifest.approvedBy, 'owner-manual-upload-confirmation');
    const p02 = { ...input, productId: 'p02' };
    const skyFirst = await archive.archiveOwnerSuppliedShopPrint(p02);
    assert.equal(skyFirst.idempotent, false, 'P02 has a separate private archive entry');
    const skyFolder = join(temp, id, 'line-1-p02-10x15-manual-final');
    assert.ok(existsSync(join(skyFolder, 'artwork.jpg')));
    const skyManifest = JSON.parse(await readFile(join(skyFolder, 'manifest.json'), 'utf8'));
    assert.equal(skyManifest.productId, 'p02');
    assert.equal(skyManifest.printArtworkReady, true);
    assert.equal((await archive.archiveOwnerSuppliedShopPrint(p02)).idempotent, true);
    await assert.rejects(() => archive.archiveOwnerSuppliedShopPrint({ ...input, productId: 'p03' }),
      'P03 must remain blocked from the manual approved archive');
    await assert.rejects(() => archive.archiveOwnerSuppliedShopPrint({ ...input, jpeg: Buffer.alloc(9 * 1024 * 1024) }));
    await assert.rejects(() => archive.archiveOwnerSuppliedShopPrint({ ...input, orderId: '../invalid' }));
    await chmod(join(folder, 'manifest.json'), 0o644);
    await assert.rejects(() => archive.archiveOwnerSuppliedShopPrint(input));
    await chmod(join(folder, 'manifest.json'), 0o600);
  } finally { await rm(temp, { recursive: true, force: true }); }
} else {
  console.log('ARCHIVE_LINUX_FILESYSTEM_CHECK=EXTERNAL_BLOCK:requires_linux; source contract checked');
}
console.log('SHOP_MANUAL_PRINT_ARCHIVE=PASS');
