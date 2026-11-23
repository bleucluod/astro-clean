/** Vedic D1 mobile /chart parity and privacy checks. No live/browser claims. */
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(root,path),'utf8');
const form=read('components/vedic/VedicD1GuestForm.tsx');
const select=read('components/vedic/VedicChartSelect.tsx');
const session=read('components/vedic/VedicD1GuestSession.tsx');
const result=read('components/vedic/VedicD1GuestResult.tsx');
const page=read('app/chart/vedic/page.tsx');
const css=read('components/vedic/vedic-d1-guest.module.css');
const shared=read('app/chart/chart-shell.module.css');
const journey=read('components/chart-form-journey.module.css');
const mainForm=read('components/ChartForm.tsx');
const mobile=read('components/ChartMobileBirthPicker.tsx');
const publicRoute=read('app/api/vedic/d1/route.ts');
const previewRoute=read('app/api/vedic/d1/local-preview/route.ts');

for(const [path,content] of [
 ['components/vedic/VedicD1GuestForm.tsx',form],
 ['components/vedic/VedicChartSelect.tsx',select],
 ['components/vedic/VedicD1GuestSession.tsx',session],
 ['components/vedic/VedicD1GuestResult.tsx',result],
 ['app/chart/vedic/page.tsx',page],
]){
 const parsed=ts.createSourceFile(path,content,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.equal(parsed.parseDiagnostics.length,0,
   path+' TSX invalid: '+parsed.parseDiagnostics.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')).join('; '));
}
for(const marker of [
 'chart-reference-page', 'chart-reference-form', 'chart-form-fields',
 'chart-form-actions', 'chart-submit-button',
 'journeyStyles.journeyRoot', 'journeyStyles.journeyProgress',
 'journeyStyles.journeyStep', 'journeyStyles.stepSummary',
 'MobileDatePicker', 'DeferredTimePicker', 'VedicChartSelect',
 'birth-date-picker-grid', 'birth-time-picker-grid',
 'chart-select-segment', 'date-mode-switch', 'time-unknown-choice',
 'city-suggestion-chips has-suggestions', 'chart-city-field chart-city-card',
 'cityLoadRef.current = import("@/lib/locations/cities")',
 'filterHalleusCities', 'findHalleusCityByName',
 'event.preventDefault()', 'setCityId("")', 'chooseCity(match)',
 'API_PATH = "/api/vedic/d1"', 'isVedicD1FreeReading',
 'AbortController', 'cache: "no-store"',
 'credentials: "same-origin"', 'process.env.NODE_ENV === "development"',
 'setResult({ kind: "untimed"', 'setResult({ kind: "timed"',
 'if (unknownTime)', 'validGregorian', 'parseJalaliDateInput',
 'setNeedsOccurrence(true)', 'setOccurrence("earlier")',
 'setOccurrence("later")', 'router.push("/chart/vedic/result")',
 'useSyncExternalStore', 'aria-live="polite"',
]){
 assert.ok(form.includes(marker),'Missing required form behavior: '+marker);
}
assert.ok(!form.includes('className="chart-form-progress"'),
  'Never render duplicate legacy progress alongside mobile journey');
assert.ok(!form.includes('field-hint')&&!form.includes('مثال:'),
  'No decorative per-field helper boxes or examples');
assert.ok(!form.includes('type="search"'),'City field must share /chart input type');
assert.ok(!form.includes('window.location')&&!form.includes('location.search'),
  'Birth data must never enter the URL');
assert.ok(!form.includes('localStorage')&&!form.includes('sessionStorage'),
  'Guest data must stay ephemeral');
assert.ok(!form.includes('birthTime: "12:00"')&&!form.includes('UNKNOWN_BIRTH_TIME'),
  'No guessed time for untimed D1');
assert.ok(form.indexOf('if (unknownTime)') < form.indexOf('const response = await fetch(API_PATH'),
  'Unknown time must avoid a forged public calculation');
assert.ok(form.includes('...birthPayload, displayName: name.trim()'),
  'Only the localhost private preview receives the display name');
assert.ok(!form.includes('body: JSON.stringify({ ...birthPayload, displayName: name.trim() })') ||
  form.indexOf('process.env.NODE_ENV === "development"') < form.indexOf('...birthPayload, displayName: name.trim()'),
  'Name must not enter the public free API');
assert.ok(select.includes('chart-native-select')&&select.includes('chart-select-trigger')&&
  select.includes('chart-select-options')&&select.includes('role="listbox"'),
  'Desktop/custom and mobile/native selectors must share /chart markup');
assert.ok(select.includes('options.map(option => <option'),
  'Mobile native selector must contain all available options');
assert.ok(mobile.includes('export function MobileBirthDatePicker')&&
  mobile.includes('export function MobileBirthTimePicker'),
  'Reuse the real /chart mobile birth wheels');
assert.ok(mainForm.includes('IntersectionObserver')&&form.includes('IntersectionObserver'),
  'Time wheel needs lazy viewport entry, as in /chart');
assert.ok(shared.includes('.formPanel :global(.chart-select-trigger)')&&
  shared.includes('.formPanel :global(.chart-native-select)'),
  'Reuse latest /chart form styling without copying it');
assert.ok(journey.includes('.journeyRoot')&&journey.includes('.journeyProgress'),
  'Use latest /chart journey styles');
assert.ok(!page.includes('previewNotice')&&!page.includes('chartStyles.education'),
  'Remove verbose auxiliary content from input screen');
assert.ok(page.includes('robots: { index: false, follow: false }'));
assert.ok(session.includes('kind: "untimed"')&&session.includes('kind: "timed"')&&
  session.includes('unknownTime: boolean')&&session.includes('reading: null'),
  'Two distinct report states prevent an invented chart');
assert.ok(result.includes('result?.kind === "timed"')&&result.includes('result?.kind === "untimed"')&&
  result.includes('<VedicD1NorthChart view={result.reading.view} />'),
  'Known time keeps real chart; unknown time never renders a chart');
assert.ok(!publicRoute.includes('premium-writer')&&
  previewRoute.includes("process.env.NODE_ENV !== 'development'"),
  'Free/private production boundary must remain intact');
for(const path of ['components/vedic/VedicD1GuestForm.tsx','components/vedic/VedicD1GuestResult.tsx']){
 const source=read(path);
 for(const banned of ['console.log','console.error','generateReportContract']){
   assert.ok(!source.includes(banned),path+' must not log personal data or use Western report path');
 }
}
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,
  'Vedic CSS blocks remain balanced');
console.log('PASS Vedic guest UI: /chart inputs and lazy mobile wheels, one journey progress, city autocomplete, unknown-time safety and preview isolation');
console.log('NOT RUN: real browser interaction, full typecheck/build and visual screenshot review');
