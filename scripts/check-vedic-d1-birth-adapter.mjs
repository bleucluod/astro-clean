/**
 * Isolated port tests using representative canonical city IDs and a Jalali
 * seam. This is NOT evidence of real full-city-directory and parser integration.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtureUrl = (name) => new URL(`./fixtures/${name}`, import.meta.url).href;
registerHooks({resolve(specifier, context, nextResolve) {
  if (specifier === '../date/jalali') return {url:fixtureUrl('vedic-d1-jalali-seam.mjs'),shortCircuit:true};
  if (specifier === '../locations/cities') return {url:fixtureUrl('vedic-d1-city-seam.mjs'),shortCircuit:true};
  if (specifier === './vedic-d1-contract.js') return nextResolve('./vedic-d1-contract.ts',context);
  return nextResolve(specifier,context);
}});
const { parseHalleusVedicD1Birth } = await import('../lib/vedic/vedic-d1-birth-adapter.ts');
const request = (changes={}) => ({
  calendar:'gregorian', birthDate:'1996-08-12', birthTime:'11:30', cityId:'af-kabul',...changes,
});
const kabul = parseHalleusVedicD1Birth(request());
assert.equal(kabul.ok,true);
assert.deepEqual(kabul.value.city,{id:'af-kabul',name:'کابل، افغانستان',latitude:34.5553,longitude:69.2075,timezone:'Asia/Kabul'});
assert.equal(kabul.value.utcIso,'1996-08-12T07:00:00.000Z');
const newYork = parseHalleusVedicD1Birth(request({birthDate:'2005-11-01',birthTime:'00:03',cityId:'us-new-york'}));
assert.equal(newYork.ok,true);
assert.equal(newYork.value.utcIso,'2005-11-01T05:03:00.000Z');
const tehran = parseHalleusVedicD1Birth(request({birthDate:'۱۳۷۱/۰۵/۲۱', calendar:'jalali',birthTime:'۰۰:۰۵',cityId:'iran-tehran-test'}));
assert.equal(tehran.ok,true);
assert.equal(tehran.value.utcIso,'1992-08-11T19:35:00.000Z');
assert.equal(tehran.value.city.name,'تهران');
assert.equal(tehran.value.sourceCalendar,'jalali');
for(const extra of [
  {latitude:90,longitude:0,timezone:'Asia/Tokyo',birthTimezone:'Pacific/Auckland'},
  {latitude:NaN,longitude:Infinity,timezone:'Invalid/Time'},
  {city:{latitude:0,longitude:0,timezone:'UTC'}},
]) {
  const out=parseHalleusVedicD1Birth(request(extra));
  assert.equal(out.ok,true);
  assert.deepEqual(out.value.city,kabul.value.city);
  assert.equal(out.value.utcIso,kabul.value.utcIso);
}
const errors=[
  [request({cityId:'unknown'}),'CITY_UNKNOWN'],
  [request({cityId:'Kabul'}),'CITY_UNKNOWN'], // canonical cityId, never free text
  [request({cityId:''}),'CITY_REQUIRED'],
  [request({birthDate:'2024-03-10',birthTime:'02:30',cityId:'us-new-york'}),'TIME_NONEXISTENT'],
  [request({birthDate:'2024-11-03',birthTime:'01:30',cityId:'us-new-york'}),'TIME_AMBIGUOUS'],
  [request({calendar:'jalali',birthDate:'1371/13/01',cityId:'iran-tehran-test'}),'DATE_INVALID'],
  [request({birthTime:''}),'TIME_REQUIRED'],
  [request({birthDate:'2022-02-30'}),'DATE_INVALID'],
  [request({occurrence:'third'}),'TIME_AMBIGUOUS'],
  [null,'INPUT_REQUIRED'],
];
for(const [input,code] of errors) {
  const out=parseHalleusVedicD1Birth(input);
  assert.equal(out.ok,false);
  assert.equal(out.issue.code,code,code);
}
const earlier=parseHalleusVedicD1Birth(request({birthDate:'2024-11-03',birthTime:'01:30',cityId:'us-new-york',occurrence:'earlier'}));
const later=parseHalleusVedicD1Birth(request({birthDate:'2024-11-03',birthTime:'01:30',cityId:'us-new-york',occurrence:'later'}));
assert.equal(earlier.ok,true);
assert.equal(later.ok,true);
assert.equal(Date.parse(later.value.utcIso)-Date.parse(earlier.value.utcIso),3600000);
const adapterSource=readFileSync(resolve(root,'lib/vedic/vedic-d1-birth-adapter.ts'),'utf8');
assert.match(adapterSource,/findHalleusCityById/);
assert.match(adapterSource,/parseJalaliDateInput/);
assert.match(adapterSource,/getHalleusCityDisplayName/);
assert.doesNotMatch(adapterSource,/fallback.*(tehran|demo|noon)/i);
console.log('PASS Vedic birth adapter seam: 3 city types, 3 UTC examples, strict city ID, tampering prevention, DST and negative cases');
console.log('NOT RUN: real lib/date/jalali.ts and full lib/locations/cities.ts app modules; test uses contract-compatible shims');
