/** Independent numeric tests of the projection kernel, NOT of astronomy-engine. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { projectVedicD1Longitudes, wrapVedicAngle,
  approximateMeanLahiriAyanamsha, meanTropicalRahuLongitude } from '../lib/vedic/vedic-d1-projection.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = JSON.parse(readFileSync(resolve(root, 'fixtures/vedic-d1-reference-v1.json'), 'utf8'));
const python = process.env.VEDIC_TEST_PYTHON || 'python';
const source = spawnSync(python, ['scripts/vedic-d1-test-tropical-provider.py'], { cwd: root, encoding: 'utf8' });
if (source.error || source.status !== 0) throw new Error(`Independent test provider unavailable: ${source.error?.message ?? source.stderr}`);
const test = JSON.parse(source.stdout);
assert.equal(test.samples.length, fixture.vectors.length);
const angularArcMinutes = (actual, expected) => Math.abs(((actual - expected + 540) % 360) - 180) * 60;
let maxError = { item: '', arcMinutes: 0 };
let total = 0;
for (const source of test.samples) {
  const expected = fixture.vectors.find(x => x.id === source.id);
  assert.ok(expected);
  const projected = projectVedicD1Longitudes(source);
  assert.equal(projected.verification, 'NOT_VALIDATED_AS_FULL_EPHEMERIS');
  assert.equal(projected.utcIso, expected.utcIso);
  const ayanError = Math.abs(projected.calculatedAyanamshaDegrees - source.meanAyanamshaReference) * 60;
  assert.ok(ayanError < 0.005, `${source.id} mean ayanamsha ${ayanError} arcmin`);
  // Mean ayanamsha vs Swiss's true-equator sidereal adjustment includes nutation.
  assert.ok(angularArcMinutes(projected.ascendantLongitude, expected.ascendant.longitude) <= 3, `${source.id} lagna`);
  for (const id of ['sun','moon','mars','mercury','jupiter','venus','saturn','rahu','ketu']) {
    const e = angularArcMinutes(projected.positions[id], expected.placements[id].longitude);
    if (e > maxError.arcMinutes) maxError = { item: `${source.id}/${id}`, arcMinutes: e };
    assert.ok(e <= 3, `${source.id}/${id}: ${e.toFixed(5)} arcminutes`);
    total++;
  }
}
const date = new Date('2000-01-01T12:00:00.000Z');
assert.ok(approximateMeanLahiriAyanamsha(date) > 23 && approximateMeanLahiriAyanamsha(date) < 25);
assert.ok(meanTropicalRahuLongitude(date) >= 0 && meanTropicalRahuLongitude(date) < 360);
assert.equal(wrapVedicAngle(360),0);
assert.equal(wrapVedicAngle(-30),330);
assert.throws(()=>wrapVedicAngle(Infinity), /LONGITUDE_INVALID/);
assert.throws(()=>approximateMeanLahiriAyanamsha(new Date('1800-01-01')), /OUTSIDE_CALIBRATION/);
assert.throws(()=>projectVedicD1Longitudes({ ...test.samples[0], coordinateFrame: 'J2000' }), /SOURCE_FRAME_INVALID/);
assert.throws(()=>projectVedicD1Longitudes({ ...test.samples[0], positions: {...test.samples[0].positions, moon:NaN} }), /LONGITUDE_INVALID/);
assert.throws(()=>projectVedicD1Longitudes({ ...test.samples[0], utcIso:'broken' }), /UTC_INVALID/);
console.log(`PASS projection: ${test.samples.length} Swiss/Moshier test-only tropical samples / ${total} positions, worst ${maxError.item} ${maxError.arcMinutes.toFixed(5)} arcminutes`);
console.log('NOT TESTED: astronomy-engine tropical planetary provider and real tropical ascendant; projection remains unverified as complete engine.');
