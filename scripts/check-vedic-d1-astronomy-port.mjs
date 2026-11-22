/**
 * Test-only Swiss-fed structural port test. It checks real application call
 * signatures, ascendant geometry, input isolation and failure behavior.
 * It DOES NOT run astronomy-engine; real package validation stays open.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  calculateVedicD1TropicalInput, calculateVedicPortTropicalAscendant,
  approximateTrueObliquity,
} from '../lib/vedic/vedic-d1-astronomy-port.ts';
import { validateVedicD1BirthRequest } from '../lib/vedic/vedic-d1-contract.ts';
import { projectVedicD1Longitudes } from '../lib/vedic/vedic-d1-projection.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reference = JSON.parse(readFileSync(resolve(root, 'fixtures/vedic-d1-reference-v1.json'), 'utf8'));
const python = process.env.VEDIC_TEST_PYTHON || 'python';
const source = spawnSync(python, ['scripts/vedic-d1-test-tropical-provider.py'], {cwd:root,encoding:'utf8'});
if (source.status !== 0 || source.error) throw new Error(`Swiss fixture port source unavailable: ${source.stderr || source.error?.message}`);
const tropical = JSON.parse(source.stdout).samples;
assert.equal(tropical.length, reference.vectors.length);
const degreesDistanceArcmin = (a,b) => Math.abs(((a - b + 540) % 360) - 180)*60;
const ids = ['sun','moon','mars','mercury','jupiter','venus','saturn'];
const bodyNames = {Sun:'sun',Moon:'moon',Mars:'mars',Mercury:'mercury',Jupiter:'jupiter',Venus:'venus',Saturn:'saturn'};
let worstTrueObliquity = 0;
let worstTropicalAsc = 0;
let worstSiderealAsc = 0;
let checked = 0;
for (const row of tropical) {
  const original = reference.vectors.find(x=>x.id===row.id);
  assert.ok(original, `${row.id}: independent sidereal reference missing`);
  const parsed = validateVedicD1BirthRequest({calendar:'gregorian',birthDate:original.localDate,
    birthTime:original.localTime,cityId:row.id}, {
    findCityById:id=>id===row.id?{id,name:id,timezone:original.timezone,
      latitude:original.latitude,longitude:original.longitude}:null,
    parseJalali:()=>({ok:false,message:'unused'}),
  });
  assert.equal(parsed.ok,true, `${row.id}: invalid birth data`);
  const calls = [];
  class MockTime { constructor(date) {this.date=date;} }
  const fakeAstronomy = {
    Body:Object.fromEntries(Object.keys(bodyNames).map(k=>[k,k])),
    AstroTime:MockTime,
    SiderealTime:time=> {assert.equal(time.date.toISOString(),row.utcIso); calls.push('sidereal');return row.siderealHours;},
    GeoVector:(body,time,aberration)=>{assert.equal(aberration,true);assert.equal(time.date.toISOString(),row.utcIso);
      calls.push(`body:${body}`);return {id:body,time};},
    Ecliptic:vector=> {calls.push(`ecliptic:${vector.id}`);return {elon:row.positions[bodyNames[vector.id]]};},
  };
  const out=calculateVedicD1TropicalInput(parsed.value,fakeAstronomy);
  assert.equal(out.utcIso,row.utcIso);
  assert.equal(out.coordinateFrame,'apparent-tropical-ecliptic-of-date');
  assert.match(out.ephemerisSource,/astronomy-engine/);
  assert.equal(calls.length,1+7+7, `${row.id}: call count`);
  assert.equal(calls.filter(c=>c.startsWith('body:')).length,7, `${row.id}: planet calls`);
  for (const id of ids) assert.equal(out.positions[id],row.positions[id],`${row.id}: ${id} mapping`);
  const trueObliquityError=degreesDistanceArcmin(approximateTrueObliquity(new Date(row.utcIso)),row.trueObliquityReference);
  worstTrueObliquity=Math.max(worstTrueObliquity,trueObliquityError);
  assert.ok(trueObliquityError<0.2, `${row.id}: obliquity ${trueObliquityError}`);
  const tropicalAscError=degreesDistanceArcmin(out.ascendantLongitude,row.tropicalAscendantReference);
  worstTropicalAsc=Math.max(worstTropicalAsc,tropicalAscError);
  assert.ok(tropicalAscError<=3, `${row.id}: tropical ascendant ${tropicalAscError}`);
  const projection=projectVedicD1Longitudes(out);
  assert.equal(projection.verification,'NOT_VALIDATED_AS_FULL_EPHEMERIS');
  const siderealAscError=degreesDistanceArcmin(projection.ascendantLongitude,original.ascendant.longitude);
  worstSiderealAsc=Math.max(worstSiderealAsc,siderealAscError);
  assert.ok(siderealAscError<=3,`${row.id}: sidereal ascendant ${siderealAscError}`);
  checked++;
}
assert.throws(()=>calculateVedicPortTropicalAscendant(24,23.4,35,52),/ASCENDANT_INPUT_INVALID/);
assert.throws(()=>calculateVedicPortTropicalAscendant(0,23.4,90,52),/ASCENDANT_INPUT_INVALID/);
assert.throws(()=>calculateVedicPortTropicalAscendant(NaN,23.4,35,52),/ASCENDANT_INPUT_INVALID/);
assert.throws(()=>approximateTrueObliquity(new Date('1899-12-31T23:00:00Z')),/DATE_OUT_OF_RANGE/);
const row=tropical[0];
const b={utcIso:row.utcIso,city:{latitude:35,longitude:51},contractVersion:'vedic-d1/v1'};
const good={Body:Object.fromEntries(Object.keys(bodyNames).map(k=>[k,k])),AstroTime:class{constructor(date){this.date=date;}},
  GeoVector(body){return {elon:row.positions[bodyNames[body]]};},Ecliptic(vec){return vec;},SiderealTime(){return 7;}};
assert.throws(()=>calculateVedicD1TropicalInput({...b,utcIso:'invalid'},good),/INVALID_TIME/);
assert.throws(()=>calculateVedicD1TropicalInput({...b,city:{latitude:90,longitude:51}},good),/CITY_INVALID/);
assert.throws(()=>calculateVedicD1TropicalInput(b,{...good,GeoVector(){return {elon:NaN};}}),/NONFINITE_LONGITUDE/);
assert.throws(()=>calculateVedicD1TropicalInput(b,{...good,Body:{...good.Body,Sun:undefined}}),/BODY_MISSING/);
console.log(`PASS Astronomy port Swiss-fed integration seam: ${checked} synthetic UTC samples; max obliquity=${worstTrueObliquity.toFixed(5)}', tropical ASC=${worstTropicalAsc.toFixed(5)}', projected ASC=${worstSiderealAsc.toFixed(5)}' (arcminutes)`);
console.log('EXTERNAL BLOCK: real astronomy-engine 2.1.19 runtime and fully independent numerical comparison NOT RUN');
