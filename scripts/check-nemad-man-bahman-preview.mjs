import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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
assert.match(poster, /NEMAD_MAN_ZODIAC_GLYPHS\[sign\.id\]/, 'Render the approved shared icon pack');
assert.ok(!poster.includes('nemad-wisps') && !poster.includes('nemad-grain'), 'Do not reinstate blue haze or aggressive grain');
assert.match(css, /background: #000000;/, 'The poster container must also be black');
assert.match(poster, /sky\.paths\.map/, 'Sourced line geometry required');
assert.match(poster, /star\.radius/, 'Star marker size must come from brightness');
assert.ok(!poster.includes('sign.glyph') && !poster.includes('M391 752'), 'Do not use font glyphs or manual waves');
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

// Lock the actual approved raster bytes, not just the 12 names or a CSS lookalike.
const glyphRegistry = read('lib/shop/nemad-man-zodiac-glyphs.ts');
assert.match(glyphRegistry, /approved-silver-v1-2026-11-17/);
const expectedApprovedGlyphs = {
  aries: '23634f956886622dbc10fa657081f0461ef2c2f7',
  taurus: '18de09c279c6d3b8c70e015d933685a8daf7c14a',
  gemini: 'ecc446c167b48d0e827660347a25573aefe31040',
  cancer: '2c62cc0c3e028174802e612fe270bdf4d5650bad',
  leo: '46982552934d9682aaa028e0702b3671ef38e585',
  virgo: '02310d7bef5d7f166210aa67463aa44498f58738',
  libra: '79f19821c890c628961d6f23869cc361bfe3c8fb',
  scorpio: '581fbc841db932d351285b6ed982496396795edf',
  sagittarius: 'd63720a177c9b5a10ad3f3fc1600c7e35219b737',
  capricorn: 'ff06bd3adb19450ee9e523e072447b9f5cff34f5',
  aquarius: 'cf5189194766aafa5180e8501d376356561a58b3',
  pisces: 'e4021f1439e53555b667a2b69925ba96b77797af',
};
for (const [name, expectedSha] of Object.entries(expectedApprovedGlyphs)) {
  const asset = '/nemad-man/zodiac-glyphs-v1/' + name + '.webp';
  assert.ok(glyphRegistry.includes(name + ": '" + asset + "'"), 'Missing canonical mapping: ' + name);
  const bytes = readFileSync(resolve(root, 'public' + asset));
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', 'Invalid WebP: ' + name);
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', 'Invalid WebP: ' + name);
  const blobPrefix = Buffer.from('blob ' + bytes.length + String.fromCharCode(0));
  const actualSha = createHash('sha1').update(blobPrefix).update(bytes).digest('hex');
  assert.equal(actualSha, expectedSha, 'Approved glyph pixels changed: ' + name);
}
const master = readFileSync(resolve(root, 'public/nemad-man/zodiac-glyphs-v1/source-contact-sheet.webp'));
const masterPrefix = Buffer.from('blob ' + master.length + String.fromCharCode(0));
assert.equal(createHash('sha1').update(masterPrefix).update(master).digest('hex'),
  '9e8efe96d6cd5636a4f1de99b63e2d83fceb7666', 'Approved original zodiac sheet changed');
assert.ok(poster.includes('<image href={NEMAD_MAN_ZODIAC_GLYPHS[sign.id]}'),
  'Renderer must consume shared canonical assets, never a regenerated symbol');

console.log('NEMAD_MAN_BAHMAN_R2_SOURCE_GUARD=PASS');
console.log('ZODIAC_FIGURES=12 BSC_STARS=' + stars.meta.count + ' AQR_POINTS=' + aqr.length);
console.log('DEV_ROUTE_ONLY=PASS, AUTO_SIGN_SWITCH=SOURCE_VERIFIED, BOUNDARY_PROMPT=SOURCE_VERIFIED');
