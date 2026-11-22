/** Verify deterministic classification against independent Swiss reference labels. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === './vedic-d1-contract.js') {
      return nextResolve('./vedic-d1-contract.ts', context);
    }
    return nextResolve(specifier, context);
  },
});
const {
  assembleVedicD1Chart,
  classifyVedicMoon, classifyVedicSign, isNearVedicBoundary,
  normalizeVedicLongitude,
  VEDIC_D1_BODY_ORDER,
} = await import('../lib/vedic/vedic-d1-assembly.ts');
import { validateVedicD1BirthRequest } from '../lib/vedic/vedic-d1-contract.ts';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = JSON.parse(readFileSync(resolve(root, 'fixtures/vedic-d1-reference-v1.json'), 'utf8'));
assert.equal(fixtures.vectors.length, 14);

const ids = ['sun','moon','mars','mercury','jupiter','venus','saturn','rahu'];
let checked = 0;
for (const vector of fixtures.vectors) {
  const deps = {
    findCityById: (id) => id === vector.id ? {
      id, name: id, latitude: vector.latitude, longitude: vector.longitude, timezone: vector.timezone,
    } : null,
    parseJalali: () => ({ ok: false, message: 'not needed for reference fixture' }),
  };
  const verified = validateVedicD1BirthRequest({
    calendar:'gregorian', birthDate: vector.localDate, birthTime: vector.localTime, cityId: vector.id,
  }, deps);
  assert.equal(verified.ok, true, `${vector.id} input`);
  const snapshot = {
    utcIso: vector.utcIso,
    calculationVersion: 'test-only-Swiss-Ephemeris-2.10.03',
    ephemerisSource: 'locked-reference-fixture-not-production-provider',
    coordinateFrame: 'lahiri-sidereal-ecliptic-of-date',
    ayanamshaMode: 'SE_SIDM_LAHIRI', nodeModel: 'mean',
    ayanamshaDegrees: vector.ayanamshaDegrees,
    ascendantLongitude: vector.ascendant.longitude,
    maxErrorArcMinutes: 0,
    positions: Object.fromEntries(ids.map(id => [id, vector.placements[id].longitude])),
  };
  const chart = assembleVedicD1Chart(verified.value, snapshot);
  assert.ok(Math.abs(chart.ascendantLongitude - vector.ascendant.longitude) < 1e-7, `${vector.id} lagna`);
  assert.equal(chart.ascendantSignIndex, vector.ascendant.signIndex, `${vector.id} lagna sign`);
  assert.deepEqual(chart.placements.map(p=>p.id), VEDIC_D1_BODY_ORDER, `${vector.id} order`);
  for (const placement of chart.placements) {
    const reference = vector.placements[placement.id];
    assert.ok(reference, `${vector.id} ${placement.id} missing`);
    assert.ok(Math.abs(placement.longitude - reference.longitude) < 1e-7, `${vector.id} ${placement.id} longitude`);
    assert.equal(placement.signIndex, reference.signIndex, `${vector.id} ${placement.id} sign`);
    assert.equal(placement.houseNumber, reference.houseNumber, `${vector.id} ${placement.id} house`);
    checked++;
  }
  assert.deepEqual({ index: chart.nakshatra.index, pada: chart.nakshatra.pada }, vector.moonNakshatra, `${vector.id} moon`);
  assert.equal(Math.abs(((chart.placements[8].longitude - chart.placements[7].longitude + 360)%360)-180) < 1e-9, true);
}

assert.deepEqual(classifyVedicSign(360), { signIndex: 0, degreeInSign: 0 });
assert.deepEqual(classifyVedicSign(-30), { signIndex: 11, degreeInSign: 0 });
assert.equal(classifyVedicSign(30 - 1e-7).signIndex, 0);
assert.equal(classifyVedicSign(30).signIndex, 1);
assert.equal(classifyVedicSign(30 + 1e-7).signIndex, 1);
assert.equal(classifyVedicMoon(0).index, 0);
assert.equal(classifyVedicMoon(360).pada, 1);
assert.equal(classifyVedicMoon(360 - 1e-7).index, 26);
assert.equal(classifyVedicMoon(360 - 1e-7).pada, 4);
for (let i = 0; i < 108; i++) {
  const boundary = i*(360/108);
  const on = classifyVedicMoon(boundary);
  assert.equal(on.index, Math.floor(i/4), `nak ${i}`);
  assert.equal(on.pada, i%4+1, `pada ${i}`);
  const justBefore = classifyVedicMoon(boundary - 1e-7);
  assert.equal(justBefore.pada, (i+3)%4+1, `pada before ${i}`);
  const after = classifyVedicMoon(boundary + 1e-7);
  assert.equal(after.pada, i%4+1, `pada after ${i}`);
}
assert.equal(isNearVedicBoundary(29.99, 30, .05), true);
assert.equal(isNearVedicBoundary(15,30,.05),false);
assert.equal(normalizeVedicLongitude(720),0);
for (const invalid of [NaN, Infinity, -Infinity]) assert.throws(()=> normalizeVedicLongitude(invalid),/VEDIC_D1_LONGITUDE_INVALID/);

const reference = fixtures.vectors[0];
const verified = validateVedicD1BirthRequest({ calendar:'gregorian', birthDate: reference.localDate,
  birthTime: reference.localTime,cityId:reference.id },{
    findCityById:()=>({id:reference.id,name:'Test',timezone:reference.timezone,latitude:reference.latitude,longitude:reference.longitude}),
    parseJalali:()=>({ok:false,message:'unused'}),
  });
assert.equal(verified.ok,true);
const snapshot = {
  utcIso: reference.utcIso, calculationVersion:'test-version', ephemerisSource:'test-only',
  coordinateFrame:'lahiri-sidereal-ecliptic-of-date', ayanamshaMode:'SE_SIDM_LAHIRI',nodeModel:'mean',
  ayanamshaDegrees:reference.ayanamshaDegrees,ascendantLongitude:30.01,maxErrorArcMinutes:3,
  positions:{ sun:30.01,moon:360-0.01,mars:42,mercury:90,jupiter:120,venus:60,saturn:240,rahu:0 },
};
const boundaryChart = assembleVedicD1Chart(verified.value,snapshot);
assert.equal(boundaryChart.uncertainty.ascendantSign,true);
assert.equal(boundaryChart.uncertainty.placementSign.sun,true);
assert.equal(boundaryChart.uncertainty.placementHouse.mars,true); // Rising sign uncertain
assert.equal(boundaryChart.uncertainty.moonNakshatra,true);
assert.equal(boundaryChart.uncertainty.moonPada,true);
assert.equal(boundaryChart.placements.find(x=>x.id==='ketu').longitude,180);
assert.throws(()=>assembleVedicD1Chart(verified.value,{...snapshot,utcIso:'2000-01-01T00:00:00.000Z'}),/TIME_MISMATCH/);
assert.throws(()=>assembleVedicD1Chart(verified.value,{...snapshot,coordinateFrame:'tropical'}),/FRAME_MISMATCH/);
assert.throws(()=>assembleVedicD1Chart(verified.value,{...snapshot,nodeModel:'true'}),/FRAME_MISMATCH/);
assert.throws(()=>assembleVedicD1Chart(verified.value,{...snapshot,maxErrorArcMinutes:4}),/PROVENANCE_INVALID/);
assert.throws(()=>assembleVedicD1Chart(verified.value,{...snapshot,positions:{ ...snapshot.positions,moon:NaN}}),/LONGITUDE_INVALID/);
assert.throws(()=>assembleVedicD1Chart(verified.value,{...snapshot,positions:{ ...snapshot.positions,moon:undefined}}),/LONGITUDE_INVALID/);
console.log(`PASS Vedic D1 deterministic assembly: ${fixtures.vectors.length} synthetic Swiss reference charts, ${checked} placements, 108 pada edges + invalid frame, UTC and source guards`);
console.log('NOT RUN: independent planetary ephemeris accuracy (requires real sidereal provider), full app build/Western E2E');
