/** Focused foundation checks. No network, DB, credentials, or site mutation. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  VEDIC_D1_CONTRACT_VERSION,
  VEDIC_D1_CALCULATION,
  validateVedicD1BirthRequest,
  resolveVedicCivilTime,
} from '../lib/vedic/vedic-d1-contract.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const references = JSON.parse(readFileSync(resolve(root, 'fixtures/vedic-d1-reference-v1.json'), 'utf8'));
assert.equal(references.schema, 'halleus/vedic-d1-independent-reference/v1');
assert.equal(references.syntheticDataOnly, true);
assert.equal(references.reference.siderealMode, 'SE_SIDM_LAHIRI');
assert.equal(references.reference.lunarNode, 'MEAN_NODE');
assert.equal(VEDIC_D1_CONTRACT_VERSION, 'vedic-d1/v1');
assert.equal(VEDIC_D1_CALCULATION.houses, 'whole-sign');
assert.ok(references.vectors.length >= 12);

const norm = (x) => ((x % 360) + 360) % 360;
const oneDegree = 30;
const nakSize = 360 / 27;
const padaSize = 360 / 108;
const between = (number, min, max, label) => assert.ok(Number.isFinite(number) && number >= min && number < max, `${label}: ${number}`);
const cityFor = (vector) => ({ id: vector.id, name: vector.id, latitude: vector.latitude,
  longitude: vector.longitude, timezone: vector.timezone });

for (const v of references.vectors) {
  const d = resolveVedicCivilTime(v.localDate, v.localTime, v.timezone);
  assert.equal(d.ok, true, `${v.id}: timezone conversion`);
  assert.equal(d.utcIso, v.utcIso, `${v.id}: UTC mismatch`);
  const input = validateVedicD1BirthRequest({
    birthDate: v.localDate, birthTime: v.localTime, calendar: 'gregorian', cityId: v.id,
    latitude: 90, timezone: 'invalid', // deliberately ignored, server owns city metadata
  }, {
    findCityById: (id) => id === v.id ? cityFor(v) : null,
    parseJalali: () => ({ ok: false, message: 'unused' }),
  });
  assert.equal(input.ok, true, `${v.id}: contract validation`);
  assert.equal(input.value.utcIso, v.utcIso, `${v.id}: validated UTC`);
  assert.equal(input.value.city.latitude, v.latitude, `${v.id}: untrusted latitude ignored`);
  between(v.ayanamshaDegrees, 0, 360, `${v.id} ayanamsha`);
  between(v.ascendant.longitude, 0, 360, `${v.id} asc`);
  const ascSign = Math.floor(v.ascendant.longitude / oneDegree);
  assert.equal(v.ascendant.signIndex, ascSign, `${v.id} asc sign`);
  assert.equal(v.ascendant.houseNumber, 1, `${v.id} asc house`);
  assert.deepEqual(Object.keys(v.placements).sort(),
    ['sun','moon','mars','mercury','jupiter','venus','saturn','rahu','ketu'].sort());
  for (const [id, p] of Object.entries(v.placements)) {
    between(p.longitude, 0, 360, `${v.id} ${id}`);
    assert.equal(p.signIndex, Math.floor(p.longitude / oneDegree), `${v.id} ${id} sign`);
    assert.equal(p.houseNumber, ((p.signIndex - ascSign + 12) % 12) + 1, `${v.id} ${id} house`);
  }
  assert.ok(Math.abs(norm(v.placements.ketu.longitude - v.placements.rahu.longitude) - 180) < 1e-7,
    `${v.id}: Ketu is the exact opposite of Rahu`);
  assert.equal(v.moonNakshatra.index, Math.floor(v.placements.moon.longitude / nakSize), `${v.id}: nakshatra`);
  assert.equal(v.moonNakshatra.pada, Math.floor((v.placements.moon.longitude % nakSize) / padaSize) + 1, `${v.id}: pada`);
}

const dep = {
  findCityById: (id) => id === 'tehran' ? {
    id, name: 'تهران', latitude: 35.6892, longitude: 51.389, timezone: 'Asia/Tehran',
  } : null,
  // Adapter simulates an already validated response from lib/date/jalali.ts.
  // Real parser integration requires the application repository.
  parseJalali: (date) => date === '1371/05/21'
    ? { ok: true, gregorianIso: '1992-08-12' }
    : { ok: false, message: 'تاریخ شمسی معتبر نیست.' },
};
const request = (changes = {}) => ({
  birthDate: '1992-08-12', calendar: 'gregorian', birthTime: '00:05', cityId: 'tehran', ...changes,
});
function err(input, code) {
  const out = validateVedicD1BirthRequest(input, dep);
  assert.equal(out.ok, false, `${code}: expected rejection`);
  assert.equal(out.issue.code, code);
  assert.match(out.issue.message, /[آ-ی]/);
}
err(null, 'INPUT_REQUIRED');
err(request({ calendar: 'unknown' }), 'CALENDAR_INVALID');
err(request({ birthDate: '1992-02-30' }), 'DATE_INVALID');
err(request({ birthDate: '1899-12-31' }), 'DATE_INVALID');
err(request({ birthTime: '' }), 'TIME_REQUIRED');
err(request({ birthTime: '25:00' }), 'TIME_INVALID');
err(request({ birthTime: '12' }), 'TIME_INVALID');
err(request({ cityId: '' }), 'CITY_REQUIRED');
err(request({ cityId: 'baku' }), 'CITY_UNKNOWN');
err(request({ birthDate: '1371/13/01', calendar: 'jalali' }), 'DATE_INVALID');
err(request({ birthDate: '1992-03-22', birthTime: '00:30' }), 'TIME_NONEXISTENT');
err(request({ birthDate: '1992-09-21', birthTime: '23:30' }), 'TIME_AMBIGUOUS');
const earlier = validateVedicD1BirthRequest(request({ birthDate: '1992-09-21', birthTime: '23:30', occurrence: 'earlier' }), dep);
const later = validateVedicD1BirthRequest(request({ birthDate: '1992-09-21', birthTime: '23:30', occurrence: 'later' }), dep);
assert.ok(earlier.ok && later.ok);
assert.equal(Date.parse(later.value.utcIso) - Date.parse(earlier.value.utcIso), 3600000);
assert.equal(validateVedicD1BirthRequest(request({ birthTime: '۱۲:۰۰' }), dep).ok, true);
assert.equal(validateVedicD1BirthRequest(request({ calendar: 'jalali', birthDate: '۱۳۷۱/۰۵/۲۱' }), dep).value.utcIso,
  '1992-08-11T19:35:00.000Z');
assert.equal(resolveVedicCivilTime('1992-08-12', '10:00', 'Invalid/Timezone').issue.code, 'TIMEZONE_INVALID');

console.log(`PASS vedic-d1 foundation: ${references.vectors.length} Swiss/Moshier reference vectors + input/DST invariants`);
console.log('NOT RUN: Western end-to-end baseline, actual Jalali/city integration, independent numeric engine comparison');
