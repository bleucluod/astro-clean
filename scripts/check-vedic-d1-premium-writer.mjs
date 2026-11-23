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
    assert.ok(chapter.paragraphsFa.length >= 4, vector.id + ': thin chapter ' + chapter.id);
    assert.ok(chapter.paragraphsFa.every(p => p.trim().length >= 70));
    assert.ok(chapter.evidence.length >= 2);
    if (i === 1) assert.ok(chapter.evidence.some(e => e.bodyId === 'sun'), 'Moon chapter must cite Sun');
    if (i === 3) assert.ok(chapter.evidence.some(e => e.id === 'focus-primary'), 'Synthesis must cite a real house');
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
    'lagna-ruler-placement', 'focus-primary', 'sun-moon-context',
    'focus-house-companion', '"chapters"']) {
    assert.equal(free.includes(forbidden), false, vector.id + ' premium leak in free reading');
  }
  drafts.push(draft);
}

// Exhaustive traditional ruler-to-actual-house mapping across all 12 ascendants.
const rulers = ['mars','venus','mercury','moon','sun','mercury',
  'venus','mars','jupiter','saturn','saturn','jupiter'];
for (let sign = 0; sign < 12; sign++) {
  const chart = makeChart(fixture.vectors[0], { ascendant: sign * 30 + 15 }, 0);
  const chapter = buildVedicD1PrivateManuscriptDraft(chart).chapters[0];
  const fact = chapter.evidence.find(e => e.id === 'lagna-ruler-placement');
  assert.equal(fact?.bodyId, rulers[sign], 'wrong classical ruler sign ' + sign);
  const body = chart.placements.find(p => p.id === rulers[sign]);
  assert.ok(fact.factFa.includes('خانهٔ ' + String(body.houseNumber)),
    'wrong Whole Sign house for traditional ruler sign ' + sign);
}
const first = drafts[0].chapters[0];
const second = drafts[1].chapters[0];
assert.ok(first.evidence.some(e => e.factFa.includes('مریخ') && e.factFa.includes('خانهٔ 2')),
  'Aries ascendant lord must be Mars in actual second house');
assert.ok(second.evidence.some(e => e.factFa.includes('زهره') && e.factFa.includes('خانهٔ 3')),
  'Libra ascendant lord must be Venus in actual third house');
assert.ok(drafts[0].chapters[2].evidence.some(e => e.id === 'focus-house-companion'),
  'Real same-house concentration must cite its second classical planet');
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
const nearNak = makeChart(fixture.vectors[0], { moon: 13.34 }, 3);
assert.equal(nearNak.uncertainty.moonNakshatra, true);
const nearNakDraft = buildVedicD1PrivateManuscriptDraft(nearNak);
assert.equal(nearNakDraft.chapters[1].evidence.find(e => e.id === 'moon-nakshatra').status, 'near-boundary');
assert.ok(nearNakDraft.chapters[1].paragraphsFa.join(' ').includes('مرز دو ناکشاترا'));
const moonSign = Math.floor(fixture.vectors[0].placements.moon.longitude / 30);
const sameSign = makeChart(fixture.vectors[0], { ascendant: 30 * moonSign + 15 }, 0);
assert.ok(buildVedicD1PrivateManuscriptDraft(sameSign).chapters[3].paragraphsFa[0].includes('هر دو در یک نشان'),
  'Equal ascendant/Moon signs should not be framed as different signs');

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
assert.ok(writer.includes("row.id !== 'rahu' && row.id !== 'ketu'"),
  'Classical planet clusters must not count Rahu/Ketu as planets');
assert.ok(writer.includes('buildVedicD1NorthView(chart)'));
assert.ok(!writer.includes('generateReportContract'));
console.log('PASS Vedic premium writer: 14 reference charts, 12 Lagna rulers, 4 deeper Persian chapters, house clusters, Sun/Moon crosscheck, boundaries, free/private isolation');
console.log('NOT RUN: authenticated ownership, private storage, payment or live report delivery');
if (process.argv.includes('--preview')) {
  console.log('SYNTHETIC D1 SAMPLE — NOT A USER REPORT');
  for (const ch of drafts[0].chapters) {
    console.log('\n## ' + ch.title + '\n' + ch.paragraphsFa.join('\n\n'));
    console.log('\nشواهد: ' + ch.evidence.map(e => e.factFa).join(' | '));
  }
}
