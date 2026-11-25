/** Vedic D1 mobile /chart parity and privacy checks. No live/browser claims. */
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(root,path),'utf8');
const form=read('components/vedic/VedicD1GuestForm.tsx');
const full=read('components/vedic/VedicD1FullReport.tsx');
const offer=read('components/vedic/VedicD1PurchaseOffer.tsx');
const privateSave=read('components/vedic/VedicD1PrivateSave.tsx');
const select=read('components/vedic/VedicChartSelect.tsx');
const session=read('components/vedic/VedicD1GuestSession.tsx');
const result=read('components/vedic/VedicD1GuestResult.tsx');
const page=read('app/vedic/page.tsx');
const seo=read('lib/config/seo.ts');
const screen=read('components/vedic/VedicD1Screen.tsx');
const legacyPage=read('app/chart/vedic/page.tsx');
const legacyResult=read('app/chart/vedic/result/page.tsx');
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
 ['components/vedic/VedicD1FullReport.tsx',full],
 ['components/vedic/VedicD1PurchaseOffer.tsx',offer],
 ['components/vedic/VedicD1PrivateSave.tsx',privateSave],
 ['app/vedic/page.tsx',page],
 ['components/vedic/VedicD1Screen.tsx',screen],
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
 'credentials: "same-origin"',
 'setResult({ kind: "untimed"', 'setResult({ kind: "timed"',
 'if (unknownTime)', 'validGregorian', 'parseJalaliDateInput',
 'setNeedsOccurrence(true)', 'setOccurrence("earlier")',
 'setOccurrence("later")', 'onComplete();',
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
assert.ok(!form.includes('/api/vedic/d1/local-preview') && form.includes('storageEnabled?{displayName:name.trim()}')&&form.includes('getSupabaseBrowserAccessState'),
  'Named reports save privately through the free generation request; no full manuscript');
assert.ok(result.includes('process.env.NODE_ENV !== "development"') &&
  result.includes('onClick={openLocalPreview}') && result.includes('displayName: name.trim()'),
  'Only an explicit development inspection may request full text');
assert.ok(result.includes('premiumPreview') && result.includes('chapterLock') && result.includes('excerptFa'),
  'Guest result renders only server excerpts with a decorative lock');
assert.ok(result.includes('const fullPreview = process.env.NODE_ENV === "development"') &&
  result.includes('fullPreview ? (') &&
  result.includes('<VedicD1FullReport manuscript={fullPreview} />') &&
  result.includes('onClick={closeLocalPreview}') &&
  result.includes('localPreview: null'), 'Full reader must be explicit, gated, and reversible');
assert.ok(full.includes('manuscript.chapters.map') && full.includes('chapter.paragraphsFa.map') &&
  full.includes('reportStyles.chapterParagraphs') && full.includes('scrollIntoView') &&
  !full.includes('fetch(') && !full.includes('localStorage') &&
  !full.includes('premium-writer') && !full.includes('chapterLock'),
  'Full reader presents only the provided manuscript, never obtains entitlement or regenerates text');
assert.ok(css.includes('.fullContents') && css.includes('.fullChapter') && css.includes('.fullParagraphs'));
assert.ok(result.includes('onClick={goToPurchase}') && result.includes('getElementById("vedic-purchase-title")') &&
  result.includes('<VedicD1PurchaseOffer name={result.name} savedReportId={result.savedReportId} storageEnabled={storageEnabled} checkoutEnabled={checkoutEnabled} birth={{calendar:result.draft.calendar,'));
assert.ok(offer.includes('process.env.NODE_ENV === "development"') &&
  offer.includes('hidden={!reviewOpen}') && offer.includes('aria-expanded={reviewOpen}') &&
  offer.includes('development || storageEnabled') && offer.includes('disabled>خرید به‌زودی فعال می‌شود'));
for (const banned of ['fetch(', 'localStorage', 'sessionStorage', 'router.push(', 'premium-writer', 'local-preview']) {
  assert.ok(!offer.includes(banned), 'Offer may not initiate payment or data operations: '+banned);
}
assert.ok(offer.includes('<VedicD1PrivateSave name={name} birth={birth} savedReportId={savedReportId} checkoutEnabled={checkoutEnabled} />') &&
  privateSave.includes('consent:true') && privateSave.includes('reconcileReports={false}') &&
  privateSave.includes('/api/vedic/d1/account') && !privateSave.includes('localStorage') &&
  !privateSave.includes('sessionStorage') && !privateSave.includes('router.push('),
  'Purchase reopens the saved report with an authenticated owner and idempotent fallback');
assert.ok(css.includes('.purchaseOffer') && css.includes('.purchasePrimary:disabled'));
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
assert.ok(!screen.includes('previewNotice')&&!screen.includes('chartStyles.education'),
  'Remove verbose auxiliary content from input screen');
for (const redundant of ['styles.breadcrumb', 'chartStyles.heroKicker',
  'chartStyles.heroLead', 'chartStyles.formPanelHeading', 'chartStyles.panelStep']) {
  assert.ok(!screen.includes(redundant), 'Vedic entry must not repeat page intro: ' + redundant);
}
assert.ok(screen.includes('<h1 className={chartStyles.heroTitle}>چارت تولد ودیک</h1>'),
  'Preserve one clear visible page title');
assert.ok(!form.includes('journeyStyles.progressHeading') &&
  !form.includes('آسمان تو در حال شکل‌گرفتنه'),
  'Mobile stepper must not carry a second verbal introduction');
assert.ok(page.includes('buildPublicPageMetadata({') && page.includes('canonical: "/vedic"') &&
  seo.includes('robots: { index: true, follow: true }') &&
  seo.includes('{ path: "/vedic", priority: 0.9, changeFrequency: "weekly" }'),
  'Only the public Vedic entry is indexable and self-canonical');
const formStart = screen.indexOf('<VedicD1GuestForm ');
const editorialStart = screen.indexOf('<section className={chartStyles.heroEditorial}');
const formSectionEnd = screen.indexOf('</section>', formStart);
assert.ok(formStart >= 0 && formSectionEnd > formStart && editorialStart > formSectionEnd &&
  screen.indexOf('<h2>', editorialStart) > editorialStart && !screen.slice(0, formSectionEnd).includes('<h2>'),
  'SEO editorial starts after the complete input and account controls');
assert.ok(page.includes('<VedicD1GuestSessionProvider><VedicD1Screen storageEnabled={isVedicD1StorageReady()} checkoutEnabled={isVedicD1CheckoutReady()} /></VedicD1GuestSessionProvider>'));
assert.ok(screen.includes('if (showReport && result) return <VedicD1GuestResult onEdit={editBirth} storageEnabled={storageEnabled} checkoutEnabled={checkoutEnabled} />;'));
assert.ok(screen.includes('<VedicD1GuestForm onComplete={openReport} storageEnabled={storageEnabled} />'));
assert.ok(legacyPage.includes('redirect("/vedic")')&&legacyResult.includes('redirect("/vedic")'));
assert.ok(!form.includes('router.push(')&&!result.includes('/chart/vedic'));
assert.ok(!screen.includes('localStorage')&&!screen.includes('sessionStorage')&&!screen.includes('router.push('));
assert.ok(result.includes('report-detail-reader-page report-product-page')&&result.includes('reportStyles.reader')&&result.includes('reportStyles.ambientLogo'));
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
