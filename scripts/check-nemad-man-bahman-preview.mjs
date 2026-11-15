import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const read = (file) => readFileSync(resolve(root, file), 'utf8');
const files = [
  'app/shop/nemad-man/bahman-preview/page.tsx',
  'components/shop/NemadManBahmanPreview.tsx',
  'components/shop/NemadManBahmanArtwork.tsx',
  'lib/shop/nemad-man-bahman-preview.ts',
];
for (const file of files) {
  const transpiled = ts.transpileModule(read(file), {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  });
  const errors = (transpiled.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  assert.deepEqual(errors, [], 'TS/TSX parse failed: ' + file);
}
const route = read(files[0]);
const client = read(files[1]);
const artwork = read(files[2]);
const helper = read(files[3]);
const css = read('components/shop/nemad-man-bahman-preview.module.css');
assert.match(route, /process\.env\.NODE_ENV === 'production'\) notFound\(\)/, 'Production route must remain closed.');
assert.match(route, /index: false, follow: false/, 'Preview must remain noindex.');
assert.match(route, /force-dynamic/, 'Preview must not be prerendered.');
assert.match(client, /validateBahmanPreview\(name, date\)/, 'Submit must validate name/date.');
assert.match(client, /<NemadManBahmanArtwork name=\{preview\.name\} date=\{preview\.gregorianDate\}/);
assert.match(client, /type="submit"/, 'Interactive submit required.');
assert.match(client, /دادهٔ مرجع نجومی/, 'Do not claim a natal star map.');
assert.match(helper, /parseJalaliDateInput\(dateInput\)/, 'Must reuse real validated Jalali parser.');
assert.match(helper, /parsed\.jalaliMonth !== 11/, 'Only Bahman dates accepted.');
assert.match(helper, /feature\.id === 'Aqr'/, 'Must source Aquarius figure from repo.');
assert.match(artwork, /BAHMAN_CONSTELLATION\.map/, 'Constellation must be actual sourced geometry.');
assert.match(artwork, /پیش‌نمایش هالیوس/, 'Watermark present.');
assert.ok(!/fetch\(|localStorage|sessionStorage|addShopCartItem|router\.push|download|toDataURL/i.test(client + artwork + helper),
  'No persistence, cart, download or remote requests in a preview-only flow.');
assert.match(css, /@media \(max-width: 850px\)/, 'Mobile layout expected.');

const catalogue = JSON.parse(read('lib/shop/catalog/constellations-d3-celestial-v1.json'));
const aqr = catalogue.features.filter((feature) => feature.id === 'Aqr');
assert.equal(aqr.length, 1, 'Exactly one Aquarius feature.');
assert.equal(aqr[0].geometry.type, 'MultiLineString');
assert.equal(aqr[0].geometry.coordinates.length, 5);
const points = aqr[0].geometry.coordinates.flat();
assert.ok(points.length >= 15);
assert.ok(points.every((p) => p.length === 2 && p.every(Number.isFinite)));
const ras = points.map((p) => p[0]);
const decs = points.map((p) => p[1]);
const meanRa = (Math.min(...ras) + Math.max(...ras)) / 2;
const meanDec = (Math.min(...decs) + Math.max(...decs)) / 2;
const projected = points.map(([ra, dec]) => ({
  x: 450 + (ra - meanRa) * 10.3 * Math.cos(meanDec * Math.PI / 180),
  y: 375 - (dec - meanDec) * 10.3,
}));
assert.ok(projected.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y) && Math.hypot(x - 450, y - 375) < 286),
  'All selected source vertices must fit in the circular poster sky.');
console.log('NEMAD_MAN_BAHMAN_PREVIEW_GUARD=PASS');
console.log('AQUARIUS_SOURCE_POLYLINES=' + aqr[0].geometry.coordinates.length);
console.log('AQUARIUS_SOURCE_VERTICES=' + points.length);
console.log('Production route closed; preview uses client-only name and Jalali birth date.');
