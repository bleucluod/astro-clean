import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import * as astronomy from 'astronomy-engine';

const root = resolve(import.meta.dirname, '..');
function load(relativePath, dependencies = {}) {
  const source = readFileSync(resolve(root, relativePath), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  }}).outputText;
  const record = { exports: {} };
  vm.runInNewContext(`(function(module,exports,require){${compiled}\n})`, { Date })(
    record, record.exports, (name) => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  );
  return record.exports;
}

const product = load('components/shop/product-detail-data.ts');
const jalali = load('lib/date/jalali.ts');
const iranCities = load('lib/locations/iran-cities.ts');
const globalCities = load('lib/locations/global-cities.ts');
const cities = load('lib/locations/cities.ts', {
  '@/lib/locations/iran-cities': iranCities, '@/lib/locations/global-cities': globalCities,
});
const civilTime = load('lib/shop/shop-civil-time.ts');
const moment = load('lib/shop/shop-personalization.ts', {
  '@/lib/date/jalali': jalali, '@/lib/locations/cities': cities, './shop-civil-time': civilTime,
});
const cart = load('components/shop/shop-cart.ts', {
  './product-detail-data': product, '@/lib/shop/shop-personalization': moment,
  '@/lib/locations/cities': cities,
});
const moon = load('lib/shop/shop-moon-ephemeris.ts', { 'astronomy-engine': astronomy });

const details = { calendar: 'jalali', date: '۱۴۰۳/۰۶/۱۲', time: '', city: '', names: '', message: '' };
const check = (productId, overrides = {}) => moment.validateShopMoment(productId, { ...details, ...overrides });
assert.equal(check('p01').ok, true);
assert.equal(check('p01').gregorianIso, '2024-09-02');
assert.equal(check('p01').referenceUtc, '2024-09-02T08:30:00.000Z');
assert.equal(check('p01', { calendar: 'gregorian', date: '2021-07-01' }).referenceUtc,
  '2021-07-01T07:30:00.000Z');
assert.equal(check('p01', { date: '۱۳۹۹/۱۲/۳۰' }).ok, true);
assert.equal(check('p01', { date: '۱۴۰۰/۱۲/۳۰' }).ok, false);
assert.equal(check('p01', { date: '۱۴۰۳/۰۷/۳۱' }).ok, false);
assert.equal(check('p01', { date: '1403/00/02' }).ok, false);
assert.equal(check('p01', { date: '' }).ok, false);
assert.equal(check('p03', { date: '' }).ok, true);
assert.equal(check('p03', { date: 'نامعلوم' }).ok, false);
assert.equal(check('p01', { calendar: 'gregorian', date: '2024-02-29' }).ok, true);
assert.equal(check('p01', { calendar: 'gregorian', date: '2023-02-29' }).ok, false);
assert.equal(check('p01', { calendar: 'gregorian', date: '2024-04-31' }).ok, false);
assert.equal(check('p01', { calendar: 'gregorian', date: '2024-13-01' }).ok, false);
const tehran = cities.findHalleusCityByName('تهران');
assert.ok(tehran);
assert.equal(check('p02', { time: '23:59', city: cities.getHalleusCityDisplayName(tehran), cityId: tehran.id }).ok, true);
assert.equal(check('p02', { time: '24:00', city: 'تهران' }).ok, false);
assert.equal(check('p02', { time: '01:60', city: 'تهران' }).ok, false);
assert.equal(check('p02', { time: '12:00', city: '' }).ok, false);
assert.equal(check('p02', { time: '', city: 'تهران' }).ok, false);
assert.equal(check('p01', { time: '25:12' }).ok, false);
assert.equal(check('p02', { time: '12:00', city: 'تهران', cityId: 'de-berlin' }).ok, false);
const birthSky = check('p02', { calendar: 'gregorian', date: '2024-07-01',
  time: '12:30', city: 'برلین، آلمان', cityId: 'de-berlin' });
assert.equal(birthSky.ok, true);
assert.equal(birthSky.referenceUtc, '2024-07-01T10:30:00.000Z');
assert.deepEqual(JSON.parse(JSON.stringify(civilTime.resolveShopCivilTimeUtc('2024-07-01', '12:30', 'Europe/Berlin'))),
  { status: 'resolved', utcIso: '2024-07-01T10:30:00.000Z' });
assert.equal(civilTime.resolveShopCivilTimeUtc('2024-03-31', '02:30', 'Europe/Berlin').status, 'nonexistent');
assert.equal(civilTime.resolveShopCivilTimeUtc('2024-10-27', '02:30', 'Europe/Berlin').status, 'ambiguous');
assert.equal(civilTime.resolveShopCivilTimeUtc('2024-07-01', '12:00', 'Asia/Tehran').utcIso, '2024-07-01T08:30:00.000Z');
assert.equal(civilTime.resolveShopCivilTimeUtc('2021-07-01', '12:00', 'Asia/Tehran').utcIso, '2021-07-01T07:30:00.000Z');
assert.equal(civilTime.resolveShopCivilTimeUtc('2024-07-01', '12:00', 'INVALID/Zone').status, 'invalid-timezone');
assert.equal(check('p02', { calendar: 'gregorian', date: '2024-03-31', time: '02:30',
  city: 'برلین، آلمان', cityId: 'de-berlin' }).ok, false);
assert.equal(check('p02', { calendar: 'gregorian', date: '2024-10-27', time: '02:30',
  city: 'برلین، آلمان', cityId: 'de-berlin' }).ok, false);

const line = (p, date, calendar = 'jalali') => ({
  key: `item-${p}`, productId: p, size: '20x30', quantity: 1,
  details: { ...details, date, calendar },
});
assert.equal(cart.parseShopCart([line('p01', '1400/12/30')]).length, 0);
assert.equal(cart.parseShopCart([line('p01', '1399/12/30')]).length, 1);
assert.equal(cart.parseShopCart([line('p01', '2023-02-29', 'gregorian')]).length, 0);
assert.equal(cart.parseShopCart([line('p03', '')]).length, 0, 'P03 is postponed for the first launch');
const legacyBirthSky = { ...line('p02', '1403/06/12'), details: {
  ...details, time: '12:00', city: 'تهران',
} };
assert.equal(cart.parseShopCart([legacyBirthSky]).length, 0, 'P02 is postponed for the first launch');

const newMoon = astronomy.SearchMoonPhase(0, new Date('2024-04-01T00:00:00Z'), 30).date.toISOString();
const fullMoon = astronomy.SearchMoonPhase(180, new Date('2024-03-20T00:00:00Z'), 30).date.toISOString();
const nearNew = moon.calculateShopMoonAtUtc(newMoon);
const nearFull = moon.calculateShopMoonAtUtc(fullMoon);
assert.ok(nearNew.illuminatedFraction < 0.015);
assert.ok(nearFull.illuminatedFraction > 0.98);
assert.equal(nearNew.phase, 'new');
assert.equal(nearFull.phase, 'full');
assert.ok(moon.calculateShopMoonAtUtc('2024-04-12T12:00:00Z').phaseAngleDegrees > 0);
for (const invalid of ['2024-04-08', '2024-04-08T12:00:00', '2023-02-29T12:00:00Z', '2024-04-08T25:00:00Z']) {
  assert.throws(() => moon.calculateShopMoonAtUtc(invalid));
}

const productSource = readFileSync(resolve(root, 'components/shop/ProductDetail.tsx'), 'utf8');
assert.match(productSource, /validateShopMoment\(id, form\)/);
console.log('Shop lunar boundary: shared valid civil dates, cart rejection, exact UTC ephemeris and new/full phase fixtures passed.');
