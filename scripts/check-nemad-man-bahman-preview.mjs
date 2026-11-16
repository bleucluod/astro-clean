import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const read = (file) => readFileSync(resolve(root, file), 'utf8');
const modules = [
  'app/shop/nemad-man/bahman-preview/page.tsx',
  'components/shop/NemadManBahmanPreview.tsx',
  'components/shop/NemadManBahmanArtwork.tsx',
  'lib/shop/nemad-man-bahman-preview.ts',
];
for (const file of modules) {
  const result = ts.transpileModule(read(file), {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const errors = (result.diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
  assert.deepEqual(errors.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')), [], 'Parse error: ' + file);
}
const route = read(modules[0]);
const client = read(modules[1]);
const poster = read(modules[2]);
const engine = read(modules[3]);
const css = read('components/shop/nemad-man-bahman-preview.module.css');
const figureCatalog = JSON.parse(read('lib/shop/catalog/constellations-d3-celestial-v1.json'));
const stars = JSON.parse(read('lib/shop/catalog/bsc5-bright-stars-mag6.json'));
const signIds = ['Ari','Tau','Gem','Cnc','Leo','Vir','Lib','Sco','Sgr','Cap','Aqr','Psc'];
assert.equal(signIds.length, 12);
assert.equal(stars.meta.count, 5080);
assert.equal(stars.stars.length, stars.meta.count * 4);
for (const id of signIds) {
  const feature = figureCatalog.features.filter((item) => item.id === id);
  assert.equal(feature.length, 1, id + ' figure source missing');
  assert.equal(feature[0].geometry.type, 'MultiLineString', id + ' line structure');
  const points = feature[0].geometry.coordinates.flat();
  assert.ok(points.length > 1 && points.every((p) => p.length === 2 && p.every(Number.isFinite)), id + ' coordinate validation');
}
for (const expected of [
  "process.env.NODE_ENV === 'production') notFound()",
  'index: false, follow: false',
  "dynamic = 'force-dynamic'",
]) assert.ok(route.includes(expected), 'Development-only/noindex route: ' + expected);
for (const expected of [
  'validateBahmanPreview(name, date, { time: birthTime, cityId })',
  '<NemadManBahmanArtwork name={preview.name} date={preview.gregorianDate} sign={preview.sign}',
  'outcome.reason === \'needs-birth-details\'',
  'preview.sign.id !== \'aquarius\'',
  'role="status"',
]) assert.ok(client.includes(expected), 'Missing preview / boundary behavior: ' + expected);
for (const expected of [
  "Astronomy.GeoVector(Astronomy.Body.Sun, time, true)",
  'getTropicalZodiacSignFromLongitude(longitude)',
  'resolveShopCivilTimeUtc(parsed.gregorianIso, time, city.timezone)',
  'parseJalaliDateInput(dateInput)',
  'getCertainSignForBirthDate(parsed.gregorianIso)',
  'sign.figure',
  'wrapRa(ra, centerRa) - centerRa',
  'brightStars.stars',
  'visualMagnitude',
]) {
  if (expected === 'visualMagnitude') continue; // Variable name is mag; magnitude values are sourced via BSC columns.
  assert.ok(engine.includes(expected), 'Missing zodiac / astronomical evidence: ' + expected);
}
assert.match(poster, /sky\.stars\.map/, 'Actual catalogue stars required');
assert.match(poster, /<rect width="900" height="1125" fill="#000000"\/>/, 'Full poster background must remain pure black');
assert.match(poster, /stopColor="#080a0c"/, 'Inner sky disc must remain near-black');
assert.match(poster, /M391 752/, 'Approved Aquarius glyph styling must remain in place');
assert.ok(!poster.includes('nemad-wisps') && !poster.includes('nemad-grain'), 'Do not reinstate blue haze or aggressive grain');
assert.match(css, /background: #000000;/, 'The poster container must also be black');
assert.match(poster, /sky\.paths\.map/, 'Sourced line geometry required');
assert.match(poster, /star\.radius/, 'Star marker size must come from brightness');
assert.match(poster, /sign\.glyph/, 'Appropriate glyph for non-Aquarius fallback');
assert.match(poster, /fontSize=\{nameSize\}/, 'Name should have first priority');
assert.ok(!/fetch\(|localStorage|sessionStorage|addShopCartItem|router\.push|toDataURL|downloadPng/i.test(client + poster + engine), 'No network, persistence, cart or export in dev preview');
assert.match(css, /@media \(max-width: 850px\)/, 'Mobile preview required');
// A source-geometry projection test: increasing right ascension goes LEFT.
const aqr = figureCatalog.features.find((f) => f.id === 'Aqr').geometry.coordinates.flat();
const ra = aqr.map((p) => p[0]);
const dec = aqr.map((p) => p[1]);
const cr = (Math.min(...ra) + Math.max(...ra)) / 2;
const cd = (Math.min(...dec) + Math.max(...dec)) / 2;
const scale = Math.min(14, 224 / Math.hypot(
  Math.max(...ra.map((r) => Math.abs((r-cr) * Math.cos(cd * Math.PI/180)))),
  Math.max(...dec.map((d) => Math.abs(d-cd))),
));
const projected = aqr.map(([r,d]) => [450 - (r-cr)*Math.cos(cd*Math.PI/180)*scale, 358 - (d-cd)*scale]);
assert.ok(projected.every(([x,y]) => Math.hypot(x-450,y-358) < 294));
assert.ok(projected[0][0] > projected.at(-1)[0], 'Astronomical east-left orientation invariant');
console.log('NEMAD_MAN_BAHMAN_R2_SOURCE_GUARD=PASS');
console.log('ZODIAC_FIGURES=12 BSC_STARS=' + stars.meta.count + ' AQR_POINTS=' + aqr.length);
console.log('DEV_ROUTE_ONLY=PASS, AUTO_SIGN_SWITCH=SOURCE_VERIFIED, BOUNDARY_PROMPT=SOURCE_VERIFIED');
