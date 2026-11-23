/** Vedic guest form: source, TSX syntax, a11y, free-response and parity with /chart styles. */
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const form = read('components/vedic/VedicD1GuestForm.tsx');
const page = read('app/chart/vedic/page.tsx');
const css = read('components/vedic/vedic-d1-guest.module.css');
const chartCss = read('app/chart/chart-shell.module.css');
const journeyCss = read('components/chart-form-journey.module.css');

for (const [path, value] of [
  ['VedicD1GuestForm.tsx', form],
  ['app/chart/vedic/page.tsx', page],
]) {
  const syntax = ts.createSourceFile(path, value, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.equal(syntax.parseDiagnostics.length, 0,
    path + ': TSX syntax invalid: ' + syntax.parseDiagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, ' ')).join('; '));
}

const required = [
  '"use client"', 'id="vedic-name"', 'disabled={!hydrated}', 'disabled={!hydrated || submitting}',
  'autoComplete="name"', 'maxLength={60}',
  'id="vedic-birth-date"', 'id="vedic-birth-time"', 'id="vedic-city-search"',
  'required maxLength', 'inputMode="numeric"', 'type="search"', 'aria-describedby',
  'role="status"', 'aria-live="polite"', 'aria-atomic="true"',
  'import("@/lib/locations/cities")', 'filterHalleusCities', 'getHalleusCityDisplayName',
  'setCityDirectory(directory)', 'CITY_LIMIT = 7', 'useMemo(() =>',
  'onFocus={() => { setCityOpen(true); void loadCityDirectory(); }}',
  'onChange={(event: ChangeEvent<HTMLInputElement>) => updateCity(event.target.value)}',
  'onKeyDown={selectCityOnEnter}', 'city-suggestion-chips', 'city-suggestion-chip',
  'onClick={() => chooseCity(city)}',
  'chart-reference-page', 'fieldsLock', 'chart-reference-form', 'chart-form-progress',
  'chart-form-fields', 'chart-submit-button', 'journeyStyles.journeyStep',
  'journeyStyles.journeyProgress', 'journeyStyles.stepSummary',
  'type="submit" form="vedic-guest-form"', 'onSubmit={submit}',
  'setName(event.target.value)', 'editingStep',
  'cityId', 'method: "POST"', 'cache: "no-store"', 'credentials: "same-origin"',
  'JSON.stringify({', 'API_PATH = "/api/vedic/d1"',
  'TIME_AMBIGUOUS', 'setNeedsOccurrence(true)', 'setOccurrence("earlier")',
  'setOccurrence("later")', 'kind: "unavailable"', 'AbortController',
  'isVedicD1FreeReading', 'setReading(data.reading)', '<VedicD1NorthChart view={reading.view} />',
];
for (const phrase of required) assert.ok(form.includes(phrase), 'Missing Vedic form marker: ' + phrase);

for (const unsafe of [
  'localStorage', 'sessionStorage', 'window.location', 'location.search', 'URLSearchParams',
  'console.log', 'console.error', 'birthLatitude', 'birthLongitude', 'birthTimezone',
  'new Date().toISOString()', 'birthTime: "12:00"',
  'data.chart', 'setChart', 'onSuccess', 'generateReportContract',
]) assert.ok(!form.includes(unsafe), 'Unwanted sensitive or unrelated form behavior: ' + unsafe);

const enterStart = form.indexOf('function selectCityOnEnter(');
const enterEnd = form.indexOf('async function submit(', enterStart);
assert.ok(enterStart > 0 && enterEnd > enterStart, 'City keyboard handler missing');
const enterHandler = form.slice(enterStart, enterEnd);
assert.ok(enterHandler.includes('event.preventDefault()'), 'Enter must not submit the form');
assert.ok(enterHandler.includes('chooseCity(next)'), 'Enter must select a matching city');
assert.ok(enterHandler.includes('if (!directoryRef.current) void loadCityDirectory()'),
  'Unavailable city directory should be retried');

const payloadStart = form.indexOf('body: JSON.stringify({');
assert.ok(payloadStart > 0, 'Explicit free-only POST body missing');
const payload = form.slice(payloadStart, form.indexOf('      });', payloadStart));
assert.ok(payload.includes('calendar, birthDate: birthDate.trim(), birthTime: birthTime.trim(), cityId'),
  'Birth input fields must stay canonical');
assert.ok(!/\bname\b/.test(payload) && !/\bdisplayName\b/.test(payload),
  'Guest display name must never enter the API');
assert.ok(!/latitude|longitude|timezone/i.test(payload), 'Coordinates/timezone must not enter API');

assert.ok(form.includes('const [birthTime, setBirthTime] = useState("");'));
assert.match(form, /if \(!cityId\)/);
assert.match(form, /if \(response\.status === 400 && data\.code === "INPUT_INVALID"\)/);
assert.match(form, /response\.status === 200 && data\.ok === true/);
assert.match(form, /r\.kind === "free-d1"/);
assert.match(form, /r\.premiumStatus === "not-available"/);
assert.match(form, /setReading\(null\)/);
assert.match(form, /reading\.shortReading\.textFa/);
assert.match(form, /activeRequestRef\.current\?\.abort\(\)/);
assert.match(form, /setCityId\(""\)/);
assert.match(form, /cityLoadRef\.current = import\("@\/lib\/locations\/cities"\)/);

for (const phrase of [
  'import chartStyles from "../chart-shell.module.css"',
  'chartStyles.page', 'chartStyles.hero', 'chartStyles.formPanel',
  'chartStyles.formPanelHeading', 'chartStyles.workspace',
  'chartStyles.education', '<VedicD1GuestForm />', 'href="/chart"',
  'robots: { index: false, follow: false }',
]) assert.ok(page.includes(phrase), 'Page is not sharing /chart shell: ' + phrase);
assert.ok(!page.includes('generateReportContract'), 'No Western report builder in the guest page');
assert.match(page, /برای انتشار عمومی تأیید نشده/);

for (const phrase of [
  '.formPanel :global(.chart-field input)', '.formPanel :global(.city-suggestion-chip)',
  '.formPanel :global(.chart-submit-button)', '.formPanel :global(.chart-form-fields)',
]) assert.ok(chartCss.includes(phrase), 'Missing actual /chart styling dependency: ' + phrase);
for (const phrase of ['.journeyRoot', '.journeyStep', '.stepSummary', '.journeyProgress']) {
  assert.ok(journeyCss.includes(phrase), 'Missing actual /chart journey styling: ' + phrase);
}
for (const phrase of [
  '@media (max-width: 640px)', 'grid-template-columns: minmax(0, 1fr)',
  'min-width: 0', 'min-height: 44px', 'prefers-reduced-motion',
  '.vedicHero', '.vedicWorkspace', '.freeResult', '.error', '.success',
]) assert.ok(css.includes(phrase), 'Missing responsive /chart parity style: ' + phrase);
assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length,
  'Vedic CSS braces should be balanced');

console.log('PASS Vedic form source: shared /chart shell + four-step journey, local-only name, city suggestions and Enter guard, no-store free POST, noindex and responsive CSS');
console.log('NOT RUN: real browser hydration, full Next build (wiki DB preflight), screenshot/mobile interaction');
