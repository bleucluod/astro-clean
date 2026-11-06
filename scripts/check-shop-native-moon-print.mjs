import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { lstat, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import sharp from 'sharp';
import * as astronomy from 'astronomy-engine';

const repo = resolve(import.meta.dirname, '..');
const inputPath = process.env.HALLEUS_SHOP_NATIVE_MOON_MAP_PATH;
const outsideRepo = (path) => {
  const rel = relative(repo, path);
  return rel === '..' || rel.startsWith(`..${sep}`);
};
if (!inputPath || !isAbsolute(inputPath) || !outsideRepo(inputPath)) {
  console.error('EXTERNAL_BLOCK: provide an absolute private moon map path outside the repository.');
  process.exit(2);
}
const stats = await lstat(inputPath);
assert.ok(stats.isFile() && !stats.isSymbolicLink() && stats.size <= 300_000_000);
const bytes = await readFile(inputPath);
const sha256 = createHash('sha256').update(bytes).digest('hex');
// This CC BY 4.0 provenance belongs only to this exact Wikimedia original.
assert.equal(sha256, 'd1875bcec83588ca25e4802e576f6bb9f88b39e1e403cb41ff55867419c54796');
const metadata = await sharp(bytes).metadata();
assert.equal(metadata.format, 'jpeg');
assert.equal(metadata.width, 8192);
assert.equal(metadata.height, 4096);
assert.equal(metadata.channels, 3);
assert.equal(metadata.space, 'srgb');
assert.equal(metadata.depth, 'uchar');
console.log(`MOON_SOURCE_CHECK: 8192x4096 RGB/sRGB sha256=${sha256}`);

const requireNode = createRequire(import.meta.url);
const cache = new Map();
function load(relativePath) {
  const canonical = relativePath.replaceAll('\\', '/');
  if (cache.has(canonical)) return cache.get(canonical);
  if (canonical.endsWith('.json')) return JSON.parse(readFileSync(resolve(repo, canonical), 'utf8'));
  const source = readFileSync(resolve(repo, canonical), 'utf8');
  const js = ts.transpileModule(source, { fileName: canonical, compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText;
  const record = { exports: {} };
  cache.set(canonical, record.exports);
  const execute = vm.runInNewContext(`(function(module,exports,require){${js}\n})`, {
    Buffer, process: { cwd: () => repo, env: { NODE_ENV: 'development' }, platform: process.platform },
    Date, Request, Response, URL, Uint8Array,
  });
  execute(record, record.exports, (name) => {
    if (name === 'sharp') return sharp;
    if (name === 'astronomy-engine') return astronomy;
    if (name === './normalized-chart') return { normalizeChartPlacement: () => {
      throw new Error('Unused in moon print.');
    } };
    if (name.startsWith('node:')) return requireNode(name);
    if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`);
    if (name.startsWith('.')) {
      const file = resolve(repo, join(canonical, '..', name)).slice(repo.length + 1);
      return load(name.endsWith('.json') ? file : `${file}.ts`);
    }
    throw new Error(`Unexpected dependency: ${canonical} -> ${name}`);
  });
  return record.exports;
}

const originals = load('lib/shop/shop-private-print-originals.ts');
const renderer = load('lib/shop/shop-final-print.ts');
const archive = load('lib/shop/shop-print-archive.ts');
const specs = load('lib/shop/shop-print-spec.ts');
const originalsRoot = await mkdtemp(join(tmpdir(), 'halleus-shop-native-moon-originals-'));
const archiveRoot = process.platform === 'linux'
  ? await mkdtemp(join(tmpdir(), 'halleus-shop-native-moon-archive-')) : null;
const source = {
  kind: 'moon-map', filename: 'moon-map.jpg', sha256,
  creator: 'Solar System Scope',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Solarsystemscope_texture_8k_moon.jpg',
  license: 'CC BY 4.0 — candidate; attribution and product approval still required',
  attribution: '© Solar System Scope', rightsConfirmed: true,
};
// Match the JPEG suffix and pinned source SHA; do not disguise an image format.
try {
  await writeFile(join(originalsRoot, originals.SHOP_PRIVATE_ORIGINALS_MARKER.name),
    originals.SHOP_PRIVATE_ORIGINALS_MARKER.contents, { mode: 0o600, flag: 'wx' });
  await writeFile(join(originalsRoot, source.filename), bytes, { mode: 0o600, flag: 'wx' });
  await writeFile(join(originalsRoot, 'source-manifest.json'), JSON.stringify({
    format: 'halleus.shop.private-originals.v1', sources: { p01: source },
  }), { mode: 0o600, flag: 'wx' });
  const loaded = await originals.loadPrivateShopFinalPrintSources('p01', originalsRoot);
  assert.deepEqual(loaded.moonMap.bytes, bytes);
  console.log('MOON_PRIVATE_ORIGINALS_PASS: source manifest and checksum');
  if (archiveRoot) {
    await writeFile(join(archiveRoot, archive.SHOP_PRIVATE_ARCHIVE_MARKER.name),
      archive.SHOP_PRIVATE_ARCHIVE_MARKER.contents, { mode: 0o600, flag: 'wx' });
  }
  for (const size of ['10x15', '20x30', '30x45']) {
    const sample = { display_number: '920', status: 'payment_verified',
      recipient_mobile: 'test-private-mobile', address: 'test-private-address',
      transfer_reference: 'test-private-bank',
      items: [{ key: 'moon-qa', productId: 'p01', size, quantity: 1,
        details: { calendar: 'gregorian', date: '2024-07-01',
          time: '', city: '', cityId: '', names: 'نام آزمایشی', message: 'پیام آزمایشی' } }] };
    const start = performance.now();
    const candidate = await renderer.buildPrivateShopFinalPrintCandidate(sample, 1, loaded);
    const output = await sharp(candidate.bytes).metadata();
    const dimensions = specs.getShopPrintSpec(size).minimumNativePixels;
    assert.equal(output.width, dimensions.width);
    assert.equal(output.height, dimensions.height);
    assert.equal(output.format, 'jpeg');
    assert.equal(output.channels, 3);
    assert.equal(output.space, 'srgb');
    assert.equal(output.density, 300);
    assert.equal(output.hasProfile, true);
    assert.equal(candidate.safeAreaMm, 5);
    assert.equal(candidate.sourceManifest.sha256, sha256);
    assert.equal(candidate.sourceManifest.attribution, source.attribution);
    assert.equal(candidate.printArtworkReady, false);
    for (const secret of [sample.recipient_mobile, sample.address, sample.transfer_reference]) {
      assert.ok(!candidate.bytes.includes(Buffer.from(secret)));
    }
    console.log(`MOON_NATIVE_PRINT_PASS size=${size} bytes=${candidate.bytes.length} elapsedMs=${Math.round(performance.now() - start)}`);
    if (archiveRoot) {
      const id = '47e512d9-2964-4d83-9ac1-2ecda5480776';
      const first = await archive.archivePrivateShopPrintCandidate(archiveRoot, id, candidate);
      assert.equal(first.idempotent, false);
      assert.equal((await archive.archivePrivateShopPrintCandidate(archiveRoot, id, candidate)).idempotent, true);
      assert.deepEqual(await readFile(join(archiveRoot, first.archiveId, 'artwork.jpg')), candidate.bytes);
      const archived = JSON.parse(await readFile(join(archiveRoot, first.archiveId, 'manifest.json'), 'utf8'));
      assert.equal(archived.approval, 'owner-and-print-lab-signoff-pending');
      assert.equal(archived.sourceManifest.sha256, sha256);
      console.log(`MOON_PRIVATE_ARCHIVE_PASS size=${size}`);
    }
    if (size === '10x15' && process.env.HALLEUS_SHOP_NATIVE_MOON_PREVIEW_PATH) {
      const preview = process.env.HALLEUS_SHOP_NATIVE_MOON_PREVIEW_PATH;
      assert.ok(isAbsolute(preview) && outsideRepo(preview));
      await sharp(candidate.bytes).resize({ width: 700 }).jpeg({ quality: 87 }).toFile(preview);
    }
  }
} finally {
  if (archiveRoot) await rm(archiveRoot, { recursive: true, force: true });
  await rm(originalsRoot, { recursive: true, force: true });
}
console.log('P01_NATIVE_TEST_DONE (synthetic date and names; owner/lab approval pending).');
