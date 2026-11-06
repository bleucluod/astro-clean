import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstat, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import sharp from 'sharp';
import * as astronomy from 'astronomy-engine';

const repo = resolve(import.meta.dirname, '..');
const sourcePath = process.env.HALLEUS_SHOP_NATIVE_PHOTO_PATH;
const outsideRepo = (path) => {
  const rel = relative(repo, path);
  return rel === '..' || rel.startsWith(`..${sep}`);
};
if (!sourcePath || !isAbsolute(sourcePath) || !outsideRepo(sourcePath)) {
  console.error('EXTERNAL_BLOCK: provide an absolute private source path outside the repository.');
  process.exit(2);
}

const info = await lstat(sourcePath);
assert.ok(info.isFile() && !info.isSymbolicLink(), 'Native source must be a regular file.');
assert.ok(info.size > 0 && info.size <= 300_000_000, 'Source size must be bounded.');
const bytes = await readFile(sourcePath);
const hash = createHash('sha256').update(bytes).digest('hex');
// Pin this verified Commons download; never assign its author's license to an arbitrary file.
assert.equal(hash, 'bc5581d5dffb1c573c7e49ab494e7b160fd3bccc1d3b7a34b909ef8332dab30d',
  'Source changed: reverify the image and its rights before updating this test.');
const metadata = await sharp(bytes).metadata();
assert.equal(metadata.format, 'jpeg');
assert.equal(metadata.channels, 3);
assert.equal(metadata.space, 'srgb');
assert.ok(metadata.width >= 3544 && metadata.height >= 5315,
  'Native source is too small for the largest print.');
assert.ok(metadata.width / metadata.height > .64 && metadata.width / metadata.height < .69,
  'Native photo aspect ratio would crop the approved vertical design.');
console.log(`NATIVE_SOURCE_CHECK: ${metadata.width}x${metadata.height}, RGB/sRGB, sha256=${hash}`);

