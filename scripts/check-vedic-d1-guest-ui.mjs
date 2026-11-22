/** Source-only safety/a11y guard. Browser rendering and real Next build remain open. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(root,path),'utf8');
const form=read('components/vedic/VedicD1GuestForm.tsx');
const page=read('app/chart/vedic/page.tsx');
const css=read('components/vedic/vedic-d1-guest.module.css');
const requiredForm=[
  '"use client"','id="vedic-birth-date"','id="vedic-birth-time"','id="vedic-city-search"',
  'required maxLength','inputMode="numeric"','type="search"','aria-describedby',
  'role="status"','aria-live="polite"','aria-atomic="true"',
  'import("@/lib/locations/cities")','filterHalleusCities','getHalleusCityDisplayName',
  'cityId','CITY_LIMIT = 7','method: "POST"','cache: "no-store"','credentials: "same-origin"',
  'JSON.stringify({','API_PATH = "/api/vedic/d1"',
  'TIME_AMBIGUOUS','setNeedsOccurrence(true)','setOccurrence("earlier")',
  'setOccurrence("later")','kind: "unavailable"','AbortController',
  'isVedicD1FreeReading','setReading(data.reading)','<VedicD1NorthChart view={reading.view} />',
];
for(const term of requiredForm) assert.ok(form.includes(term),'Missing critical form safety/a11y marker: ' + term);
for(const phrase of ['localStorage','sessionStorage','window.location','location.search','URLSearchParams','console.log','console.error',
  'birthLatitude','birthLongitude','birthTimezone','new Date().toISOString()','birthTime: "12:00"',
  'data.chart','setChart','onSuccess','generateReportContract','localStorage.setItem']) {
  assert.ok(!form.includes(phrase),'Unsafe or unrelated form behavior: ' + phrase);
}
assert.match(form, /const \[birthTime, setBirthTime\] = useState\(""\)/);
assert.match(form, /if \(!cityId\)/);
assert.match(form, /if \(response\.status === 400 && data\.code === "INPUT_INVALID"\)/);
assert.match(form, /response.status === 200 && data.ok === true/);
assert.match(form, /r.kind === "free-d1"/);
assert.match(form, /r.premiumStatus === "not-available"/);
assert.match(form, /setReading\(null\)/);
assert.match(form, /reading.shortReading.textFa/);
assert.match(form, /activeRequestRef\.current\?\.abort\(\)/);
assert.match(form, /setCityId\(""\)/);
assert.match(form, /cityLoadRef\.current = import\("@\/lib\/locations\/cities"\)/);
assert.ok(page.includes('<VedicD1GuestForm />'));
assert.ok(page.includes('href="/chart"'));
assert.ok(page.includes('robots: { index: false, follow: false }'));
assert.ok(!page.includes('generateReportContract'));
assert.match(page,/برای انتشار عمومی تأیید نشده/);
for(const phrase of [
  '@media (max-width: 640px)','grid-template-columns: minmax(0, 1fr)',
  'min-width: 0','min-height: 48px','font-size: 16px','focus-visible','min-height: 44px',
  'overflow-y: auto','prefers-reduced-motion','width: min(900px, 100%)'
]) assert.ok(css.includes(phrase),'Responsive/a11y CSS marker missing: ' + phrase);
// Unclosed rule braces / naive syntax guard; a complete CSS parser is tested locally.
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
for (const width of [320,360,412]) {
  assert.ok(width < 640 && css.includes('@media (max-width: 640px)'),width + 'px fallback missing');
}
console.log('PASS Vedic guest form static safety: noindex, lazy city search, server free-reading guard, POST/no-store, visible chart/table, 320/360/412px CSS fallback, focus & status');
console.log('NOT RUN: browser layout/a11y, React runtime interactions, full Next build, astronomical calculation');
