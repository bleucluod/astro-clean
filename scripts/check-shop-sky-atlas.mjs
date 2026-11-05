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
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
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

const source = JSON.parse(readFileSync(resolve(root, 'lib/shop/catalog/bsc5-bright-stars-mag6.json'), 'utf8'));
assert.equal(source.meta.count, 5080);
assert.equal(source.stars.length, 5080 * 4);
assert.equal(source.meta.upstreamGitBlob, '5bf6ea2ddbd9d7154da5718baa6cefe7876b9a09');
assert.equal(source.meta.magnitudeLimitInclusive, 6);
assert.match(source.meta.sourceUrl, /^https:\/\/cdsarc\.cds\.unistra\.fr\//);
let starCount = 0;
for (let i = 0; i < source.stars.length; i += 4) {
  const [ra, dec, mag, bv] = source.stars.slice(i, i + 4);
  assert.ok(Number.isFinite(ra) && ra >= 0 && ra < 360);
  assert.ok(Number.isFinite(dec) && dec >= -90 && dec <= 90);
  assert.ok(Number.isFinite(mag) && mag <= 6);
  assert.ok(bv === null || Number.isFinite(bv));
  starCount++;
}
assert.equal(starCount, 5080);
assert.ok(source.stars.some((_, index) => index % 4 === 2 && source.stars[index] < 0), 'Include genuine bright stars.');

const catalog = load('src/lib/chart/fixed-star-catalog.ts', {
  'astronomy-engine': astronomy,
  './normalized-chart': { normalizeChartPlacement: () => { throw new Error('Not used by catalog validation'); } },
});
const sky = load('lib/shop/shop-sky-stars.ts', {
  'astronomy-engine': astronomy, '@/src/lib/chart/fixed-star-catalog': catalog,
});
const atlas = load('lib/shop/shop-sky-atlas.ts', {
  'astronomy-engine': astronomy,
  './catalog/bsc5-bright-stars-mag6.json': source,
  './shop-sky-stars': sky,
});
const constellationData = JSON.parse(readFileSync(resolve(root, 'lib/shop/catalog/constellations-d3-celestial-v1.json'), 'utf8'));
const constellationLicense = readFileSync(resolve(root, 'lib/shop/catalog/constellations-d3-celestial-LICENSE.txt'), 'utf8');
assert.equal(constellationData.type, 'FeatureCollection');
assert.equal(constellationData.features.length, 89);
assert.match(constellationLicense, /Copyright \(c\) 2015, Olaf Frohn/);
assert.match(constellationLicense, /Redistribution and use in source and binary forms/);
assert.equal(new Set(constellationData.features.map((feature) => feature.id)).size, 88);
assert.equal(constellationData.features.filter((feature) => feature.id === 'Ser').length, 2);
const constellation = load('lib/shop/shop-constellation-lines.ts', {
  'astronomy-engine': astronomy,
  './catalog/constellations-d3-celestial-v1.json': constellationData,
  './shop-sky-stars': sky,
});
const { renderShopStarAtlasProofSvg } = load('lib/shop/shop-sky-atlas-svg.ts');
const fixture = { referenceUtc: '2024-07-01T10:30:00.000Z', latitude: 52.52, longitude: 13.405 };
const result = atlas.calculateShopStarAtlas(fixture);
const figures = constellation.calculateShopConstellationLines(fixture);
assert.equal(figures.featureCount, 89);
assert.equal(figures.sourcePolylines, 150);
assert.equal(figures.sourceVertices, 893);
assert.equal(figures.projectedVisiblePieces, figures.lines.length);
assert.ok(figures.lines.length > 30);
assert.equal(figures.printArtworkReady, false);
assert.equal(figures.sourceGitBlob, 'ce64cf3c18b627f4d9749b9076cd4693b777697e');
for (const line of figures.lines) {
  assert.ok(line.points.length >= 2);
  assert.match(line.constellationId, /^[A-Za-z]{3}$/);
  assert.ok([1, 2, 3].includes(line.rank));
  for (let i = 0; i < line.points.length; i++) {
    const point = line.points[i];
    assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
    assert.ok(Math.hypot(point.x, point.y) <= 1 + 1e-6, 'No figure may cross the physical horizon circle.');
    if (i > 0) {
      const previous = line.points[i - 1];
      assert.ok(Math.hypot(point.x - previous.x, point.y - previous.y) < 0.12, 'No long shortcut across the hidden sky.');
    }
  }
}
assert.equal(result.catalogueCount, 5080);
assert.equal(result.brightnessLimit, 6);
assert.equal(result.properMotionIncluded, false);
assert.equal(result.constellationLinesIncluded, false);
assert.equal(result.printArtworkReady, false);
assert.equal(result.aboveHorizonCount, result.aboveHorizonStars.length);
assert.ok(result.aboveHorizonCount > 1000 && result.aboveHorizonCount < 5080);
for (const star of result.aboveHorizonStars) {
  assert.ok(star.altitudeDegrees > 0 && star.altitudeDegrees <= 90);
  assert.ok(star.azimuthDegrees >= 0 && star.azimuthDegrees < 360);
  assert.ok(Math.hypot(star.x, star.y) <= 1 + 1e-10);
  assert.ok(star.visualMagnitude <= 6);
}

// Cross-validate a known very bright BSC5 position against the independent
// named-star catalog, allowing for source rounding and omitted proper motion.
const sirius = catalog.FIXED_STAR_CATALOG.find((entry) => entry.id === 'sirius');
const siriusRaDeg = sirius.raJ2000Hours * 15;
const nearestSirius = source.stars.reduce((best, value, index) => {
  if (index % 4 !== 0) return best;
  const distance = Math.hypot(value - siriusRaDeg, source.stars[index + 1] - sirius.decJ2000Degrees);
  return distance < best.distance ? { index, distance } : best;
}, { index: -1, distance: Infinity });
assert.ok(nearestSirius.distance < 0.002);
assert.ok(source.stars[nearestSirius.index + 2] < -1);

const differentTime = atlas.calculateShopStarAtlas({ ...fixture, referenceUtc: '2024-07-01T22:30:00.000Z' });
const differentPlace = atlas.calculateShopStarAtlas({ ...fixture, latitude: -34, longitude: 151 });
assert.notEqual(result.aboveHorizonCount, differentTime.aboveHorizonCount);
assert.notEqual(result.aboveHorizonCount, differentPlace.aboveHorizonCount);
assert.deepEqual(JSON.parse(JSON.stringify(result)), JSON.parse(JSON.stringify(atlas.calculateShopStarAtlas(fixture))));
assert.notDeepEqual(JSON.parse(JSON.stringify(figures.lines)), JSON.parse(JSON.stringify(constellation.calculateShopConstellationLines({
  ...fixture, referenceUtc: '2024-07-01T22:30:00.000Z',
}).lines)));
assert.notDeepEqual(JSON.parse(JSON.stringify(figures.lines)), JSON.parse(JSON.stringify(constellation.calculateShopConstellationLines({
  ...fixture, latitude: -34, longitude: 151,
}).lines)));
for (const bad of [
  { ...fixture, latitude: 120 }, { ...fixture, longitude: Infinity },
  { ...fixture, referenceUtc: '2024-07-01T10:30:00' },
]) assert.throws(() => atlas.calculateShopStarAtlas(bad));

const svg = renderShopStarAtlasProofSvg(result, 'Berlin / Demonstration only');
const figuresSvg = renderShopStarAtlasProofSvg(result, 'Berlin / Demonstration only', figures);
assert.match(svg, /width="3544" height="5315"/);
assert.equal((svg.match(/<circle cx="[\d.]+" cy="[\d.]+" r="[\d.]+" fill="#ecf7ff"/g) ?? []).length, result.aboveHorizonCount);
assert.match(svg, /NOT APPROVED FOR PRINT/);
assert.ok(!svg.includes('NO SUCH FAKE STAR'));
assert.ok(!svg.includes('نام خصوصی'));
assert.equal((figuresSvg.match(/<path d="M [\d.]+ [\d.]+ L /g) ?? []).length, figures.projectedVisiblePieces);
assert.equal((figuresSvg.match(/<circle cx="[\d.]+" cy="[\d.]+" r="[\d.]+" fill="#ecf7ff"/g) ?? []).length, result.aboveHorizonCount);
assert.throws(() => renderShopStarAtlasProofSvg(result, 'Berlin', {
  ...figures, longitude: figures.longitude + 1,
}));
assert.match(renderShopStarAtlasProofSvg(result, '<script>x</script>'), /&lt;script&gt;/);
assert.ok(!renderShopStarAtlasProofSvg(result, '<script>x</script>').includes('<script>'));

if (process.argv.includes('--write-proof')) {
  const path = resolve(root, 'assets/shop-print/p02-bsc5-star-atlas-proof-v1.svg');
  writeFileSync(path, figuresSvg, 'utf8');
  console.log('Wrote original unapproved star-atlas vector sample:', path);
}
console.log(`Shop sky atlas: ${result.aboveHorizonCount}/5080 real stars; ${figures.projectedVisiblePieces} sourced clipped constellation pieces; geometry/input/render guards passed.`);
