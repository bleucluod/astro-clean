import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import * as astronomy from 'astronomy-engine';

const root = resolve(import.meta.dirname, '..');
function load(relativePath, dependencies = {}) {
  const source = readFileSync(resolve(root, relativePath), 'utf8');
  const compiled = ts.transpileModule(source, {
    fileName: relativePath,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const record = { exports: {} };
  vm.runInNewContext(`(function(module,exports,require){${compiled}\n})`, { Date })(
    record, record.exports, (name) => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  );
  return record.exports;
}

const catalog = load('src/lib/chart/fixed-star-catalog.ts', {
  'astronomy-engine': astronomy,
  './normalized-chart': { normalizeChartPlacement: () => { throw new Error('Not used by shop proof'); } },
});
const { calculateShopBrightStarProof } = load('lib/shop/shop-sky-stars.ts', {
  'astronomy-engine': astronomy,
  '@/src/lib/chart/fixed-star-catalog': catalog,
});
const { renderShopBrightStarProofSvg } = load('lib/shop/shop-sky-proof-svg.ts');

const berlin = { referenceUtc: '2024-07-01T10:30:00.000Z', latitude: 52.52, longitude: 13.405 };
const sample = calculateShopBrightStarProof(berlin);
assert.equal(sample.catalogueStarCount, 14);
assert.equal(sample.catalogueStarCount, catalog.FIXED_STAR_CATALOG.length);
assert.equal(sample.catalogueVersion, catalog.FIXED_STAR_CATALOG_VERSION);
assert.equal(sample.coverage, 'curated-bright-stars-only-not-a-complete-sky-map');
assert.equal(sample.printArtworkReady, false);
assert.ok(sample.aboveHorizonStarCount > 0 && sample.aboveHorizonStarCount < 14);
assert.equal(sample.aboveHorizonStars.length, sample.aboveHorizonStarCount);
assert.equal(new Set(sample.aboveHorizonStars.map((star) => star.id)).size, sample.aboveHorizonStarCount);
for (const star of sample.aboveHorizonStars) {
  assert.ok(catalog.FIXED_STAR_CATALOG.some((entry) => entry.id === star.id));
  assert.ok(star.altitudeDegrees > 0 && star.altitudeDegrees <= 90);
  assert.ok(star.azimuthDegrees >= 0 && star.azimuthDegrees < 360);
  assert.ok(star.x ** 2 + star.y ** 2 <= 1 + 1e-10);
  const projectedRadius = Math.hypot(star.x, star.y);
  assert.ok(Math.abs(projectedRadius - (90 - star.altitudeDegrees) / 90) < 1e-12);
}

// An independent Astronomy Engine path checks the J2000->of-date->horizon transform.
const sirius = catalog.FIXED_STAR_CATALOG.find((star) => star.id === 'sirius');
assert.ok(sirius);
const j2000 = new Date('2000-01-01T12:00:00.000Z');
const siriusAtJ2000 = calculateShopBrightStarProof({
  referenceUtc: j2000.toISOString(), latitude: -34, longitude: 151,
}).aboveHorizonStars.find((star) => star.id === 'sirius');
assert.ok(siriusAtJ2000, 'Sirius should be above Sydney horizon at this fixture');
const ra = sirius.raJ2000Hours * 15 * Math.PI / 180;
const dec = sirius.decJ2000Degrees * Math.PI / 180;
const original = new astronomy.Vector(
  Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec),
  new astronomy.AstroTime(j2000),
);
const ofDate = astronomy.EquatorFromVector(
  astronomy.RotateVector(astronomy.Rotation_EQJ_EQD(j2000), original),
);
const expected = astronomy.Horizon(j2000, new astronomy.Observer(-34, 151, 0), ofDate.ra, ofDate.dec, 'normal');
assert.ok(Math.abs(siriusAtJ2000.altitudeDegrees - expected.altitude) < 0.01);
assert.ok(Math.abs(siriusAtJ2000.azimuthDegrees - expected.azimuth) < 0.01);

const otherHour = calculateShopBrightStarProof({ ...berlin, referenceUtc: '2024-07-01T22:30:00.000Z' });
const otherPlace = calculateShopBrightStarProof({ ...berlin, latitude: -34, longitude: 151 });
assert.notDeepEqual(JSON.parse(JSON.stringify(sample.aboveHorizonStars)), JSON.parse(JSON.stringify(otherHour.aboveHorizonStars)));
assert.notDeepEqual(JSON.parse(JSON.stringify(sample.aboveHorizonStars)), JSON.parse(JSON.stringify(otherPlace.aboveHorizonStars)));
assert.deepEqual(JSON.parse(JSON.stringify(sample)), JSON.parse(JSON.stringify(calculateShopBrightStarProof(berlin))));
for (const invalid of [
  { ...berlin, referenceUtc: '2024-07-01' },
  { ...berlin, referenceUtc: '2024-02-30T10:30:00.000Z' },
  { ...berlin, referenceUtc: '2024-07-01T10:30:00Z' },
  { ...berlin, latitude: 91 }, { ...berlin, longitude: -181 },
  { ...berlin, latitude: NaN }, { ...berlin, longitude: Infinity },
]) assert.throws(() => calculateShopBrightStarProof(invalid));

const svg = renderShopBrightStarProofSvg(sample, 'Berlin / Demonstration only');
assert.equal((svg.match(/<circle cx="[\d.]+" cy="[\d.]+" r="5" /g) ?? []).length, sample.aboveHorizonStarCount);
assert.match(svg, /NOT A COMPLETE STAR ATLAS · NOT PRINT-READY/);
assert.match(svg, /2024-07-01T10:30:00.000Z/);
assert.ok(!svg.includes('<script'));
assert.match(renderShopBrightStarProofSvg(sample, '<script>alert(1)</script>'), /&lt;script&gt;/);
assert.ok(!renderShopBrightStarProofSvg(sample, '<script>alert(1)</script>').includes('<script>'));

if (process.argv.includes('--write-proof')) {
  const output = resolve(root, 'assets/shop-print/p02-curated-bright-stars-proof-v1.svg');
  writeFileSync(output, svg, 'utf8');
  console.log('Wrote deterministic calculation-only sample:', output);
}
console.log(`Shop sky proof: ${sample.aboveHorizonStarCount}/14 curated stars above horizon; UTC/place variation, azimuth/horizon, projection, invalid inputs and non-print boundary passed.`);
