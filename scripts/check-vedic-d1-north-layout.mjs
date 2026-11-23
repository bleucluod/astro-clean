/** Fixed North Indian positions, all records preserved under dense/boundary conditions. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
registerHooks({resolve(specifier, context, nextResolve) {
  const mapped = new Map([
    ['./vedic-d1-contract.js','./vedic-d1-contract.ts'],
    ['./vedic-d1-assembly.js','./vedic-d1-assembly.ts'],
    ['./vedic-d1-nakshatras.js','./vedic-d1-nakshatras.ts'],
  ]).get(specifier);
  return nextResolve(mapped ?? specifier, context);
}});
const { validateVedicD1BirthRequest } = await import('../lib/vedic/vedic-d1-contract.ts');
const { assembleVedicD1Chart, VEDIC_D1_BODY_ORDER } = await import('../lib/vedic/vedic-d1-assembly.ts');
const {
  buildVedicD1NorthView, VEDIC_D1_NORTH_CENTERS, VEDIC_D1_NORTH_GRID_PATH,
  VEDIC_D1_SIGNS_FA, VEDIC_D1_NORTH_LAYOUT_VERSION,
} = await import('../lib/vedic/vedic-d1-north-layout.ts');
const root=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const references=JSON.parse(readFileSync(resolve(root,'fixtures/vedic-d1-reference-v1.json'),'utf8'));
assert.equal(references.vectors.length,14);
assert.equal(VEDIC_D1_NORTH_CENTERS.length,12);
assert.deepEqual(VEDIC_D1_NORTH_CENTERS.map(x=>x.houseNumber),Array.from({length:12},(_,i)=>i+1));
assert.equal(VEDIC_D1_NORTH_CENTERS[0].x,240);
assert.equal(VEDIC_D1_NORTH_CENTERS[1].x < 240,true);
assert.equal(VEDIC_D1_NORTH_CENTERS[2].x < 100,true);
assert.equal(VEDIC_D1_NORTH_CENTERS[3].x < 240,true);
assert.equal(VEDIC_D1_NORTH_CENTERS[6].y > 240,true);
assert.equal(VEDIC_D1_NORTH_CENTERS[9].x > 240,true);
assert.equal(VEDIC_D1_NORTH_CENTERS[11].x > 240,true);
assert.equal(VEDIC_D1_NORTH_GRID_PATH.includes('M0 0 L480 480'),true);
assert.equal(VEDIC_D1_SIGNS_FA.length,12);
const ids=['sun','moon','mars','mercury','jupiter','venus','saturn','rahu'];
let checked=0;
for(const v of references.vectors) {
  const result=validateVedicD1BirthRequest({calendar:'gregorian',birthDate:v.localDate,birthTime:v.localTime,cityId:v.id}, {
    findCityById:id=>id===v.id?{id,name:id,latitude:v.latitude,longitude:v.longitude,timezone:v.timezone}:null,
    parseJalali:()=>({ok:false,message:'test not using Jalali'}),
  });
  assert.equal(result.ok,true,`${v.id}: UTC resolve`);
  const chart=assembleVedicD1Chart(result.value,{
    utcIso:v.utcIso, calculationVersion:'synthetic-fixture-ONLY',ephemerisSource:'test-reference-not-runtime',
    coordinateFrame:'lahiri-sidereal-ecliptic-of-date',ayanamshaMode:'SE_SIDM_LAHIRI',nodeModel:'mean',
    ayanamshaDegrees:v.ayanamshaDegrees,ascendantLongitude:v.ascendant.longitude,maxErrorArcMinutes:0,
    positions:Object.fromEntries(ids.map(id=>[id,v.placements[id].longitude])),
  });
  const original=JSON.stringify(chart);
  const view=buildVedicD1NorthView(chart);
  assert.equal(JSON.stringify(chart),original,`${v.id}: source mutated`);
  assert.equal(view.version,VEDIC_D1_NORTH_LAYOUT_VERSION);
  assert.equal(view.rows.length,9,`${v.id}: all bodies in table`);
  assert.deepEqual(view.rows.map(x=>x.id),VEDIC_D1_BODY_ORDER);
  assert.equal(view.houses.length,12);
  assert.equal(view.ascendantSignNumber,chart.ascendantSignIndex+1);
  for (const house of view.houses) {
    assert.equal(house.signIndex,(chart.ascendantSignIndex+house.houseNumber-1)%12);
    assert.equal(house.signNumber,house.signIndex+1);
    assert.equal(house.signNameFa,VEDIC_D1_SIGNS_FA[house.signIndex]);
  }
  assert.equal(view.houses.flatMap(h=>h.placements).length,9,`${v.id}: every nonuncertain placement drawn`);
  for (const row of view.rows) {
    assert.ok(Math.abs(row.longitude-v.placements[row.id].longitude)<1e-8);
    assert.equal(row.houseNumber,v.placements[row.id].houseNumber);
    checked++;
  }
  assert.equal(view.moonNakshatra.pada,v.moonNakshatra.pada);
  assert.ok(view.moonNakshatra.nameFa);
}
// Eight of nine can occupy one whole-sign house: Rahu and Ketu are opposite.
const v=references.vectors[0];
const result=validateVedicD1BirthRequest({calendar:'gregorian',birthDate:v.localDate,birthTime:v.localTime,cityId:v.id},{findCityById:id=>({id,name:id,latitude:v.latitude,longitude:v.longitude,timezone:v.timezone}),parseJalali:()=>({ok:false,message:'n/a'})});
assert.equal(result.ok,true);
const crowded=assembleVedicD1Chart(result.value,{
  utcIso:v.utcIso,calculationVersion:'synthetic-fixture',ephemerisSource:'test-only',
  coordinateFrame:'lahiri-sidereal-ecliptic-of-date',ayanamshaMode:'SE_SIDM_LAHIRI',nodeModel:'mean',
  ayanamshaDegrees:24,ascendantLongitude:102.1,maxErrorArcMinutes:0,
  positions:{sun:103,moon:104,mars:105,mercury:106,jupiter:107,venus:108,saturn:109,rahu:110},
});
const dense=buildVedicD1NorthView(crowded);
assert.equal(dense.houses[0].placements.length,8,'H1 dense group');
assert.equal(dense.houses[6].placements.length,1,'Ketu opposite in H7');
assert.equal(dense.rows.length,9);
assert.equal(dense.houses.reduce((sum,h)=>sum+h.placements.length,0),9);
const moonNear={...crowded,uncertainty:{...crowded.uncertainty,
  placementSign:{...crowded.uncertainty.placementSign,moon:true},
  placementHouse:{...crowded.uncertainty.placementHouse,moon:true},
  moonNakshatra:true,moonPada:true}};
const cautious=buildVedicD1NorthView(moonNear);
assert.equal(cautious.rows.find(x=>x.id==='moon').houseNumber,null);
assert.equal(cautious.rows.find(x=>x.id==='moon').signNameFa,null);
assert.equal(cautious.houses.flatMap(h=>h.placements).length,8);
assert.equal(cautious.boundaryRows.length,1);
assert.equal(cautious.moonNakshatra.nameFa,null);
const ascNear=buildVedicD1NorthView({...crowded,uncertainty:{...crowded.uncertainty,ascendantSign:true}});
assert.equal(ascNear.canDrawHouses,false);
assert.equal(ascNear.houses.length,0);
assert.equal(ascNear.rows.length,9);
assert.ok(ascNear.rows.every(x=>x.houseNumber===null));
assert.equal(ascNear.ascendantSignNumber,null);
function invalid(chart) { assert.throws(()=>buildVedicD1NorthView(chart),/VEDIC_D1_NORTH_CHART_INVALID/); }
invalid({...crowded,coordinateFrame:'tropical'});
invalid({...crowded,contractVersion:'old'});
invalid({...crowded,calculation:{...crowded.calculation,node:'true'}});
invalid({...crowded,placements:crowded.placements.slice(1)});
invalid({...crowded,placements:[...crowded.placements.slice(0,8),crowded.placements[0]]});
invalid({...crowded,placements:crowded.placements.map(x=>x.id==='sun'?{...x,longitude:NaN}:x)});
invalid({...crowded,placements:crowded.placements.map(x=>x.id==='sun'?{...x,houseNumber:12}:x)});
invalid({...crowded,placements:crowded.placements.map(x=>x.id==='ketu'?{...x,longitude:40,signIndex:1,degreeInSign:10,houseNumber:11}:x)});
invalid({...crowded,nakshatra:{...crowded.nakshatra,index:26}});
console.log(`PASS fixed North Indian D1: ${references.vectors.length} locked vectors / ${checked} placements, 12 house centers, dense 8/9 grouping, uncertainty and input guard`);
console.log('NOT RUN: actual astronomy-engine / browser SVG / Next production build; component stays unconnected');
