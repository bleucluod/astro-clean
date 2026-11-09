import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root=resolve(import.meta.dirname,'..');
const read=(p)=>readFileSync(resolve(root,p),'utf8');
const renderer='lib/shop/shop-birth-sky-r9.ts';
const source=read(renderer);
const client=read('components/shop/BirthSkyLiveProduct.tsx');
const page=read('app/shop/birth-sky-map/page.tsx');
const p01=read('lib/shop/shop-p01-r9b-master.ts');
const approved=read('assets/shop-print/p02-r9-v5-approved-review.html');
for(const path of [renderer,'components/shop/BirthSkyLiveProduct.tsx']) {
  const result=ts.transpileModule(read(path),{fileName:path,reportDiagnostics:true,
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}});
  assert.deepEqual((result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error),[],path+' syntax');
}
const compiled=ts.transpileModule(source,{fileName:renderer,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const output={};vm.runInNewContext('(function(require,exports){'+compiled+'\n})',{
  Object,Array,Number,Math,String,Error,Map,Set,
})((name)=>{throw new Error('R9 renderer must be dependency free: '+name)},output);
const render=output.renderShopBirthSkyR9;
assert.equal(typeof render,'function');
const ref={referenceUtc:'2024-11-05T17:30:00.000Z',latitude:35.7081327,longitude:51.4139829};
const atlas={...ref,aboveHorizonStars:[
  {x:.1,y:-.12,visualMagnitude:-1.4},{x:-.42,y:.18,visualMagnitude:1.5},
  {x:.12,y:.4,visualMagnitude:4.5},{x:-.72,y:-.31,visualMagnitude:5.9},
]};
const figures={...ref,lines:[
  {constellationId:'Ori',rank:1,points:[{x:-.6,y:-.2},{x:-.1,y:-.1},{x:.1,y:-.4}]},
  {constellationId:'Ori',rank:1,points:[{x:-.2,y:.1},{x:.4,y:.2}]},
  {constellationId:'And',rank:1,points:[{x:.1,y:.2},{x:.6,y:.45}]},
  {constellationId:'UMa',rank:1,points:[{x:-.8,y:-.5},{x:-.6,y:-.45},{x:-.4,y:-.7}]},
  {constellationId:'Aqr',rank:2,points:[{x:0,y:0},{x:.5,y:.5}]},
]};
const named={...ref,aboveHorizonStars:[
  {id:'sirius',labelFa:'سیریوس',labelEn:'Sirius',x:.10001,y:-.12001},
  {id:'mismatch',labelFa:'نام اشتباه',labelEn:'Bad',x:.7,y:.5},
]};
const details={names:'<آراد & من>',message:'برای تو',city:'میانه',date:'۱۳۷۵/۱۱/۲۵',time:'20:21'};
const art=render(atlas,figures,named,details);
assert.match(art,/viewBox="0 0 3000 4500"/);
assert.match(art,/id="r9-actual-named-star-labels"/);
assert.doesNotMatch(art,/r9-solar-system-bodies|data-solar-body=/,
  'Rejected Solar System layer must not appear in source SVG');
assert.match(art,/سیریوس/);
assert.doesNotMatch(art,/نام اشتباه/);
assert.match(art,/&lt;آراد &amp; من&gt;/);
assert.doesNotMatch(art,/THE  SKY  AT  BIRTH|THE  S K Y|آسمان لحظهٔ تولد/);
assert.match(art,/x="1500\.00" y="4310\.00"[^>]*opacity="0\.52"/);
assert.match(art,/data-constellations="(?:[^"<>]+)"/);
assert.doesNotMatch(art,/data-constellation="Aqr"/);
assert.equal(art,render(atlas,figures,named,details),'deterministic SVG');

/** Only the large name has the approved cool icy finish. */
assert.match(art,/id="r9-personal-name"/);
assert.match(art,/id="r9-name-ice-gradient"/);
assert.match(art,/data-r9-name-layer="glow"/);
assert.match(art,/data-r9-name-layer="face"/);
assert.match(art,/filter="url\(#r9-name-soft-glow\)"/);
assert.match(art,/fill="url\(#r9-name-ice-gradient\)"/);
assert.equal((art.match(/data-r9-name-layer=/g)||[]).length,2,
  'Only the personal name can have styling layers');
assert.match(source,/canvas\.createLinearGradient/,'PNG reproduces name gradient');
assert.match(source,/canvas\.shadowBlur=24/,'PNG reproduces name glow');

const numberDetails={...details,
  names:'هاله 123۴٥',message:'یادگار 1۲٣',city:'همدان 4',
  date:'1399/12/12',time:'19:05'};
const faArt=render(atlas,figures,named,numberDetails,{numerals:'fa'});
const enArt=render(atlas,figures,named,numberDetails,{numerals:'en'});
const posterText=svg=>[...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map(m=>m[1]).join('|');
assert.match(posterText(faArt),/هاله ۱۲۳۴۵/);
assert.match(posterText(faArt),/یادگار ۱۲۳/);
assert.match(posterText(faArt),/همدان ۴/);
assert.match(posterText(faArt),/۱۳۹۹\/۱۲\/۱۲  ·  ۱۹:۰۵/);
assert.doesNotMatch(posterText(faArt),/[0-9٠-٩]/,
  'Jalali artwork must use exclusively Persian digits');
assert.match(posterText(enArt),/هاله 12345/);
assert.match(posterText(enArt),/یادگار 123/);
assert.match(posterText(enArt),/همدان 4/);
assert.match(posterText(enArt),/1399\/12\/12  ·  19:05/);
assert.doesNotMatch(posterText(enArt),/[۰-۹٠-٩]/,
  'Gregorian artwork must use exclusively English digits');
assert.match(client,/numerals: values\.calendar === 'jalali' \? 'fa' : 'en'/);
assert.notEqual(faArt,enArt);

assert.notEqual(art,render({...atlas,aboveHorizonStars:atlas.aboveHorizonStars.map(s=>({...s,x:s.x+.05}))},figures,named,details));
assert.notEqual(art,render(atlas,{...figures,lines:figures.lines.map(l=>({...l,points:l.points.map(p=>({...p,y:p.y+.05}))}))},named,details));
assert.throws(()=>render(atlas,{...figures,referenceUtc:'2023-11-05T17:30:00.000Z'},named,details));
assert.throws(()=>render(atlas,figures,{...named,longitude:named.longitude+1},details));
assert.throws(()=>render({...atlas,aboveHorizonStars:[{x:NaN,y:0,visualMagnitude:2}]},figures,named,details));
assert.throws(()=>render(atlas,{...figures,lines:[{constellationId:'Ori',rank:1,points:[{x:2,y:0},{x:0,y:0}]}]},named,details));
const plain=render(atlas,figures,named,details,{typography:false});
assert.doesNotMatch(plain,/H  A  L  L  E  U  S|راهنمای صورت‌های فلکی|<text[^>]*&lt;آراد/);
// Each guide icon literally reuses the same original SVG path data; it must
// never linearly reconnect multiple independent source paths.
const sourcePaths=[...art.matchAll(/<path data-constellation="([^"]+)" data-part="\d+" d="([^"]+)"/g)];
assert.ok(sourcePaths.length>=2);
for(const [,id,d] of sourcePaths){
  assert.ok(art.includes(`d="${d}" fill="none" stroke="#A9CADF"`),`missing exact miniature for ${id}`);
}

// Visual selection regressions: geometry-heavy fragments near a masked/cropped
// edge must not outrank a compact, genuinely legible central constellation.
const central={constellationId:'Ori',rank:1,points:[
  {x:-.26,y:-.20},{x:-.1,y:-.08},{x:.10,y:-.18},{x:.30,y:-.08},
  {x:.16,y:.06},{x:-.10,y:.10},
]};
const edge={constellationId:'Eri',rank:1,points:[
  {x:.79,y:-.45},{x:.94,y:-.28},{x:.78,y:.01},{x:.92,y:.29},
  {x:.82,y:.53},{x:.72,y:.65},
]};
const side={constellationId:'Tau',rank:1,points:[
  {x:.12,y:.05},{x:.31,y:.12},{x:.20,y:.26},{x:.39,y:.29},
]};
const ranked=render(atlas,{...figures,lines:[edge,central,side]},named,details);
const selected=ranked.match(/data-constellations="([^"]*)"/)?.[1]||'';
assert.ok(selected.split(',').includes('Ori'),'central readable silhouette must be selected');
assert.ok(selected.split(',').includes('Tau'),'second visible silhouette must be selected');
assert.ok(!selected.split(',').includes('Eri'),'cropped, faded edge figure must not be selected');

/** Footer baseline matches the last guide row, with 0–3 selected figures. */
assert.match(source,/const rowY=3862\+index\*131/);
assert.match(source,/const guideShift=chosen\.length>0\?\(3-chosen\.length\)\*131:0/);
assert.match(art,/<text x="2720\.00" y="4137\.00" font-size="55"/,
  'Date/time baseline must match the final constellation guide row');
assert.match(art,/<text x="2720\.00" y="4028\.00" font-size="52"/,
  'City stays 109 units above date and time');
assert.match(art,/<path d="M2390 4222H2720"/,
  'Separator must remain below the adjusted date');
const oneVisible=render(atlas,{...figures,lines:[central]},named,details);
const twoVisible=render(atlas,{...figures,lines:[central,side]},named,details);
assert.match(oneVisible,/transform="translate\(0 262\)"/,
  'Single constellation remains bottom-aligned with date');
assert.match(twoVisible,/transform="translate\(0 131\)"/,
  'Two constellations remain bottom-aligned with date');

assert.match(ranked,/stroke-width="1\.85" stroke-opacity="\.67"/,
  'actual source lines must be readable when preview is scaled');
assert.match(ranked,/stroke-width="4\.1" stroke-opacity="\.17"/,
  'source-matched soft glow must preserve premium appearance');
assert.doesNotMatch(ranked,/data-constellation="Aqr"/);
// All figure highlights are sourced from actual catalog stars; the scene must
// not create arbitrary vertex stars when no catalog point is within 12px.
const starless=render({...atlas,aboveHorizonStars:[]},{...figures,lines:[central]},named,details);
assert.ok(!starless.includes('r="3.3"'),'no invented star highlights');

for(const f of ['Estedad-Light.ttf','Estedad-Regular.ttf','Estedad-Medium.ttf']) {
  assert.ok(page.includes(f),`P02 missing approved font ${f}`);
  assert.ok(p01.includes(f)||f==='Estedad-Light.ttf'&&p01.includes('fontDir'),`P01 font parity missing ${f}`);
  assert.ok(approved.includes(f),`approved review font parity ${f}`);
}
assert.ok(client.includes("import('@/lib/shop/shop-birth-sky-r9')"));
assert.ok(client.includes("import('@/lib/shop/shop-sky-stars')"));
assert.ok(client.includes('renderShopBirthSkyR9(stars, figures, named'));
assert.ok(client.includes('paintShopBirthSkyR9Text'));
assert.ok(!client.includes('shop-solar-system') && !client.includes('calculateShopSolarSystem('));
assert.ok(!source.includes('options.solarSystem') && !source.includes('solarSystem?:'),
  'Rejected planetary overlay must not remain in R9 renderer API');
assert.ok(!client.includes('renderShopBirthSkyArtwork('));
assert.ok(client.includes("addShopCartItem('p02'") && !client.includes('fetch('));
const nameless = render(atlas, figures, named, { ...details, names: '', message: '' });
assert.doesNotMatch(nameless, /id="r9-personal-name"/,
  'Optional name must not render an artificial title');
assert.ok(nameless.includes('id="r9-poster-typography"'), 'Date, city and legend remain');
console.log('P02_R9_V5_REAL_DYNAMIC=PASS same_paths optional_names_font_parity_separate_sales_gate');
