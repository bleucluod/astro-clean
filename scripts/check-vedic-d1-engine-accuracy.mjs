/**
 * The real, release-blocking numerical test. Unlike Swiss-fed seam tests, it
 * executes the actual astronomy-engine@2.1.19 implementation for each body.
 * Prefer the installed package. When npm is unavailable, use ONLY the pinned
 * MIT-licensed official upstream bundle in scripts/vendor/ as TEST-ONLY input.
 * That fallback does not establish Next.js package installation/build readiness.
 * The source SHA/size is locked before executing the upstream bundle.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { validateVedicD1BirthRequest } from '../lib/vedic/vedic-d1-contract.ts';
import { calculateVedicD1TropicalInput } from '../lib/vedic/vedic-d1-astronomy-port.ts';
import { projectVedicD1Longitudes } from '../lib/vedic/vedic-d1-projection.ts';

const require = createRequire(import.meta.url);
let astronomy;
let packageInfo;
let sourceMode = 'installed-npm';
const vendorPath = resolve(dirname(fileURLToPath(import.meta.url)), 'vendor/astronomy-engine-2.1.19.cjs');
const VENDOR_GIT_BLOB_SHA = 'd360d86756976208618b31f855d2446284a5f3e4';
try {
  astronomy = require('astronomy-engine');
  // Official astronomy-engine exports only ".", not "./package.json".
  // Resolve the package root from the declared CommonJS entry, then read
  // its version without bypassing or altering the runtime calculations.
  const installedEntry = require.resolve('astronomy-engine');
  packageInfo = JSON.parse(readFileSync(resolve(dirname(installedEntry), 'package.json'), 'utf8'));
} catch (error) {
  if (error?.code !== 'MODULE_NOT_FOUND') throw error;
  // This is the exact upstream MIT minified Node bundle at source/js/
  // astronomy.min.js, verified against the GitHub blob before use. It is
  // for numerical acceptance ONLY, never a substitute for Next's runtime.
  let source;
  try {
    source = readFileSync(vendorPath);
  } catch {
    console.error('BLOCKED_BY_DEPENDENCY: neither installed astronomy-engine nor pinned test-only source exists');
    process.exitCode = 2;
  }
  if (source) {
    const gitBlob = createHash('sha1')
      .update('blob ' + source.byteLength + '\0')
      .update(source)
      .digest('hex');
    assert.equal(gitBlob, VENDOR_GIT_BLOB_SHA, 'Official upstream astronomy-engine source fingerprint changed');
    astronomy = require(vendorPath);
    packageInfo = { version: '2.1.19' };
    sourceMode = 'pinned-upstream-test-only';
  }
}
if (astronomy && packageInfo) {
  assert.equal(packageInfo.version,'2.1.19', 'Reference gate is version-pinned; review mismatches first');
  const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
  const reference=JSON.parse(readFileSync(resolve(root,'fixtures/vedic-d1-reference-v1.json'),'utf8'));
  assert.equal(reference.vectors.length,14,'Locked vector count changed');
  assert.equal(reference.reference.siderealMode,'SE_SIDM_LAHIRI');
  const arcminDistance=(a,b)=>Math.abs(((a-b+540)%360)-180)*60;
  const failures=[];
  const maxima={};
  const ids=['sun','moon','mars','mercury','jupiter','venus','saturn','rahu','ketu','ascendant','ayanamsha'];
  for (const id of ids) maxima[id]={arcMinutes:0,vector:''};
  for (const v of reference.vectors) {
    const birth=validateVedicD1BirthRequest({calendar:'gregorian',birthDate:v.localDate,
      birthTime:v.localTime,cityId:v.id}, {
      findCityById:id=>id===v.id?{id,name:id,latitude:v.latitude,
        longitude:v.longitude,timezone:v.timezone}:null,
      parseJalali:()=>({ok:false,message:'not relevant'}),
    });
    assert.equal(birth.ok,true, `${v.id}: invalid fixture input`);
    const tropical=calculateVedicD1TropicalInput(birth.value,astronomy);
    const projected=projectVedicD1Longitudes(tropical);
    // The projection deliberately does not certify source ephemeris accuracy.
    assert.equal(projected.verification,'NOT_VALIDATED_AS_FULL_EPHEMERIS');
    const errors={};
    for (const id of ids) {
      const actual=id==='ascendant'?projected.ascendantLongitude:
        id==='ayanamsha'?projected.calculatedAyanamshaDegrees:projected.positions[id];
      const expected=id==='ascendant'?v.ascendant.longitude:
        id==='ayanamsha'?v.ayanamshaDegrees:v.placements[id].longitude;
      const difference=arcminDistance(actual,expected);
      errors[id]=difference;
      if (difference>maxima[id].arcMinutes) maxima[id]={arcMinutes:difference,vector:v.id};
      if (!Number.isFinite(difference)||difference>3) failures.push(`${v.id}/${id}: ${difference} arcminutes (gate 3)`);
    }
  }
  for (const id of ids) console.log(`${id}: max ${maxima[id].arcMinutes.toFixed(5)} arcmin (${maxima[id].vector})`);
  if (failures.length) {
    console.error(`CANDIDATE_FAILURE actual astronomy-engine accuracy: ${failures.length} comparisons failed\n${failures.join('\n')}`);
    process.exitCode=1;
  } else {
    console.log(`PASS real astronomy-engine@${packageInfo.version} [${sourceMode}]: 14 independent cases / 154 values incl Lagna and Lahiri`);
  }
}
