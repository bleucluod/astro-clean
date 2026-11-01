import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Data-URL imports run real TS runtime implementations without writing temp files.
async function loadTs(file) {
  const compiled = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
    fileName: file, reportDiagnostics: true,
  });
  const errors = compiled.diagnostics?.filter((d) => d.category === ts.DiagnosticCategory.Error) ?? [];
  assert.equal(errors.length, 0, `TypeScript transpile failed: ${file}`);
  return import('data:text/javascript;base64,' + Buffer.from(compiled.outputText).toString('base64'));
}

const canonical = await loadTs('lib/wiki/wiki-canonical-redirects.ts');
const engine = await loadTs('lib/wiki/wiki-link-admin-engine.ts');
const markdown = await loadTs('lib/wiki/wiki-markdown.ts');
assert.deepEqual(canonical.WIKI_CANONICAL_REDIRECTS.map((x) => x.sourceSlug).sort(), [
  'bts-members-birth-chart', 'pluto-in-twelve-houses',
]);
for (const item of canonical.WIKI_CANONICAL_REDIRECTS) {
  assert.equal(canonical.isHistoricalWikiRedirectSource(item.sourceSlug), true);
  assert.equal(canonical.isHistoricalWikiRedirectSource(item.destinationSlug), false);
}

const manifest = JSON.parse(readFileSync('content/r3-batch07/manifest.json', 'utf8'));
assert.equal(manifest.records.length, 74);
const bts = JSON.parse(readFileSync('content/r3-batch07/wiki/W287.json', 'utf8'));
assert.equal(bts.slug, 'bts-members-birth-dates-zodiac');
const body = bts.content.body_markdown;
const ids = markdown.findWikiInternalArticleIds(body);
for (const target of ['jungkook-birth-chart', 'persian-birth-months-astrology-guide', 'why-sun-sign-is-not-enough']) {
  assert(ids.includes(target), `BTS dependency ignored: ${target}`);
}
const detected = engine.collectBodyLinks({ stableId: bts.slug, bodyMarkdown: body });
for (const target of ['jungkook-birth-chart', 'persian-birth-months-astrology-guide', 'why-sun-sign-is-not-enough']) {
  assert(detected.some((link) => link.kind === 'article' && link.targetStableId === target),
    `BTS published inline link missing from admin scan: ${target}`);
}
const additional = engine.collectBodyLinks({ stableId: 'fixture', bodyMarkdown: [
  '[[article:birth-chart-basics|چارت تولد]]',
  '[[page:/wiki/what-is-moon-sign|نشانه ماه]]',
  '[[page:/chart|چارت شخصی]]',
].join('\n\n') });
assert.equal(additional.filter((link) => link.kind === 'article').length, 2);
assert.equal(additional.filter((link) => link.kind === 'core').length, 1);
assert.deepEqual(markdown.findWikiInternalArticleIds('[[article:a|A]] [[page:/wiki/b|B]]'), ['a', 'b']);

const batch = execFileSync(process.execPath, ['scripts/apply-r3-batch07.mjs', '--self-check'], { encoding: 'utf8' });
assert.match(batch, /PASS \| NO_DB_NO_GIT_WRITES/);
const delta = execFileSync(process.execPath, ['scripts/apply-r3-final-closeout.mjs', '--self-check'], { encoding: 'utf8' });
assert.match(delta, /PASS \| R3_CLOSEOUT_NO_DB_NO_GIT_WRITES/);
for (const path of ['lib/wiki/wiki-repository.ts', 'lib/wiki/wiki-link-admin-service.ts',
  'lib/wiki/wiki-indexability-observability.ts']) {
  assert(readFileSync(path, 'utf8').includes('isHistoricalWikiRedirectSource'), path + ' does not exclude legacy redirects');
}
console.log('PASS | R3_FINAL_CLOSEOUT_OFFLINE canonical_redirects=2 articles=74 bts_page_links=3 editorial_deletions=3');