const requireNode = createRequire(import.meta.url);
const cache = new Map();
function load(filePath) {
  const canonical = filePath.replaceAll('\\', '/');
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
      throw new Error('Unused in photo print.');
    } };
    if (name.startsWith('node:')) return requireNode(name);
    if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`);
    if (name.startsWith('.')) {
      const path = resolve(repo, join(canonical, '..', name)).slice(repo.length + 1);
      return load(name.endsWith('.json') ? path : `${path}.ts`);
    }
    throw new Error(`Unexpected dependency: ${canonical} -> ${name}`);
  });
  return record.exports;
}

const renderer = load('lib/shop/shop-final-print.ts');
const spec = load('lib/shop/shop-print-spec.ts');
const archive = load('lib/shop/shop-print-archive.ts');
const privateOriginals = load('lib/shop/shop-private-print-originals.ts');
const source = {
  bytes, sha256: hash, creator: 'Anil Öztas',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Ramsau_bei_Berchtesgaden_(DE),_Milchstra%C3%9Fe_%C3%BCber_Hochkalter_%26_Hintersee_--_2024_--_1018-50.jpg',
  license: 'CC BY 4.0 — candidate; attribution and product approval still required',
  attribution: '© Anil Öztas', rightsConfirmed: true,
};
const personalization = { calendar: 'gregorian', date: '2024-07-01', time: '',
  city: '', cityId: '', names: 'نام آزمایشی', message: 'یک پیام آزمایشی' };
const sampleOrder = { display_number: '920', status: 'payment_verified',
  recipient_mobile: 'test-private-mobile-09120000000',
  address: 'test-private-delivery-address',
  transfer_reference: 'test-private-bank-evidence',
  items: [{ key: 'stage2-photo-probe', productId: 'p03', size: '10x15',
    quantity: 1, details: personalization }] };

function assertNoCameraGps(exif) {
  if (!exif) return;
  assert.equal(exif.subarray(0, 6).toString('binary'), 'Exif\0\0');
  const base = 6;
  const little = exif.subarray(base, base + 2).toString('ascii') === 'II';
  const read16 = little ? (offset) => exif.readUInt16LE(offset)
    : (offset) => exif.readUInt16BE(offset);
  const read32 = little ? (offset) => exif.readUInt32LE(offset)
    : (offset) => exif.readUInt32BE(offset);
  const ifd = base + read32(base + 4);
  const count = read16(ifd);
  assert.ok(ifd >= base && ifd + 2 + count * 12 <= exif.length, 'EXIF IFD bounds');
  for (let i = 0; i < count; i += 1) {
    assert.notEqual(read16(ifd + 2 + i * 12), 0x8825,
      'Original GPS location must not survive in the print candidate.');
  }
}

const archiveRoot = process.platform === 'linux'
  ? await mkdtemp(join(tmpdir(), 'halleus-shop-native-photo-archive-')) : null;
const originalsRoot = await mkdtemp(join(tmpdir(), 'halleus-shop-native-photo-originals-'));
try {
  await writeFile(join(originalsRoot, privateOriginals.SHOP_PRIVATE_ORIGINALS_MARKER.name),
    privateOriginals.SHOP_PRIVATE_ORIGINALS_MARKER.contents, { mode: 0o600, flag: 'wx' });
  await writeFile(join(originalsRoot, 'milky-way-photo.jpg'), bytes, { mode: 0o600, flag: 'wx' });
  await writeFile(join(originalsRoot, 'source-manifest.json'), JSON.stringify({
    format: 'halleus.shop.private-originals.v1',
    sources: { p03: { kind: 'milky-way-photo', filename: 'milky-way-photo.jpg',
      sha256: hash, creator: source.creator, sourceUrl: source.sourceUrl,
      license: source.license, attribution: source.attribution, rightsConfirmed: true } },
  }), { mode: 0o600, flag: 'wx' });
  const loaded = await privateOriginals.loadPrivateShopFinalPrintSources('p03', originalsRoot);
  assert.deepEqual(loaded.milkyWayPhoto.bytes, bytes);
  assert.equal(loaded.milkyWayPhoto.sha256, hash);
  console.log('NATIVE_PHOTO_PRIVATE_ORIGINALS_PASS: manifest, hash and private POSIX source');
  if (archiveRoot) {
    await writeFile(join(archiveRoot, archive.SHOP_PRIVATE_ARCHIVE_MARKER.name),
      archive.SHOP_PRIVATE_ARCHIVE_MARKER.contents, { mode: 0o600, flag: 'wx' });
  }
  for (const size of ['10x15', '20x30', '30x45']) {
    const order = { ...sampleOrder, items: [{ ...sampleOrder.items[0], size }] };
    const start = performance.now();
    const candidate = await renderer.buildPrivateShopFinalPrintCandidate(order, 1,
      loaded);
    const output = await sharp(candidate.bytes).metadata();
    const expected = spec.getShopPrintSpec(size).minimumNativePixels;
    assert.equal(output.format, 'jpeg');
    assert.equal(output.width, expected.width);
    assert.equal(output.height, expected.height);
    assert.equal(output.channels, 3);
    assert.equal(output.space, 'srgb');
    assert.equal(output.density, 300);
    assert.equal(output.hasProfile, true);
    // Sharp may add harmless output-resolution/encoding EXIF. Reject GPS pointers,
    // not all EXIF: the original photo's location must not leak into a print.
    assertNoCameraGps(output.exif);
    assert.equal(candidate.sourceManifest.sha256, hash);
    assert.equal(candidate.sourceManifest.attribution, source.attribution);
    assert.equal(candidate.safeAreaMm, 5);
    assert.equal(candidate.printArtworkReady, false);
    assert.equal(candidate.retainedOnServer, false);
    for (const secret of [order.recipient_mobile, order.address, order.transfer_reference]) {
      assert.ok(!candidate.bytes.includes(Buffer.from(secret)));
    }
    console.log(`NATIVE_PHOTO_PRINT_PASS size=${size} pixels=${expected.width}x${expected.height} bytes=${candidate.bytes.length} elapsedMs=${Math.round(performance.now() - start)}`);
    if (archiveRoot) {
      const orderId = '47e512d9-2964-4d83-9ac1-2ecda5480775';
      const first = await archive.archivePrivateShopPrintCandidate(archiveRoot, orderId, candidate);
      assert.equal(first.idempotent, false);
      const replay = await archive.archivePrivateShopPrintCandidate(archiveRoot, orderId, candidate);
      assert.equal(replay.idempotent, true);
      const archivedBytes = await readFile(join(archiveRoot, first.archiveId, 'artwork.jpg'));
      assert.deepEqual(archivedBytes, candidate.bytes);
      const archivedManifest = JSON.parse(await readFile(join(archiveRoot, first.archiveId, 'manifest.json'), 'utf8'));
      assert.equal(archivedManifest.approval, 'owner-and-print-lab-signoff-pending');
      assert.equal(archivedManifest.sourceManifest.sha256, hash);
      assert.equal(archivedManifest.sourceManifest.attribution, source.attribution);
      for (const secret of [order.recipient_mobile, order.address, order.transfer_reference]) {
        assert.ok(!JSON.stringify(archivedManifest).includes(secret));
      }
      console.log(`NATIVE_PHOTO_PRIVATE_ARCHIVE_PASS size=${size} hash=${first.sha256}`);
    }
    if (size === '10x15' && process.env.HALLEUS_SHOP_NATIVE_PREVIEW_PATH) {
      const preview = process.env.HALLEUS_SHOP_NATIVE_PREVIEW_PATH;
      assert.ok(isAbsolute(preview) && outsideRepo(preview),
        'Preview must be outside repo.');
      await sharp(candidate.bytes).resize({ width: 700 }).jpeg({ quality: 87 }).toFile(preview);
    }
  }
} finally {
  if (archiveRoot) await rm(archiveRoot, { recursive: true, force: true });
  await rm(originalsRoot, { recursive: true, force: true });
}
console.log('P03_NATIVE_TEST_DONE (synthetic personalization; owner/lab approval pending).');
