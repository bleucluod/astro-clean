/** Focused privacy and actual calculator tests for localhost private preview. */
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const paths=new Map([
  ['astronomy-engine','scripts/vendor/astronomy-engine-2.1.19.cjs'],
  ['@/lib/vedic/vedic-d1-birth-adapter','lib/vedic/vedic-d1-birth-adapter.ts'],
  ['@/lib/vedic/vedic-d1-server-reading','lib/vedic/vedic-d1-server-reading.ts'],
  ['@/lib/vedic/vedic-d1-premium-writer','lib/vedic/vedic-d1-premium-writer.ts'],
  ['../date/jalali','scripts/fixtures/vedic-d1-jalali-seam.mjs'],
  ['../locations/cities','scripts/fixtures/vedic-d1-city-seam.mjs'],
]);
registerHooks({resolve(specifier,ctx,next){
  const target=paths.get(specifier);
  if(target)return {url:pathToFileURL(resolve(root,target)).href,shortCircuit:true};
  if(/^\.\/vedic-d1-[\w-]+\.js$/.test(specifier))
    return next(specifier.replace(/\.js$/,'.ts'),ctx);
  return next(specifier,ctx);
}});
const route=await import('../app/api/vedic/d1/local-preview/route.ts');
const payload={birthDate:'1996-08-12',birthTime:'11:30',
  calendar:'gregorian',cityId:'af-kabul',displayName:'نیما'};
const request=(hostname='localhost:3000',body=payload,origin=null)=>
  new Request('http://'+hostname+'/api/vedic/d1/local-preview',{method:'POST',
    headers:{'content-type':'application/json','host':hostname,...(origin?{origin}:{})},
    body:JSON.stringify(body)});
process.env.NODE_ENV='production';
assert.equal((await route.POST(request())).status,404,'Production must fail closed');
process.env.NODE_ENV='development';
assert.equal((await route.POST(request('example.com'))).status,404,'Remote host must fail closed');
assert.equal((await route.POST(request('localhost:3000',payload,'https://evil.invalid'))).status,403,'Cross-site origin must fail closed');
const success=await route.POST(request());
assert.equal(success.status,200,'Actual localhost private generator must run');
assert.equal(success.headers.get('cache-control'),'private, no-store, max-age=0');
const result=await success.json();
assert.equal(result.ok,true);
assert.deepEqual(result.manuscript.chapters.map(c=>c.id), [
  'lagna-lord','moon-emotions','houses-planets','personal-synthesis',
]);
assert.equal(result.manuscript.chapters[0].title,'لاگنا و سیارهٔ حاکم');
assert.ok(result.manuscript.chapters.every(c=>c.paragraphsFa.length>=4));
assert.ok(JSON.stringify(result).includes('نیما'));
for(const name of ['utcIso','birthDate','birthTime','cityId','ownerId','paid'])
  assert.ok(!JSON.stringify(result).includes('"'+name+'"'),name+' leaked');
const writer=readFileSync(resolve(root,'lib/vedic/vedic-d1-premium-writer.ts'),'utf8');
assert.ok(!writer.includes('آراد'),'Never hardcode a personal name in writer');
const free=readFileSync(resolve(root,'app/api/vedic/d1/route.ts'),'utf8');
assert.ok(!free.includes('premium-writer'),'Public free route must stay free');
const form=readFileSync(resolve(root,'components/vedic/VedicD1GuestForm.tsx'),'utf8');
const resultPage=readFileSync(resolve(root,'components/vedic/VedicD1GuestResult.tsx'),'utf8');
assert.ok(!form.includes('/api/vedic/d1/local-preview'),'Do not fetch full text automatically');
assert.ok(resultPage.includes('process.env.NODE_ENV !== "development"')&&resultPage.includes('onClick={openLocalPreview}'));
console.log('PASS: local-only private D1 preview; production 404, external-host 404, cross-origin 403, four chapters in order, no sensitive provenance');
