import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root=resolve(import.meta.dirname,'..');
const read=(p)=>readFileSync(resolve(root,p),'utf8');
const modulePath='lib/shop/shop-solar-system.ts';
const source=read(modulePath);
const renderer=read('lib/shop/shop-birth-sky-r9.ts');
const client=read('components/shop/BirthSkyLiveProduct.tsx');
const page=read('app/shop/birth-sky-map/page.tsx');
const liveGuard=read('scripts/check-shop-p02-live-product.mjs');

for (const path of [modulePath,'components/shop/BirthSkyLiveProduct.tsx',
  'lib/shop/shop-birth-sky-r9.ts']) {
  const compiled=ts.transpileModule(read(path),{
    fileName:path,reportDiagnostics:true,compilerOptions:{
      module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,
    },
  });
  assert.deepEqual((compiled.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error),
    [],path+' syntax');
}
const compiled=ts.transpileModule(source,{
  fileName:modulePath,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText;
const names=['Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Moon'];
const altitude=new Map(names.map((name,i)=>[name,17+i*7]));
const illumination=new Map(names.map(name=>[name,.64]));
illumination.set('Moon',.28);
const bodyIds=Object.fromEntries([...names,'Sun'].map(name=>[name,name]));
const astro={
  Body:bodyIds,
  Observer:class Observer {
    constructor(lat,lon,elev){this.lat=lat;this.lon=lon;this.elev=elev;}
  },
  Equator(body,date,observer,ofdate,aberration){
    assert.equal(ofdate,true);assert.equal(aberration,true);
    return {ra:body,dec:0};
  },
  Horizon(date,observer,ra,dec,refraction){
    assert.equal(refraction,'normal');
    return {altitude:altitude.get(ra)??-42,azimuth:(names.indexOf(ra)*41+37)%360};
  },
  Illumination(body,date){
    return {phase_fraction:illumination.get(body)??.5};
  },
};
const output={};
vm.runInNewContext('(function(require,exports){'+compiled+'\n})',{
  Object,Array,Number,Math,String,Date,Error,Set,Map,
})((name)=>{
  if(name==='astronomy-engine')return astro;
  if(name==='./shop-sky-stars')return {parseShopSkyReference:input=>new Date(input.referenceUtc)};
  throw new Error('Unexpected import '+name);
},output);

const reference={referenceUtc:'2024-11-05T17:30:00.000Z',latitude:35.7081327,longitude:51.4139829};
const bodies=output.calculateShopSolarSystem(reference);
assert.equal(bodies.bodies.length,8,'seven planets and moon above horizon');
assert.equal([...bodies.bodies].map(p=>p.id).sort().join(','),
  ['mercury','venus','mars','jupiter','saturn','uranus','neptune','moon'].sort().join(','));
assert.ok(bodies.bodies.every(b=>b.altitudeDegrees>0));
assert.ok(bodies.bodies.every(b=>Number.isFinite(b.x)&&Number.isFinite(b.y)&&b.x*b.x+b.y*b.y<=1.0001));
const image=output.renderShopSolarSystem(bodies);
assert.equal((image.match(/data-solar-body="/g)||[]).length,8);
for(const id of ['mercury','venus','mars','jupiter','saturn','uranus','neptune','moon']){
  assert.match(image,new RegExp('data-solar-body="'+id+'"'));
}
assert.match(image,/data-illuminated-fraction="0.280000"/,'real lunar illumination is retained');
assert.match(image,/M0 -59\.00 A59\.00 59\.00/,'Moon shows a true phase-shaped illuminated region');
assert.match(image,/rx="90"/,'Saturn rings are present');
assert.match(image,/data-solar-body="jupiter"/,'Jupiter has its own disk');
assert.ok(image.includes('fill="#B6756A"'),'Jupiter red spot drawn');
assert.doesNotMatch(image,/<image\b|<foreignObject\b|https?:\/\//,
  'no image assets, remote requests, or CORS-dependent textures');
assert.doesNotMatch(image,/<text\b|راهنمای سیاره|<script/,'no printed planet legend or labels');
assert.doesNotMatch(image, /data-solar-body="earth"|data-solar-body="sun"/);
assert.equal(image,output.renderShopSolarSystem(bodies),'deterministic art');

altitude.set('Saturn',-3);altitude.set('Neptune',0);altitude.set('Moon',-11);
const reduced=output.calculateShopSolarSystem(reference);
const reducedSvg=output.renderShopSolarSystem(reduced);
assert.equal(reduced.bodies.length,5,'below horizon bodies excluded');
for(const id of ['saturn','neptune','moon']){
  assert.ok(!reducedSvg.includes('data-solar-body="'+id+'"'));
}
for(const name of names) altitude.set(name,-60);
assert.equal(output.calculateShopSolarSystem(reference).bodies.length,0);
assert.match(output.renderShopSolarSystem(output.calculateShopSolarSystem(reference)),
  /data-visible-body-count="0"/);

for(const name of names) altitude.set(name,33);
illumination.set('Moon',1);
const full=output.renderShopSolarSystem(output.calculateShopSolarSystem(reference));
illumination.set('Moon',0);
const newMoon=output.renderShopSolarSystem(output.calculateShopSolarSystem(reference));
assert.notEqual(full,newMoon,'moon phase changes appearance');
assert.ok(full.includes('data-illuminated-fraction="1.000000"'));
assert.ok(newMoon.includes('data-illuminated-fraction="0.000000"'));
assert.throws(()=>output.renderShopSolarSystem({...bodies,bodies:[bodies.bodies[0],bodies.bodies[0]]}),
  /Duplicate/);
assert.throws(()=>output.renderShopSolarSystem({...bodies,bodies:[{...bodies.bodies[0],x:NaN}]}),
  /Invalid/);

assert.ok(client.includes("import('@/lib/shop/shop-solar-system')"));
assert.ok(client.includes('calculateShopSolarSystem(reference)'));
assert.ok(client.includes('renderShopSolarSystem(solarSystem)'));
assert.ok(client.includes('solarSystem: solarArtwork'));
assert.ok(client.includes('skyOnlyArtwork.current = svg'));
assert.ok(client.includes('const fullScene = skyOnlyArtwork.current'));
assert.ok(renderer.includes("\${options.solarSystem||''}"),
  'poster must use the same source SVG for preview and PNG');
assert.ok(liveGuard.includes("import('@/lib/shop/shop-solar-system')"));
assert.ok(page.includes('Estedad-Light.ttf')&&page.includes('Estedad-Medium.ttf'));
console.log('P02_SOLAR_SYSTEM_REAL_HORIZON=PASS 7_planets_moon_real_phase_sourced_svg_no_external_images');
