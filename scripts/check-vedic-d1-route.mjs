/** Source route smoke: official test-only Astronomy Engine is not a mock. */
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const paths = new Map([
  ['astronomy-engine','scripts/vendor/astronomy-engine-2.1.19.cjs'],
  ['@/lib/vedic/vedic-d1-http','lib/vedic/vedic-d1-http.ts'],
  ['@/lib/vedic/vedic-d1-birth-adapter','lib/vedic/vedic-d1-birth-adapter.ts'],
  ['@/lib/vedic/vedic-d1-server-reading','lib/vedic/vedic-d1-server-reading.ts'],
  ['../date/jalali','scripts/fixtures/vedic-d1-jalali-seam.mjs'],
  ['../locations/cities','scripts/fixtures/vedic-d1-city-seam.mjs'],
]);
registerHooks({ resolve(specifier,ctx,nextResolve){
  const fixed=paths.get(specifier);
  if(fixed) return {url:pathToFileURL(resolve(root,fixed)).href,shortCircuit:true};
  if(/^\.\/vedic-d1-[\w-]+\.js$/.test(specifier))
    return nextResolve(specifier.replace(/\.js$/,'.ts'),ctx);
  return nextResolve(specifier,ctx);
}});
const route=await import('../app/api/vedic/d1/route.ts');
assert.equal(route.runtime,'nodejs');
assert.equal(route.dynamic,'force-dynamic');
assert.equal(route.revalidate,0);
assert.equal(typeof route.GET,'undefined');
assert.equal(typeof route.POST,'function');

const input={birthDate:'1996-08-12',birthTime:'11:30',calendar:'gregorian',cityId:'af-kabul'};
const req=(body)=>new Request('https://example.invalid/api/vedic/d1',{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),
});
const valid=await route.POST(req(input));
assert.equal(valid.status,200,'Actual planetary calculation must return a FREE result');
assert.equal(valid.headers.get('cache-control'),'private, no-store, max-age=0');
const validText=await valid.text();
const payload=JSON.parse(validText);
assert.equal(payload.ok,true);
assert.equal(payload.reading?.kind,'free-d1');
assert.equal(payload.reading?.view?.rows?.length,9);
assert.equal(payload.reading?.premiumStatus,'not-available');
assert.equal(payload.reading.premiumPreview.length,4);
assert.ok(payload.reading.premiumPreview.every(row =>
  Object.keys(row).sort().join(',')==='excerptFa,id,title' &&
  (row.excerptFa===null || typeof row.excerptFa==='string')));
assert.ok(payload.reading.premiumPreview.some(row=>typeof row.excerptFa==='string'));
for(const forbidden of ['birthDate','birthTime','utcIso','cityId','chapters','paragraphsFa','private-draft-not-authorized'])
  assert.equal(validText.includes(forbidden),false,'private data in guest response: '+forbidden);
const unknown=await route.POST(req({...input,cityId:'unrecognized-city'}));
assert.equal(unknown.status,400);
assert.equal((await unknown.json()).issue,'CITY_UNKNOWN');
const spoofed=await route.POST(req({...input,latitude:0,longitude:0,timezone:'UTC'}));
assert.equal(spoofed.status,400);
assert.equal((await spoofed.json()).code,'INVALID_REQUEST');
console.log('PASS Vedic route shim using actual Astronomy Engine: validated free POST 200, 9 bodies, no-store, wrong-city and spoofed-input rejected');
console.log('NOT RUN: real Next.js compilation, complete public city directory, mobile/browser E2E');
