import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import * as Astronomy from 'astronomy-engine';

const root = resolve(import.meta.dirname, '..');
const scriptPath = 'lib/shop/shop-galactic-atmosphere.ts';
const skyPath = 'lib/shop/shop-birth-sky-artwork.ts';
const galaxySource = readFileSync(resolve(root, scriptPath), 'utf8');
const artworkSource = readFileSync(resolve(root, skyPath), 'utf8');
const clientSource = readFileSync(resolve(root, 'components/shop/BirthSkyLiveProduct.tsx'), 'utf8');

const execute = (source, name, mocks) => {
  const output = ts.transpileModule(source, {
    fileName: name,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  assert.equal((output.diagnostics ?? []).filter((d) =>
    d.category === ts.DiagnosticCategory.Error).length, 0, name + ' syntax');
  const exports = {};
  const factory = vm.runInNewContext(
    '(function(require,exports){' + output.outputText + '\n})',
    { Date, Math, Object, Array, Number, String, Error },
  );
  factory((module) => {
    assert.ok(module in mocks, 'Unexpected dependency: ' + module);
    return mocks[module];
  }, exports);
  return exports;
};
const galaxy = execute(galaxySource, scriptPath, {
  'astronomy-engine': Astronomy,
  './shop-sky-stars': { parseShopSkyReference: (input) => {
    assert.match(input.referenceUtc, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
    assert.ok(Number.isFinite(input.latitude) && Number.isFinite(input.longitude));
    return new Date(input.referenceUtc);
  } },
}).calculateShopGalacticAtmosphere;
assert.equal(typeof galaxy, 'function');

const input = {
  referenceUtc: '1997-02-13T16:51:00.000Z',
  latitude: 37.42, longitude: 46.11,
};
const a = galaxy(input);
const b = galaxy(input);
assert.equal(a.source, 'computed-J2000-galactic-plane-artistic-atmosphere');
assert.equal(a.isPhotographic, false);
assert.ok(a.band.length >= 1 && a.band.some((section) => section.length >= 10));
assert.ok(a.clouds.length > 400 && a.grains.length > 800);
assert.ok(a.clouds.length <= 4800 && a.grains.length <= 9500);
assert.equal(JSON.stringify(a), JSON.stringify(b), 'Same sky should render deterministically');
for (const point of [...a.clouds, ...a.grains, ...a.band.flat()]) {
  assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
  assert.ok(point.x * point.x + point.y * point.y <= 1.00001);
}
const moved = galaxy({ ...input, referenceUtc: '1997-08-13T16:51:00.000Z' });
const relocated = galaxy({ ...input, latitude: -12.0, longitude: 73.0 });
assert.notEqual(JSON.stringify(a.band), JSON.stringify(moved.band), 'Season must change galactic orientation');
assert.notEqual(JSON.stringify(a.band), JSON.stringify(relocated.band), 'Location must change galactic orientation');

const render = execute(artworkSource, skyPath, {}).renderShopBirthSkyArtwork;
const atlas = { ...input, aboveHorizonStars: [{ x: .2, y: .3, visualMagnitude: .2 }] };
const figures = { ...input, lines: [
  { constellationId: 'AAA', rank: 1, points: [{ x: .1, y: .1 }, { x: .2, y: .3 }] },
  { constellationId: 'BBB', rank: 2, points: [{ x: .3, y: .1 }, { x: .4, y: .2 }] },
] };
const personal = { names: 'آراد', message: 'آسمان واقعی',
  city: 'میانه، آذربایجان شرقی', date: '۱۳۷۵/۱۱/۲۵', time: '20:21' };
const svg = render(atlas, figures, personal, { atmosphere: a });
assert.match(svg, /id="p02-galactic-atmosphere"/);
assert.match(svg, /filter="url\(#p02-galactic-soften\)"/);
assert.match(svg, /id="p02-sourced-stars"/);
assert.match(svg, /stroke-opacity=".34"/);
assert.doesNotMatch(svg, /stroke-opacity=".21"/);
assert.ok(svg.includes('fill="#000000"') && svg.includes('p02-star-halo'));
assert.notEqual(svg, render(atlas, figures, personal, { atmosphere: moved }));
assert.throws(() => render(atlas, figures, personal, {
  atmosphere: { ...a, longitude: a.longitude + 1 },
}), /share the same sky reference/);
assert.ok(clientSource.includes('calculateShopGalacticAtmosphere(reference)'));
assert.ok(clientSource.includes('typography: false, atmosphere'));
assert.doesNotMatch(galaxySource, /Math\.random|fetch\(|<image|\.png|\.jpg/i);
console.log('SHOP_P02_GALACTIC_ATMOSPHERE=PASS J2000_orientation_location_determinism_limited_sourced_stars');
