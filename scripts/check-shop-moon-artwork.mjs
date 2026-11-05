import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import sharp from 'sharp';
import * as astronomy from 'astronomy-engine';

const root = resolve(import.meta.dirname, '..');
function load(path, dependencies = {}) {
  const source = readFileSync(resolve(root, path), 'utf8');
  const { outputText } = ts.transpileModule(source, { fileName: path, compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } });
  const record = { exports: {} };
  vm.runInNewContext(`(function(module,exports,require){${outputText}\n})`, {
    Date, Buffer, Uint8Array, process: { cwd: () => root },
  })(record, record.exports, (name) => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`);
    return dependencies[name];
  });
  return record.exports;
}

const ephemeris = load('lib/shop/shop-moon-ephemeris.ts', { 'astronomy-engine': astronomy });
const artworkText = load('lib/shop/shop-artwork-text.ts', {
  './shop-print-handoff': { ShopPrintHandoffError: class ShopPrintHandoffError extends Error {} },
});
const imagePath = resolve(root, 'public/halleus-visuals/moon-apollo11.webp');
let sourceReads = 0;
let sourceMissing = false;
const moon = load('lib/shop/shop-moon-artwork.ts', {
  'node:fs/promises': { readFile: async (file) => {
    assert.equal(file, imagePath, 'Only the reviewed existing moon photograph may be loaded.');
    sourceReads++;
    if (sourceMissing) throw new Error('Moon source missing');
    return readFileSync(file);
  } },
  'node:path': { join },
  sharp,
  './shop-moon-ephemeris': ephemeris,
  './shop-artwork-text': artworkText,
});

// Independently rasterize the derived vector contour to verify its actual area
// and north-up waxing-right / waning-left screen-orientation convention.
async function litCoverage(fraction, waxing) {
  const path = moon.shopMoonIlluminationPath(fraction, waxing, 150);
  const png = await sharp(Buffer.from(`<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg"><path d="${path}" fill="white"/></svg>`)).raw().toBuffer({ resolveWithObject: true });
  const pixels = png.data;
  let visible = 0;
  let left = 0;
  let right = 0;
  for (let y = 0; y < 300; y++) for (let x = 0; x < 300; x++) {
    const alpha = pixels[(y * 300 + x) * png.info.channels + 3];
    visible += alpha / 255;
    if (x < 150) left += alpha / 255;
    if (x > 150) right += alpha / 255;
  }
  assert.ok(Math.abs(visible / (Math.PI * 150 ** 2) - fraction) < 0.012,
    `Illumination-area mismatch: ${fraction} ${waxing} ${visible}`);
  if (fraction > 0.05 && fraction < 0.95) {
    assert.ok(waxing ? right > left : left > right, 'Illuminated side should follow chosen diagram convention.');
  }
}
for (const fraction of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
  await litCoverage(fraction, true);
  await litCoverage(fraction, false);
}
for (const invalid of [-1, 1.1, NaN, Infinity]) {
  assert.throws(() => moon.shopMoonIlluminationPath(invalid, true));
}

const start = new Date('2024-04-01T00:00:00Z');
const timestamp = (targetAngle) => astronomy.SearchMoonPhase(targetAngle, start, 35).date.toISOString();
const fixtures = [
  { angle: 0, phase: 'new' },
  { angle: 90, phase: 'first-quarter' },
  { angle: 180, phase: 'full' },
  { angle: 270, phase: 'last-quarter' },
];
const proofs = [];
for (const { angle, phase } of fixtures) {
  const referenceUtc = timestamp(angle);
  const computed = ephemeris.calculateShopMoonAtUtc(referenceUtc);
  const proof = await moon.buildShopMoonPhaseArtworkProof({
    referenceUtc, names: 'نام ساختگی', dateLabel: 'تاریخ نمونه', message: 'پیام آزمایشی',
  });
  assert.equal(proof.referenceUtc, referenceUtc);
  assert.equal(proof.phase, phase);
  assert.equal(proof.phase, computed.phase);
  assert.equal(proof.illuminatedFraction, computed.illuminatedFraction);
  assert.equal(proof.printArtworkReady, false);
  assert.equal(proof.retainedOnServer, false);
  assert.match(proof.documentKind, /not-date-only-order-or-print-ready/);
  const meta = await sharp(proof.bytes).metadata();
  assert.deepEqual({ format: meta.format, width: meta.width, height: meta.height,
    channels: meta.channels, space: meta.space },
    { format: 'png', width: 1024, height: 1536, channels: 3, space: 'srgb' });
  proofs.push(proof);
}
assert.ok(proofs[0].illuminatedFraction < 0.015);
assert.ok(proofs[2].illuminatedFraction > 0.98);
assert.ok(proofs[1].illuminatedFraction > 0.45 && proofs[1].illuminatedFraction < 0.55);
assert.ok(proofs[3].illuminatedFraction > 0.45 && proofs[3].illuminatedFraction < 0.55);
assert.notDeepEqual(proofs[1].bytes, proofs[3].bytes, 'Waxing and waning proofs should differ.');
const again = await moon.buildShopMoonPhaseArtworkProof({
  referenceUtc: timestamp(180), names: 'نام ساختگی', dateLabel: 'تاریخ نمونه', message: 'پیام آزمایشی',
});
assert.deepEqual(again.bytes, proofs[2].bytes, 'Same timestamp and text yield a deterministic proof.');
const changed = await moon.buildShopMoonPhaseArtworkProof({
  referenceUtc: timestamp(180), names: 'نام دیگر', dateLabel: 'تاریخ نمونه', message: 'پیام آزمایشی',
});
assert.notDeepEqual(changed.bytes, proofs[2].bytes);

const beforeInvalidReads = sourceReads;
for (const bad of ['2024-04-08', '2024-04-08T12:00:00', '2023-02-29T12:00:00Z', 'bad']) {
  await assert.rejects(() => moon.buildShopMoonPhaseArtworkProof({ referenceUtc: bad }), /explicit|calendar|Invalid/);
}
for (const bad of ['\u0000', 'a\u202eb', '\ud800', 'a\nb']) {
  await assert.rejects(() => moon.buildShopMoonPhaseArtworkProof({ referenceUtc: timestamp(180), message: bad }));
}
assert.equal(sourceReads, beforeInvalidReads, 'Reject invalid inputs before reading any image source.');
for (const unsafe of ['<script>alert(1)</script>', '&<>"']) {
  const result = await moon.buildShopMoonPhaseArtworkProof({ referenceUtc: timestamp(180), names: unsafe });
  assert.equal((await sharp(result.bytes).metadata()).format, 'png');
}
sourceMissing = true;
await assert.rejects(() => moon.buildShopMoonPhaseArtworkProof({ referenceUtc: timestamp(180) }), /source missing/);
const source = readFileSync(resolve(root, 'lib/shop/shop-moon-artwork.ts'), 'utf8');
assert.doesNotMatch(source, /(?:writeFile|createWriteStream|mkdir|app\/api|public\/shop-preview)/);
assert.doesNotMatch(source, /buildPrivateShopPrintHandoff|shop-order-store|shop-order-http/);
console.log('Shop P01 moon design proof: actual instant/quarter ephemeris, sampled exact illuminated area, correct side, deterministic RGB private output, fail-closed date-only/unsafe text, no archive, no press-ready claim passed.');

if (process.argv.includes('--render-synthetic-preview')) {
  for (const index of [1, 2, 3]) {
    const file = `/tmp/halleus-p01-synthetic-${fixtures[index].phase}.png`;
    await sharp(proofs[index].bytes).toFile(file);
    console.log('Synthetic preview:', file);
  }
}
