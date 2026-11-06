import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { chmod, readFile, rename, symlink, writeFile, mkdtemp, rm, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const source = readFileSync(resolve(root, 'lib/shop/shop-print-archive.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
} }).outputText;
const moduleRecord = { exports: {} };
vm.runInNewContext(`(function(module,exports,require){${compiled}\n})`, {
  process: { cwd: () => root, platform: process.platform }, Buffer,
})(moduleRecord, moduleRecord.exports, (name) => {
  if (name === 'sharp') return sharp;
  if (name === './shop-print-spec') return { getShopPrintSpec: (size) => {
    assert.equal(size, '10x15');
    return { minimumNativePixels: { width: 1182, height: 1772 } };
  } };
  return createRequire(import.meta.url)(name);
});
const archive = moduleRecord.exports;

if (process.platform !== 'linux') {
  console.log('[EXTERNAL_BLOCK] private archive permission test requires Linux host');
  process.exit(0);
}

const temp = await mkdtemp(join(tmpdir(), 'halleus-private-print-archive-'));
const orderId = 'e781a653-fb02-4b3d-8469-d5d100902cea';
const bytes = await sharp({ create: { width: 1182, height: 1772, channels: 3,
  background: '#182637' } }).jpeg({ quality: 90, chromaSubsampling: '4:4:4' })
  .withMetadata({ density: 300, icc: 'srgb' }).toBuffer();
const candidate = {
  orderNumber: '9223372036854775807', lineNumber: 1, productId: 'p02',
  sizeCm: '10x15', finalFormat: 'JPEG', safeAreaMm: 5, targetPpi: 300,
  printArtworkReady: false, sourceManifest: null, bytes,
};
try {
  await assert.rejects(() => archive.archivePrivateShopPrintCandidate(temp, orderId, candidate));
  await writeFile(join(temp, archive.SHOP_PRIVATE_ARCHIVE_MARKER.name),
    archive.SHOP_PRIVATE_ARCHIVE_MARKER.contents, { mode: 0o600 });
  const first = await archive.archivePrivateShopPrintCandidate(temp, orderId, candidate);
  assert.equal(first.idempotent, false);
  assert.equal(first.sha256, createHash('sha256').update(bytes).digest('hex'));
  const second = await archive.archivePrivateShopPrintCandidate(temp, orderId, candidate);
  assert.equal(second.idempotent, true);
  const jpg = join(temp, first.archiveId, 'artwork.jpg');
  const json = join(temp, first.archiveId, 'manifest.json');
  assert.deepEqual(await readFile(jpg), bytes);
  const manifest = JSON.parse(await readFile(json, 'utf8'));
  assert.equal(manifest.approval, 'owner-and-print-lab-signoff-pending');
  assert.equal(manifest.colorMode, 'RGB');
  assert.equal(manifest.safeAreaMm, 5);
  assert.equal((await stat(jpg)).mode & 0o077, 0);
  assert.equal((await stat(json)).mode & 0o077, 0);
  await chmod(json, 0o644);
  await assert.rejects(() => archive.archivePrivateShopPrintCandidate(temp, orderId, candidate));
  await chmod(json, 0o600);
  await rename(json, `${json}.legit`);
  await symlink(`${json}.legit`, json);
  await assert.rejects(() => archive.archivePrivateShopPrintCandidate(temp, orderId, candidate));
  await rm(json);
  await rename(`${json}.legit`, json);
  await assert.rejects(() => archive.archivePrivateShopPrintCandidate(temp, '../unsafe', candidate));
  await assert.rejects(() => archive.archivePrivateShopPrintCandidate(root, orderId, candidate));
  await assert.rejects(() => archive.archivePrivateShopPrintCandidate(temp, orderId,
    { ...candidate, bytes: Buffer.from('not-a-jpeg') }));
  await writeFile(jpg, Buffer.from('tamper'), { flag: 'w' });
  await assert.rejects(() => archive.archivePrivateShopPrintCandidate(temp, orderId, candidate));
  console.log('[PASS] shop-private-print-archive: private root, atomic idempotent writes, restrictive permissions, tamper fail-closed');
} finally {
  await rm(temp, { recursive: true, force: true });
}
