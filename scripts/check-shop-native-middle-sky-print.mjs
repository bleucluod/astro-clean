import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import sharp from 'sharp';
import * as astronomy from 'astronomy-engine';

const repo = resolve(import.meta.dirname, '..');
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
      throw new Error('Not used by the isolated print.');
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

const renderer = load('lib/shop/shop-final-print.ts');
const archive = load('lib/shop/shop-print-archive.ts');
const spec = load('lib/shop/shop-print-spec.ts').getShopPrintSpec('20x30');
const orderId = '77e512d9-2964-4d83-9ac1-2ecda5480775';
const privateValues = {
  recipient_mobile: 'test-private-mobile-09120000000',
  address: 'test-private-delivery-address',
  transfer_reference: 'test-private-bank-reference',
};
const order = {
  display_number: '920', status: 'payment_verified', ...privateValues,
  items: [{ key: 'stage2-middle-sky', productId: 'p02', size: '20x30', quantity: 1,
    details: { calendar: 'gregorian', date: '2024-07-01', time: '12:30',
      city: 'برلین، آلمان', cityId: 'de-berlin',
      names: 'نام‌های آزمایشی', message: 'یک پیام آزمایشی' } }],
};
const start = performance.now();
const candidate = await renderer.buildPrivateShopFinalPrintCandidate(order, 1);
const output = await sharp(candidate.bytes).metadata();
assert.equal(output.format, 'jpeg');
assert.equal(output.width, spec.minimumNativePixels.width);
assert.equal(output.height, spec.minimumNativePixels.height);
assert.equal(output.channels, 3);
assert.equal(output.space, 'srgb');
assert.equal(output.density, 300);
assert.equal(output.hasProfile, true);
assert.equal(candidate.sourceManifest, null);
assert.equal(candidate.safeAreaMm, 5);
assert.equal(candidate.printArtworkReady, false);
assert.equal(candidate.retainedOnServer, false);
for (const secret of Object.values(privateValues)) {
  assert.ok(!candidate.bytes.includes(Buffer.from(secret)));
}
console.log(`P02_MIDDLE_NATIVE_PASS: ${output.width}x${output.height} RGB/ICC 300PPI elapsedMs=${Math.round(performance.now() - start)}`);

if (process.platform === 'linux') {
  const root = await mkdtemp(join(tmpdir(), 'halleus-shop-middle-sky-archive-'));
  try {
    await writeFile(join(root, archive.SHOP_PRIVATE_ARCHIVE_MARKER.name),
      archive.SHOP_PRIVATE_ARCHIVE_MARKER.contents, { flag: 'wx', mode: 0o600 });
    const first = await archive.archivePrivateShopPrintCandidate(root, orderId, candidate);
    assert.equal(first.idempotent, false);
    const replay = await archive.archivePrivateShopPrintCandidate(root, orderId, candidate);
    assert.equal(replay.idempotent, true);
    const original = await readFile(join(root, first.archiveId, 'artwork.jpg'));
    assert.deepEqual(original, candidate.bytes);
    const manifest = JSON.parse(await readFile(join(root, first.archiveId, 'manifest.json'), 'utf8'));
    assert.equal(manifest.sourceManifest, null);
    assert.equal(manifest.approval, 'owner-and-print-lab-signoff-pending');
    assert.equal(manifest.jpegSha256, createHash('sha256').update(candidate.bytes).digest('hex'));
    for (const secret of Object.values(privateValues)) {
      assert.ok(!JSON.stringify(manifest).includes(secret));
    }
    console.log('P02_MIDDLE_ARCHIVE_PASS: private atomic idempotent archive, no delivery/bank fields');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
if (process.env.HALLEUS_SHOP_MIDDLE_SKY_PREVIEW_PATH) {
  const destination = process.env.HALLEUS_SHOP_MIDDLE_SKY_PREVIEW_PATH;
  const delta = relative(repo, destination);
  assert.ok(isAbsolute(destination) && (delta === '..' || delta.startsWith(`..${sep}`)));
  await sharp(candidate.bytes).resize({ width: 700 }).jpeg({ quality: 87 }).toFile(destination);
}
console.log('P02_MIDDLE_NATIVE_TEST_DONE (synthetic data; owner/lab approval pending).');
