/** Focused tests for ordered Persian Nakshatra catalog and cautious display. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === './vedic-d1-contract.js') return nextResolve('./vedic-d1-contract.ts', context);
  if (specifier === './vedic-d1-assembly.js') return nextResolve('./vedic-d1-assembly.ts', context);
  return nextResolve(specifier, context);
} });
const { classifyVedicMoon, isNearVedicBoundary } = await import('../lib/vedic/vedic-d1-assembly.ts');
const {
  VEDIC_D1_NAKSHATRAS, VEDIC_D1_NAKSHATRA_CATALOG_VERSION,
  getVedicD1NakshatraByIndex, getVedicD1NakshatraDisplay,
} = await import('../lib/vedic/vedic-d1-nakshatras.ts');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const references = JSON.parse(readFileSync(resolve(root, 'fixtures/vedic-d1-reference-v1.json'), 'utf8'));
const expectedIds = ['ashwini','bharani','krittika','rohini','mrigashira','ardra','punarvasu',
  'pushya','ashlesha','magha','purva-phalguni','uttara-phalguni','hasta','chitra','swati',
  'vishakha','anuradha','jyeshtha','mula','purva-ashadha','uttara-ashadha','shravana',
  'dhanishta','shatabhisha','purva-bhadrapada','uttara-bhadrapada','revati'];
assert.equal(VEDIC_D1_NAKSHATRA_CATALOG_VERSION,'vedic-d1-nakshatra-catalog/1');
assert.deepEqual(VEDIC_D1_NAKSHATRAS.map(x=>x.id),expectedIds);
assert.equal(new Set(VEDIC_D1_NAKSHATRAS.map(x=>x.nameFa)).size,27);
assert.equal(new Set(VEDIC_D1_NAKSHATRAS.map(x=>x.nameEn)).size,27);
for (const [i, item] of VEDIC_D1_NAKSHATRAS.entries()) {
  assert.equal(getVedicD1NakshatraByIndex(i),item);
  assert.match(item.nameFa,/[آ-ی]/);
  assert.ok(item.nameEn.length > 2);
  // Each mansion spans exactly 800 arcminutes, its four padas 200 each.
  const first = classifyVedicMoon(i * 800 / 60);
  assert.equal(first.index,i);
  assert.equal(first.pada,1);
  const last = classifyVedicMoon(((i+1) * 800 - .000001) / 60);
  assert.equal(last.index,i);
  assert.equal(last.pada,4);
}
for (const invalid of [-1,27,2.1,NaN,Infinity]) {
  assert.throws(()=>getVedicD1NakshatraByIndex(invalid),/INDEX_INVALID/);
}
let validatedPadas=0;
for(let p=0;p<108;p++) {
  const degrees = p * 360 / 108;
  const moon=classifyVedicMoon(degrees);
  const display=getVedicD1NakshatraDisplay(moon,{moonNakshatra:false,moonPada:false});
  assert.equal(display.id,expectedIds[Math.floor(p/4)]);
  assert.equal(display.pada,(p%4)+1);
  assert.equal(display.cautionFa,null);
  // Error margins affect display only; internal technical index remains stable.
  const uncertainty={moonNakshatra:isNearVedicBoundary(degrees,360/27,.05),
    moonPada:isNearVedicBoundary(degrees,360/108,.05)};
  const cautious=getVedicD1NakshatraDisplay(moon,uncertainty);
  assert.equal(cautious.pada,null);
  if (p%4===0) assert.equal(cautious.nameFa,null);
  else assert.equal(cautious.nameFa,VEDIC_D1_NAKSHATRAS[Math.floor(p/4)].nameFa);
  validatedPadas++;
}
assert.equal(getVedicD1NakshatraDisplay(classifyVedicMoon(0),{
  moonNakshatra:true,moonPada:false}).nameFa,null);
assert.equal(getVedicD1NakshatraDisplay(classifyVedicMoon(11),{
  moonNakshatra:false,moonPada:true}).pada,null);
assert.throws(()=>getVedicD1NakshatraDisplay({index:0,pada:1,moonLongitude:100},
  {moonNakshatra:false,moonPada:false}),/CLASSIFICATION_MISMATCH/);
assert.throws(()=>getVedicD1NakshatraDisplay({index:0,pada:1,moonLongitude:NaN},
  {moonNakshatra:false,moonPada:false}),/DISPLAY_INPUT_INVALID/);
assert.throws(()=>getVedicD1NakshatraDisplay(classifyVedicMoon(0),
  {moonNakshatra:undefined,moonPada:false}),/DISPLAY_INPUT_INVALID/);
for (const vector of references.vectors) {
  const moon=classifyVedicMoon(vector.placements.moon.longitude);
  assert.equal(moon.index,vector.moonNakshatra.index);
  assert.equal(moon.pada,vector.moonNakshatra.pada);
  const d=getVedicD1NakshatraDisplay(moon,{moonNakshatra:false,moonPada:false});
  assert.equal(d.nameFa,VEDIC_D1_NAKSHATRAS[moon.index].nameFa);
}
console.log(`PASS Vedic Nakshatra catalog: 27 ordered Persian names, ${validatedPadas} pada boundaries, ${references.vectors.length} independent Moon cases, uncertain display and invalid input checks`);
console.log('NOT RUN: full application UI or real astronomy-engine accuracy; no vendor ephemeris imported');
