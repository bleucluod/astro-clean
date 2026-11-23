/**
 * Full-app-only acceptance gate: execute the real Halleus date converter and
 * complete city directory, not the private-overlay mock seam.
 * Exit 2 when the application source modules are not checked out.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const needed = [
  'lib/date/jalali.ts',
  'lib/locations/cities.ts',
  'lib/locations/iran-cities.ts',
  'lib/locations/global-cities.ts',
];
const absent = needed.filter(path => !existsSync(resolve(root,path)));
if (absent.length) {
  console.error(`BLOCKED_BY_DEPENDENCY: full Halleus source checkout required (${absent.join(', ')})`);
  process.exit(2);
}
const aliases = new Map([
  ['../date/jalali','lib/date/jalali.ts'],
  ['../locations/cities','lib/locations/cities.ts'],
  ['@/lib/locations/global-cities','lib/locations/global-cities.ts'],
  ['@/lib/locations/iran-cities','lib/locations/iran-cities.ts'],
  ['./vedic-d1-contract.js','lib/vedic/vedic-d1-contract.ts'],
]);
registerHooks({resolve(specifier,context,nextResolve) {
  const target=aliases.get(specifier);
  if (target) return { url:pathToFileURL(resolve(root,target)).href, shortCircuit:true };
  return nextResolve(specifier,context);
}});
const { parseHalleusVedicD1Birth } = await import('../lib/vedic/vedic-d1-birth-adapter.ts');
const { parseJalaliDateInput } = await import('../lib/date/jalali.ts');
const { findHalleusCityById, findHalleusCityByName } = await import('../lib/locations/cities.ts');
const expectedJalali = parseJalaliDateInput('۱۳۷۱/۰۵/۲۱');
assert.equal(expectedJalali.ok,true);
assert.equal(expectedJalali.gregorianIso,'1992-08-12');
const tehran = findHalleusCityByName('تهران');
assert.ok(tehran && tehran.countryCode==='IR' && tehran.timezone==='Asia/Tehran');
assert.equal(findHalleusCityById(tehran.id)?.id,tehran.id);
const request = {birthDate:'۱۳۷۱/۰۵/۲۱',calendar:'jalali',birthTime:'۰۰:۰۵',cityId:tehran.id,latitude:0,longitude:0,timezone:'UTC'};
const converted=parseHalleusVedicD1Birth(request);
assert.equal(converted.ok,true);
assert.equal(converted.value.birthDateGregorian,'1992-08-12');
assert.equal(converted.value.utcIso,'1992-08-11T19:35:00.000Z');
assert.equal(converted.value.city.id,tehran.id);
assert.equal(converted.value.city.latitude,tehran.latitude);
assert.equal(converted.value.city.longitude,tehran.longitude);
assert.equal(converted.value.city.timezone,tehran.timezone);
const kabul = parseHalleusVedicD1Birth({birthDate:'1996-08-12',calendar:'gregorian',birthTime:'11:30',cityId:'af-kabul'});
assert.equal(kabul.ok,true);
assert.equal(kabul.value.utcIso,'1996-08-12T07:00:00.000Z');
const london = parseHalleusVedicD1Birth({birthDate:'1952-07-14',calendar:'gregorian',birthTime:'06:05',cityId:'gb-london'});
assert.equal(london.ok,true);
assert.equal(london.value.utcIso,'1952-07-14T05:05:00.000Z');
const unknown = parseHalleusVedicD1Birth({...request,cityId:'invalid-city'});
assert.equal(unknown.ok,false);
assert.equal(unknown.issue.code,'CITY_UNKNOWN');
const invalidDate = parseHalleusVedicD1Birth({...request,birthDate:'۱۳۷۱/۱۳/۰۱'});
assert.equal(invalidDate.ok,false);
assert.equal(invalidDate.issue.code,'DATE_INVALID');
console.log('PASS actual Halleus Jalali/city D1 adapter: Tehran, Kabul and London UTC, server-owned coordinates, invalid inputs');
