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

// The editorial contract no longer requires verbatim legacy prose or an
// irrelevant Sun/house-focus fact in every chapter. Test the actual chart facts,
// boundary behavior, private/public isolation and complete narratives instead.
const failures = [];
const drafts = [];
const rulers = ['mars','venus','mercury','moon','sun','mercury','venus','mars','jupiter','saturn','saturn','jupiter'];
const ascii = s => s.replace(/[۰-۹]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
const signs = ['اریس','تارس','جمنای','کنسر','لیو','ویرگو','لیبرا','اسکورپیو','سجیتریس','کپریکورن','آکواریوس','پایسیز'];
const check = (label, fn) => { try { fn(); } catch (error) { failures.push(label + ': ' + error.message); } };
function assertDraft(chart, draft, label) {
  assert.equal(draft.kind, 'private-d1-draft');
  assert.equal(draft.version, VEDIC_D1_PRIVATE_MANUSCRIPT_VERSION);
  assert.equal(draft.calculationVersion, chart.calculationVersion);
  assert.equal(draft.chapters.length, 4);
  for (const [index, chapter] of draft.chapters.entries()) {
    assert.equal(chapter.id, VEDIC_D1_PREMIUM_CHAPTERS[index].id);
    assert.equal(chapter.title, VEDIC_D1_PREMIUM_CHAPTERS[index].title);
    assert.ok(chapter.paragraphsFa.length >= 4, label + ': thin chapter ' + chapter.id);
    assert.ok(chapter.paragraphsFa.every(p => typeof p === 'string' && p.trim().length >= 70 && !/undefined|\[object Object\]|\{(?:anchor|moon|lord|host|name)\}/.test(p)), label + ': invalid paragraph ' + chapter.id);
    assert.ok(chapter.evidence.length >= 2);
    assert.equal(new Set(chapter.evidence.map(x => x.id)).size, chapter.evidence.length);
    for (const fact of chapter.evidence) {
      assert.ok(['certain','near-boundary'].includes(fact.status));
      assert.ok(fact.sourceField.length > 6 && fact.factFa.length > 20);
      if (fact.bodyId && fact.sourceField.endsWith('.houseNumber')) {
        const placement = chart.placements.find(p => p.id === fact.bodyId);
        assert.ok(placement);
        if (chart.uncertainty.placementHouse[fact.bodyId]) {
          assert.equal(fact.status, 'near-boundary');
        } else if (fact.status === 'certain') {
          assert.ok(ascii(fact.factFa).includes('خانهٔ ' + String(placement.houseNumber)), label + ': wrong house ' + fact.id);
        }
      }
      if (fact.bodyId && fact.sourceField.endsWith('.signIndex') && chart.uncertainty.placementSign[fact.bodyId]) {
        assert.equal(fact.status, 'near-boundary');
      }
    }
  }
  const [lagna, moon, houses, synthesis] = draft.chapters;
  if (!chart.uncertainty.ascendantSign) {
    assert.equal(lagna.paragraphsFa.length, 5);
    assert.ok(lagna.evidence.some(e => e.id === 'lagna-degree' && e.sourceField === 'ascendantLongitude'));
    const ruler = lagna.evidence.find(e => e.id === 'lagna-ruler-placement');
    assert.equal(ruler?.bodyId, rulers[chart.ascendantSignIndex]);
    assert.ok(lagna.paragraphsFa.some(p => p.includes('حاکم')));
    assert.ok(lagna.paragraphsFa.join(' ').includes(signs[chart.ascendantSignIndex]));
  }
  assert.ok(moon.evidence.some(e => e.bodyId === 'moon'));
  assert.equal(houses.paragraphsFa.length, 5);
  assert.ok(houses.evidence.some(e => e.id === 'focus-primary'));
  assert.ok(houses.evidence.some(e => !['rahu','ketu'].includes(e.bodyId)));
  assert.ok(synthesis.evidence.every(e => !['rahu','ketu'].includes(e.bodyId)));
  const serialized = JSON.stringify(draft);
  for (const forbidden of ['"ownerId"', '"paid":true', '"birthDateGregorian"', '"birthTime"', '"cityId"']) {
    assert.equal(serialized.includes(forbidden), false, label + ': private draft leaked metadata');
  }
}
for (const vector of fixture.vectors) {
  check(vector.id + '/writer', () => {
    const chart = makeChart(vector);
    const draft = buildVedicD1PrivateManuscriptDraft(chart);
    assertDraft(chart, draft, vector.id);
    const serialized = JSON.stringify(draft);
    for (const secret of [vector.utcIso, vector.id, vector.localDate]) {
      assert.equal(serialized.includes(secret), false, vector.id + ': leaked metadata');
    }
    drafts.push(draft);
  });
  check(vector.id + '/free', () => {
    const free = JSON.stringify(buildVedicD1FreeReading(makeChart(vector)));
    for (const forbidden of ['private-d1-draft','paragraphsFa','writerRulesVersion','lagna-ruler-placement','lagna-degree','lagna-first-house-body','lagna-ruler-sign-host','lagna-lord-companion-1','lagna-lord-companion-2','focus-primary','sun-moon-context','focus-house-companion','"chapters"']) {
      assert.equal(free.includes(forbidden), false, vector.id + ': premium leak in free reading');
    }
  });
}
for (let sign = 0; sign < 12; sign++) {
  check('ruler/' + sign, () => {
    const chart = makeChart(fixture.vectors[0], { ascendant: sign * 30 + 15 }, 0);
    const draft = buildVedicD1PrivateManuscriptDraft(chart);
    assertDraft(chart, draft, 'ruler/' + sign);
    const fact = draft.chapters[0].evidence.find(e => e.id === 'lagna-ruler-placement');
    assert.equal(fact?.bodyId, rulers[sign]);
    assert.ok(ascii(fact.factFa).includes('خانهٔ ' + String(chart.placements.find(p => p.id === fact.bodyId).houseNumber)));
  });
}
function shingles(paragraphs) {
  const result = new Set();
  for (const text of paragraphs) {
    const words = ascii(text.normalize('NFKC').replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[\u064b-\u065f\u0670\u200c]/g,'')).replace(/[^\p{L}\p{N}]+/gu,' ').trim().split(/\s+/);
    for (let i=0;i+7<=words.length;i++) result.add(words.slice(i,i+7).join(' '));
  }
  return result;
}
check('independent charts', () => {
  const x = buildVedicD1PrivateManuscriptDraft(makeChart(fixture.vectors[0]));
  const y = buildVedicD1PrivateManuscriptDraft(makeChart(fixture.vectors[1]));
  const a = shingles(x.chapters[0].paragraphsFa), b = shingles(y.chapters[0].paragraphsFa);
  const common = [...a].filter(t=>b.has(t)).length;
  assert.ok(common/Math.min(a.size,b.size)<0.55);
  assert.ok(x.chapters[0].paragraphsFa.every(p=>!y.chapters[0].paragraphsFa.includes(p)));
  assert.notDeepEqual(x.chapters.map(c=>c.paragraphsFa),y.chapters.map(c=>c.paragraphsFa));
});
check('first-house Venus', () => {
  const draft = buildVedicD1PrivateManuscriptDraft(makeChart(fixture.vectors[0], {ascendant:15,venus:17},0));
  const fact = draft.chapters[0].evidence.find(e=>e.id==='lagna-first-house-body');
  assert.equal(fact?.bodyId,'venus');
  assert.ok(ascii(fact.factFa).includes('خانهٔ 1'));
  assert.ok(draft.chapters[0].paragraphsFa.join(' ').includes('زهره'));
});
check('own-sign ruler', () => {
  const draft=buildVedicD1PrivateManuscriptDraft(makeChart(fixture.vectors[0],{ascendant:15,mars:17},0));
  assert.ok(draft.chapters[0].evidence.some(e=>e.id==='lagna-ruler-placement'&&e.bodyId==='mars'&&ascii(e.factFa).includes('خانهٔ 1')));
});
check('ruler boundary', () => {
  const chart=makeChart(fixture.vectors[0],{ascendant:15,mars:29.99},3);
  const draft=buildVedicD1PrivateManuscriptDraft(chart);
  assertDraft(chart,draft,'ruler boundary');
  assert.equal(draft.chapters[0].evidence.find(e=>e.id==='lagna-ruler-placement').status,'near-boundary');
  assert.ok(!draft.chapters[0].paragraphsFa.join(' ').includes('مریخ در اریس و خانهٔ'));
});
check('safe optional name', () => {
  const chart=makeChart(fixture.vectors[0]);
  const anonymous=buildVedicD1PrivateManuscriptDraft(chart);
  const named=buildVedicD1PrivateManuscriptDraft(chart,{displayName:'آزمایشنام'});
  assert.ok(named.chapters.some(c=>c.paragraphsFa.join(' ').includes('آزمایشنام')));
  assert.ok(named.chapters.some(c=>c.paragraphsFa.slice(1).some(p=>p.includes('آزمایشنام'))));
  for(let i=0;i<4;i++) assert.deepEqual(named.chapters[i].evidence,anonymous.chapters[i].evidence);
  assert.deepEqual(buildVedicD1PrivateManuscriptDraft(chart),anonymous);
  assert.ok(!JSON.stringify(anonymous).includes('آزمایشنام'));
  for(const bad of ['<script>','۱۲۳','علی 🌟','x'.repeat(41),'']) assert.throws(()=>buildVedicD1PrivateManuscriptDraft(chart,{displayName:bad}),/VEDIC_D1_DISPLAY_NAME_INVALID/);
});
check('same-house host', () => {
  const d=buildVedicD1PrivateManuscriptDraft(makeChart(fixture.vectors[0],{ascendant:15,mars:45,venus:50},0));
  assert.ok(d.chapters[0].evidence.some(e=>e.id==='lagna-ruler-sign-host'&&ascii(e.factFa).includes('خانهٔ 2')));
});
check('co-tenants', () => {
  const d=buildVedicD1PrivateManuscriptDraft(makeChart(fixture.vectors[0],{ascendant:15,mars:45,jupiter:46,venus:47},0));
  assert.equal(d.chapters[0].evidence.filter(e=>e.id.startsWith('lagna-lord-companion-')).length,2);
});
check('boundary ascendant and moon', () => {
  const chart=makeChart(fixture.vectors[0],{ascendant:30.01,moon:29.99,mars:30.01},3);
  const d=buildVedicD1PrivateManuscriptDraft(chart);
  assertDraft(chart,d,'boundary');
  assert.equal(chart.uncertainty.ascendantSign,true);
  assert.equal(chart.uncertainty.placementSign.moon,true);
  assert.equal(d.chapters[0].evidence[0].status,'near-boundary');
  assert.ok(d.chapters[0].evidence.some(e=>e.id==='lagna-sun-alternative'));
  assert.equal(d.chapters[1].evidence[0].status,'near-boundary');
  assert.ok(!d.chapters[0].paragraphsFa.join(' ').includes('حاکم اریس،'));
  assert.ok(!d.chapters[1].paragraphsFa[0].includes('ماه در ثور قرار دارد'));
  assert.ok(!d.chapters[3].evidence.some(e=>e.bodyId==='moon'&&e.status==='certain'));
});
check('nakshatra boundary', () => {
  const chart=makeChart(fixture.vectors[0],{moon:13.34},3);
  const d=buildVedicD1PrivateManuscriptDraft(chart);
  assert.equal(chart.uncertainty.moonNakshatra,true);
  assert.equal(d.chapters[1].evidence.find(e=>e.id==='moon-nakshatra').status,'near-boundary');
});
check('scattered houses', () => {
  const d=buildVedicD1PrivateManuscriptDraft(makeChart(fixture.vectors[0],{ascendant:15,sun:15,moon:45,mars:75,mercury:105,jupiter:135,venus:165,saturn:195},0));
  assert.ok(!d.chapters[2].evidence.some(e=>e.id==='focus-house-companion'));
});
check('clustered houses', () => {
  const d=buildVedicD1PrivateManuscriptDraft(makeChart(fixture.vectors[0],{ascendant:15,sun:35,moon:38,mars:40,mercury:42,jupiter:44,venus:46,saturn:78},0));
  assert.ok(d.chapters[2].evidence.some(e=>e.id==='focus-house-companion'));
  assert.ok(d.chapters[2].evidence.some(e=>e.bodyId==='venus'&&ascii(e.factFa).includes('خانهٔ 2')));
});
check('uncertain houses', () => {
  const d=buildVedicD1PrivateManuscriptDraft(makeChart(fixture.vectors[0],{ascendant:30.01},3));
  assert.equal(d.chapters[2].evidence[0].status,'near-boundary');
});
check('structural Virgo', () => {
  const chart=makeChart(fixture.vectors[0],{ascendant:151.25,sun:305.5,moon:23.05,mars:161.7,mercury:282.75,jupiter:281.5,venus:289.3,saturn:341.05},0);
  const d=buildVedicD1PrivateManuscriptDraft(chart,{displayName:'آزمایشنام'});
  assertDraft(chart,d,'structural Virgo');
  assert.ok(d.chapters[0].paragraphsFa.join(' ').includes('ویرگو'));
  assert.ok(d.chapters[1].evidence.some(e=>e.id==='moon-nakshatra'&&e.status==='certain'));
  assert.ok(d.chapters[2].evidence.some(e=>e.bodyId==='saturn'));
  assert.ok(d.chapters[3].evidence.some(e=>e.bodyId==='mercury'));
});
for(const path of ['lib/vedic/vedic-d1-free-reading.ts','lib/vedic/vedic-d1-server-reading.ts','app/api/vedic/d1/route.ts','components/vedic/VedicD1GuestForm.tsx','components/vedic/VedicD1GuestResult.tsx']) {
  check('public isolation/' + path, () => {
    const source=read(path);
    assert.ok(!source.includes('vedic-d1-premium-writer')&&!source.includes('buildVedicD1PrivateManuscriptDraft')&&!source.includes('private-d1-draft'));
  });
}
check('source isolation',()=>{
  const writer=read('lib/vedic/vedic-d1-premium-writer.ts');
  assert.ok(writer.includes('chapterOneName(options.displayName)'));
  assert.ok(writer.includes('chapterOneBodyFact(')&&writer.includes('CHAPTER1_ZODIAC'));
  assert.ok(writer.includes('buildVedicD1NorthView(chart)'));
  assert.ok(!writer.includes('generateReportContract'));
  assert.ok(!writer.includes('آراد'));
});
if(failures.length) {
  console.error('FAIL Vedic premium writer: '+failures.length+' independent failures');
  for(const failure of failures) console.error(failure);
  process.exitCode=1;
} else {
  console.log('PASS Vedic premium writer: 14 reference charts, 12 rulers, independent chapters, boundaries, evidence, names, and free/private isolation');
}
console.log('NOT RUN: authenticated ownership, private storage, payment or live report delivery');
if(process.argv.includes('--preview')&&drafts.length) for(const ch of drafts[0].chapters) {
  console.log('\n## '+ch.title+'\n'+ch.paragraphsFa.join('\n\n'));
  console.log('\nEvidence: '+ch.evidence.map(e=>e.factFa).join(' | '));
}
