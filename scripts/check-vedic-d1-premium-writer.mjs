/** Step 12: private D1 manuscript evidence, boundaries and guest isolation. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assembleVedicD1Chart } from '../lib/vedic/vedic-d1-assembly.ts';
import { buildVedicD1FreeReading } from '../lib/vedic/vedic-d1-free-reading.ts';
import { buildVedicD1PrivateManuscriptDraft } from '../lib/vedic/vedic-d1-premium-writer.ts';
import { VEDIC_D1_PREMIUM_CHAPTERS } from '../lib/vedic/vedic-d1-reading-contract.ts';
import { VEDIC_D1_PRIVATE_MANUSCRIPT_VERSION } from '../lib/vedic/vedic-d1-premium-contract.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const fixture = JSON.parse(read('fixtures/vedic-d1-reference-v1.json'));
assert.equal(fixture.vectors.length, 14);

function makeChart(vector, override = {}, error = 3) {
  const birth = {
    contractVersion: 'vedic-d1/v1',
    birthDateGregorian: vector.localDate, birthTime: vector.localTime,
    sourceCalendar: 'gregorian',
    city: { id: vector.id, name: vector.id, latitude: vector.latitude,
      longitude: vector.longitude, timezone: vector.timezone },
    utcIso: vector.utcIso, occurrence: null,
  };
  return assembleVedicD1Chart(birth, {
    utcIso: vector.utcIso, calculationVersion: 'synthetic-Swiss-reference-2.10.03',
    ephemerisSource: 'locked-synthetic-Swiss-reference',
    coordinateFrame: 'lahiri-sidereal-ecliptic-of-date',
    ayanamshaMode: 'SE_SIDM_LAHIRI', nodeModel: 'mean',
    ayanamshaDegrees: vector.ayanamshaDegrees,
    ascendantLongitude: override.ascendant ?? vector.ascendant.longitude,
    maxErrorArcMinutes: error,
    positions: Object.fromEntries(['sun','moon','mars','mercury','jupiter','venus',
      'saturn','rahu'].map(id => [id, override[id] ?? vector.placements[id].longitude])),
  });
}

const drafts = [];
for (const vector of fixture.vectors) {
  const chart = makeChart(vector);
  const draft = buildVedicD1PrivateManuscriptDraft(chart);
  assert.equal(draft.kind, 'private-d1-draft');
  assert.equal(draft.version, VEDIC_D1_PRIVATE_MANUSCRIPT_VERSION);
  assert.equal(draft.calculationVersion, chart.calculationVersion);
  assert.equal(draft.chapters.length, 4);
  draft.chapters.forEach((chapter, i) => {
    assert.equal(chapter.id, VEDIC_D1_PREMIUM_CHAPTERS[i].id);
    assert.equal(chapter.title, VEDIC_D1_PREMIUM_CHAPTERS[i].title);
    assert.ok(chapter.paragraphsFa.length >= 3);
    assert.ok(chapter.paragraphsFa.every(p => p.trim().length >= 70));
    assert.ok(chapter.evidence.length >= 2);
    assert.equal(new Set(chapter.evidence.map(x => x.id)).size, chapter.evidence.length);
    for (const fact of chapter.evidence) {
      assert.ok(['certain', 'near-boundary'].includes(fact.status));
      assert.ok(fact.sourceField.length > 6 && fact.factFa.length > 20);
      if (fact.bodyId && fact.sourceField.endsWith('.houseNumber')) {
        const placement = chart.placements.find(p => p.id === fact.bodyId);
        assert.ok(placement);
        if (chart.uncertainty.placementHouse[fact.bodyId]) {
          assert.equal(fact.status, 'near-boundary');
        } else if (fact.status === 'certain') {
          assert.ok(fact.factFa.includes('خانهٔ ' + String(placement.houseNumber)));
        }
      }
    }
  });
  const serialized = JSON.stringify(draft);
  for (const secret of [vector.utcIso, vector.id, vector.localDate, '"ownerId"', '"paid":true']) {
    assert.equal(serialized.includes(secret), false, vector.id + ' private draft leaked metadata');
  }
  const free = JSON.stringify(buildVedicD1FreeReading(chart));
  for (const forbidden of ['private-d1-draft', 'paragraphsFa', 'writerRulesVersion',
    'lagna-ruler-placement', 'focus-primary', '"chapters"']) {
    assert.equal(free.includes(forbidden), false, vector.id + ' premium leak in free reading');
  }
  drafts.push(draft);
}

const first = drafts[0].chapters[0];
const second = drafts[1].chapters[0];
assert.ok(first.evidence.some(e => e.factFa.includes('مریخ') && e.factFa.includes('خانهٔ 2')),
  'Aries ascendant lord must be Mars in actual second house');
assert.ok(second.evidence.some(e => e.factFa.includes('زهره') && e.factFa.includes('خانهٔ 3')),
  'Libra ascendant lord must be Venus in actual third house');
assert.notEqual(drafts[0].chapters.map(c => c.paragraphsFa.join(' ')).join(''),
  drafts[1].chapters.map(c => c.paragraphsFa.join(' ')).join(''),
  'different charts must have different texts');

const boundaryChart = makeChart(fixture.vectors[0],
  { ascendant: 30.01, moon: 29.99, mars: 30.01 }, 3);
const uncertain = buildVedicD1PrivateManuscriptDraft(boundaryChart);
assert.equal(boundaryChart.uncertainty.ascendantSign, true);
assert.equal(boundaryChart.uncertainty.placementSign.moon, true);
assert.equal(uncertain.chapters[0].evidence[0].status, 'near-boundary');
assert.equal(uncertain.chapters[1].evidence[0].status, 'near-boundary');
assert.ok(uncertain.chapters[0].paragraphsFa[0].includes('مرز دو نشان'));
assert.ok(!uncertain.chapters[1].paragraphsFa[0].includes('ماه در ثور قرار دارد'));

// No private writer imports in any public/guest entry point.
for (const path of [
  'lib/vedic/vedic-d1-free-reading.ts',
  'lib/vedic/vedic-d1-server-reading.ts',
  'app/api/vedic/d1/route.ts',
  'components/vedic/VedicD1GuestForm.tsx',
  'components/vedic/VedicD1GuestResult.tsx',
]) {
  const source = read(path);
  assert.ok(!source.includes('vedic-d1-premium-writer') &&
    !source.includes('buildVedicD1PrivateManuscriptDraft') &&
    !source.includes('private-d1-draft'), path + ' imports private report');
}
const writer = read('lib/vedic/vedic-d1-premium-writer.ts');
assert.ok(writer.includes('buildVedicD1NorthView(chart)'));
assert.ok(!writer.includes('generateReportContract'));
console.log('PASS Vedic premium writer: 14 reference charts, 4 evidence-backed Persian chapters, ruler consistency, boundary caution, free/public isolation');
console.log('NOT RUN: authenticated ownership, private storage, payment or live report delivery');
if (process.argv.includes('--preview')) {
  console.log('SYNTHETIC D1 SAMPLE — NOT A USER REPORT');
  for (const ch of drafts[0].chapters) {
    console.log('\n## ' + ch.title + '\n' + ch.paragraphsFa.join('\n\n'));
    console.log('\nشواهد: ' + ch.evidence.map(e => e.factFa).join(' | '));
  }
}
