/** Focused source/SSR-contract guard; not a browser screenshot or production build. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const component=read('components/vedic/VedicD1NorthChart.tsx');
const css=read('components/vedic/vedic-d1-north.module.css');
const page=read('app/vedic/page.tsx');
const form=read('components/vedic/VedicD1GuestForm.tsx');
const result=read('components/vedic/VedicD1GuestResult.tsx');
const screen=read('components/vedic/VedicD1Screen.tsx');
const layout=read('lib/vedic/vedic-d1-north-layout.ts');
const free=read('lib/vedic/vedic-d1-free-reading.ts');
const source=ts.createSourceFile('VedicD1NorthChart.tsx',component,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
assert.equal(source.parseDiagnostics.length,0,'TSX parse error');
for (const phrase of [
  'VedicD1NorthView',
  'VedicD1NorthChart({ view }',
  'VEDIC_D1_NORTH_GRID_PATH',
  'view.houses.map(',
  'view.rows.map(',
  'view.boundaryRows.length > 0',
  'view.canDrawHouses ?',
  'aria-hidden="true"',
  'focusable="false"',
  'scope="col"',
  'scope="row"',
  'role="region"',
  'tabIndex={0}',
  'className={styles.svgScroll}',
  'className={styles.tableScroll}',
  'direction: ltr',
  'Math.trunc(value * 100)',
]) {
  if (phrase==='direction: ltr') assert.ok(css.includes(phrase),'SVG orientation CSS');
  else assert.ok(component.includes(phrase),'Missing renderer guard: '+phrase);
}
for(const unsafe of ['use client','localStorage','sessionStorage','fetch(','window.location','URLSearchParams','console.log',
  'generateReportContract','sampleChart','mockChart','synthetic-fixture','createPortal']) {
  assert.ok(!component.includes(unsafe),'Unapproved UI runtime behavior: '+unsafe);
}
assert.ok(screen.includes('if (showReport && result) return <VedicD1GuestResult onEdit={editBirth} storageEnabled={storageEnabled} checkoutEnabled={checkoutEnabled} />;'),'UI must use the verified result screen');
assert.ok(!form.includes('<VedicD1NorthChart'), 'Form must hand off to result state without rendering chart');
assert.ok(result.includes('<VedicD1NorthChart view={result.reading.view} />'), 'Result must render ONLY verified server-supplied free view');
for (const phrase of ['reportStyles.adaptiveHero', 'reportStyles.reader', 'reportStyles.ambientLogo', 'styles.reportFooter']) {
  assert.ok(result.includes(phrase), 'Missing report visual hierarchy: ' + phrase);
}
for (const phrase of ['styles.lagnaHighlight', 'VEDIC_D1_DISPLAY_SIGNS_FA[house.signIndex]', 'styles.planetSpot', 'styles.lagnaSpot', 'styles.figureHeading', 'styles.tableHeading']) {
  assert.ok(component.includes(phrase), 'Missing North Indian visual refinement: ' + phrase);
}
assert.ok(component.includes('d={VEDIC_D1_NORTH_GRID_PATH}'), 'The original North Indian diamond geometry must remain unchanged');
assert.ok(page.includes('robots: { index: false, follow: false }'), 'Guest results must remain noindex');
assert.ok(form.includes('isVedicD1FreeReading'), 'Guest must reject non-free/unexpected response');
assert.ok(component.includes('VEDIC_D1_DISPLAY_SIGNS_FA[row.signIndex]')&&component.includes('VEDIC_D1_DISPLAY_SIGNS_FA[moon.signIndex]'));
assert.ok(free.includes('VEDIC_D1_DISPLAY_SIGNS_FA[view.houses[0].signIndex]')&&free.includes('VEDIC_D1_DISPLAY_SIGNS_FA[moon.signIndex]'));
for (const name of ['اریس','تارس','جمنای','کنسر','لیو','ویرگو','لیبرا','اسکورپیو','سجیتریس','کپریکورن','آکواریوس','پایسیز']) assert.ok(layout.includes("'"+name+"'"));
for(const phrase of ['@media (max-width: 640px)','min-width: 440px','overflow-x: auto',
  'min-width: 520px','focus-visible','direction: ltr','grid-template-columns: repeat(2, minmax(0, 1fr))']) {
  assert.ok(css.includes(phrase),'Missing responsive requirement: '+phrase);
}
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,'CSS balanced braces');
assert.ok(css.includes('.svg { width: 100%; min-width: 0; }'), 'The complete North Indian chart must fit on mobile');
assert.ok(css.includes('.figure {') && css.includes('.summaryItem {'), 'Report visual panels must be present');
assert.ok(css.includes('.summaryItem:last-child { grid-column: 1 / -1; }'), 'Mobile third summary tile must span the row');
assert.ok(css.includes('.table { width: 100%; min-width: 520px;'), 'Table must remain horizontally scrollable');
console.log('PASS North Indian UI static guard: TSX syntax, complete table, unmirrored 12 houses, mobile full-chart fitting, table scroll and verified free-reading props');
console.log('NOT RUN: actual React DOM render, screenshot, screen-reader or Next.js production build');
