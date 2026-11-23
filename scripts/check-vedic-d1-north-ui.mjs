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
const page=read('app/chart/vedic/page.tsx');
const form=read('components/vedic/VedicD1GuestForm.tsx');
const result=read('components/vedic/VedicD1GuestResult.tsx');
const resultPage=read('app/chart/vedic/result/page.tsx');
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
assert.ok(!page.includes('VedicD1NorthChart'),'UI must remain unreachable pending certification');
assert.ok(!form.includes('<VedicD1NorthChart'), 'Form should navigate to the separate report');
assert.ok(result.includes('<VedicD1NorthChart view={result.reading.view} />'), 'Result must render ONLY verified server-supplied free view');
for (const phrase of ['styles.reportWelcome', 'styles.reportKicker', 'styles.reportFooter', 'styles.resultHero']) {
  assert.ok(result.includes(phrase), 'Missing report visual hierarchy: ' + phrase);
}
for (const phrase of ['styles.lagnaHighlight', 'house.signNameFa', 'styles.planetSpot', 'styles.lagnaSpot', 'styles.figureHeading', 'styles.tableHeading']) {
  assert.ok(component.includes(phrase), 'Missing North Indian visual refinement: ' + phrase);
}
assert.ok(component.includes('d={VEDIC_D1_NORTH_GRID_PATH}'), 'The original North Indian diamond geometry must remain unchanged');
assert.ok(resultPage.includes('robots: { index: false, follow: false }'), 'Guest results must remain noindex');
assert.ok(form.includes('isVedicD1FreeReading'), 'Guest must reject non-free/unexpected response');
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
