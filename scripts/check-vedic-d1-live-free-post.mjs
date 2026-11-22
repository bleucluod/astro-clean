/**
 * Step 07 actual guest pipeline: official Astronomy Engine 2.1.19 (pinned
 * upstream MIT test-only copy), validated UTC, real sidereal projection,
 * whole-sign + 27 nakshatra classifier, free-only HTTP 200.
 * This executes REAL planetary calculations, not Swiss-fed fixture positions.
 * Does not substitute for a full Next/browser/mobile build.
 */
import assert from 'node:assert/strict';
import { createRequire, registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (/^\.\/vedic-d1-[\w-]+\.js$/.test(specifier)) {
      return nextResolve(specifier.replace(/\.js$/, '.ts'), context);
    }
    return nextResolve(specifier, context);
  },
});
const require = createRequire(import.meta.url);
const astronomy = require('./vendor/astronomy-engine-2.1.19.cjs');
const { validateVedicD1BirthRequest } = await import('../lib/vedic/vedic-d1-contract.ts');
const { calculateVedicD1GuestReading } = await import('../lib/vedic/vedic-d1-server-reading.ts');
const { handleVedicD1Post } = await import('../lib/vedic/vedic-d1-http.ts');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = JSON.parse(readFileSync(resolve(root, 'fixtures/vedic-d1-reference-v1.json'), 'utf8'));
assert.equal(fixture.vectors.length, 14);

const makeRequest = data => new Request('https://example.invalid/api/vedic/d1', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
let successful = 0;
for (const vector of fixture.vectors) {
  const resolveBirth = input => validateVedicD1BirthRequest(input, {
    findCityById: id => id === vector.id ? ({
      id, name: id, latitude: vector.latitude, longitude: vector.longitude,
      timezone: vector.timezone,
    }) : null,
    parseJalali: () => ({ ok: false, message: 'Unused for Gregorian reference' }),
  });
  const input = {
    calendar: 'gregorian',
    birthDate: vector.localDate,
    birthTime: vector.localTime,
    cityId: vector.id,
  };
  const parsed = resolveBirth(input);
  assert.equal(parsed.ok, true, vector.id + ': birth');
  assert.equal(parsed.value.utcIso, vector.utcIso, vector.id + ': UTC');
  const computed = calculateVedicD1GuestReading(parsed.value, astronomy);
  assert.equal(computed.kind, 'free-d1');
  assert.equal(computed.premiumStatus, 'not-available');
  assert.equal(computed.view.rows.length, 9);
  assert.equal(computed.view.moonNakshatra !== undefined, true);
  const response = await handleVedicD1Post(makeRequest(input), resolveBirth,
    birth => calculateVedicD1GuestReading(birth, astronomy));
  assert.equal(response.status, 200, vector.id + ': HTTP');
  assert.equal(response.headers.get('cache-control'), 'private, no-store, max-age=0');
  assert.equal(response.headers.get('pragma'), 'no-cache');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(response.headers.get('access-control-allow-origin'), null);
  const text = await response.text();
  const payload = JSON.parse(text);
  assert.equal(payload.ok, true);
  assert.equal(Object.keys(payload).sort().join(','), 'ok,reading');
  assert.equal(payload.reading.kind, 'free-d1');
  assert.equal(payload.reading.view.rows.length, 9);
  assert.equal(payload.reading.premiumStatus, 'not-available');
  assert.equal(payload.reading.availablePremiumChapterTitles.length, 4);
  assert.equal(payload.reading.shortReading.evidence.length, 2);
  for(const forbidden of [
    'private-draft-not-authorized','paragraphsFa','chapters','ownerId',
    vector.utcIso, vector.id, vector.localDate, 'birthTime','cityId',
  ]) assert.equal(text.includes(forbidden), false, 'Guest response leaked '+forbidden);
  successful++;
}
const vector = fixture.vectors[0];
const resolver = input => validateVedicD1BirthRequest(input, {
  findCityById: id => id===vector.id?{
    id,name:id,latitude:vector.latitude,longitude:vector.longitude,timezone:vector.timezone
  }:null,
  parseJalali:()=>({ok:false,message:'Not needed'}),
});
const ordinary={calendar:'gregorian',birthDate:vector.localDate,birthTime:vector.localTime,cityId:vector.id};
const malformed=await handleVedicD1Post(makeRequest({...ordinary,latitude:0}),resolver,
  birth=>calculateVedicD1GuestReading(birth,astronomy));
assert.equal(malformed.status,400);
assert.equal((await malformed.json()).code,'INVALID_REQUEST');
const noCalculator=await handleVedicD1Post(makeRequest(ordinary),resolver);
assert.equal(noCalculator.status,503);
assert.equal((await noCalculator.json()).code,'CALCULATION_NOT_READY');
const throwing=await handleVedicD1Post(makeRequest(ordinary),resolver,
  ()=>{throw Error('PRIVATE_DETAILS_MUST_NEVER_LEAK');});
assert.equal(throwing.status,503);
assert.equal(JSON.stringify(await throwing.json()).includes('PRIVATE_DETAILS'),false);
console.log('PASS Step07 actual Astronomy Engine guest pipeline: '+successful+
  ' certified source vectors, HTTP 200 free D1, 9 bodies, no premium/birth leak, no-store');
console.log('NOT RUN: Next production build, actual full Halleus city/Jalali route, mobile/browser rendering');
