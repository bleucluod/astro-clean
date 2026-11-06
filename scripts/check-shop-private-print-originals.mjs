import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { chmod, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const source = readFileSync(resolve(root, 'lib/shop/shop-private-print-originals.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
} }).outputText;
const record = { exports: {} };
class ShopPrintHandoffError extends Error {
  constructor(message, status = 409) { super(message); this.status = status; }
}
vm.runInNewContext(`(function(module,exports,require){${compiled}\n})`, {
  process: { cwd: () => root, platform: process.platform, env: {} }, Buffer,
})(record, record.exports, (name) => {
  if (name === './shop-print-handoff') return { ShopPrintHandoffError };
  return createRequire(import.meta.url)(name);
});
const loader = record.exports;
const bytes = Buffer.from('synthetic original bytes — no customer data');
const sha256 = createHash('sha256').update(bytes).digest('hex');
const directory = await mkdtemp(join(tmpdir(), 'halleus-shop-private-originals-'));
const marker = join(directory, loader.SHOP_PRIVATE_ORIGINALS_MARKER.name);
const manifestPath = join(directory, 'source-manifest.json');
const originalPath = join(directory, 'moon-map.tif');
const definition = {
  kind: 'moon-map', filename: 'moon-map.tif', sha256,
  creator: 'Synthetic owner fixture', sourceUrl: 'https://example.org/original.tif',
  license: 'Synthetic source only', attribution: 'Test credit only', rightsConfirmed: true,
};
const manifest = (value = definition) => ({
  format: 'halleus.shop.private-originals.v1', sources: { p01: value },
});
const store = (value) => writeFile(manifestPath, JSON.stringify(manifest(value)), { mode: 0o600 });

try {
  assert.deepEqual(JSON.parse(JSON.stringify(await loader.loadPrivateShopFinalPrintSources('p02'))), {});
  await assert.rejects(() => loader.loadPrivateShopFinalPrintSources('p01', undefined),
    (error) => error.status === 409);
  await assert.rejects(() => loader.loadPrivateShopFinalPrintSources('p01', directory));
  await writeFile(marker, loader.SHOP_PRIVATE_ORIGINALS_MARKER.contents, { mode: 0o600 });
  await writeFile(originalPath, bytes, { mode: 0o600 });
  await store();
  const good = await loader.loadPrivateShopFinalPrintSources('p01', directory);
  assert.deepEqual(good.moonMap.bytes, bytes);
  assert.equal(good.moonMap.attribution, definition.attribution);
  assert.equal(good.moonMap.sha256, sha256);
  const jpegOriginalPath = join(directory, 'moon-map.jpg');
  await writeFile(jpegOriginalPath, bytes, { mode: 0o600, flag: 'wx' });
  await store({ ...definition, filename: 'moon-map.jpg' });
  assert.deepEqual((await loader.loadPrivateShopFinalPrintSources('p01', directory)).moonMap.bytes, bytes);
  await store({ ...definition, filename: 'moon-map.png' });
  await assert.rejects(() => loader.loadPrivateShopFinalPrintSources('p01', directory),
    (error) => error.status === 422);
  await rm(jpegOriginalPath);
  await store({ ...definition, rightsConfirmed: false });
  await assert.rejects(() => loader.loadPrivateShopFinalPrintSources('p01', directory),
    (error) => error.status === 422);
  await store({ ...definition, filename: '../moon-map.tif' });
  await assert.rejects(() => loader.loadPrivateShopFinalPrintSources('p01', directory));
  await store({ ...definition, sha256: '0'.repeat(64) });
  await assert.rejects(() => loader.loadPrivateShopFinalPrintSources('p01', directory));
  await store({ ...definition, attribution: '' });
  await assert.rejects(() => loader.loadPrivateShopFinalPrintSources('p01', directory));
  await store({ ...definition, kind: 'milky-way-photo', filename: 'milky-way-photo.jpg' });
  await assert.rejects(() => loader.loadPrivateShopFinalPrintSources('p01', directory));
  await store();
  if (process.platform === 'linux') {
    await chmod(originalPath, 0o644);
    await assert.rejects(() => loader.loadPrivateShopFinalPrintSources('p01', directory));
    await chmod(originalPath, 0o600);
    await chmod(directory, 0o755);
    await assert.rejects(() => loader.loadPrivateShopFinalPrintSources('p01', directory));
    await chmod(directory, 0o700);
  }
  await rm(originalPath);
  if (process.platform === 'linux') {
    // Windows commonly requires Developer Mode/admin to create symlinks. The
    // Linux-only production path and rejection behavior are tested on Linux.
    await symlink(manifestPath, originalPath);
    await assert.rejects(() => loader.loadPrivateShopFinalPrintSources('p01', directory));
  } else {
    await assert.rejects(() => loader.loadPrivateShopFinalPrintSources('p01', directory));
  }
  await assert.rejects(() => loader.loadPrivateShopFinalPrintSources('p03', directory));
  const osCoverage = process.platform === 'linux'
    ? 'POSIX permission and symlink rejection'
    : 'portable fixture (POSIX symlink rejection separately passed on Linux)';
  console.log(`[PASS] shop-private-print-originals: isolated root, provenance, SHA, licensing, missing source, ${osCoverage}`);
} finally {
  await chmod(directory, 0o700);
  await rm(directory, { recursive: true, force: true });
}
