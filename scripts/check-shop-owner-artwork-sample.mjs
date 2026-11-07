import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
const root=resolve(import.meta.dirname,'..');
const src=readFileSync(resolve(root,'app/api/admin/shop/design-sample/artwork/route.ts'),'utf8');
const js=ts.transpileModule(src,{fileName:'route.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
let calls=0, sourceCalls=0;
const tones=[];
let sourceValid=true;
const deps={
 '@/lib/admin/admin-auth': {
  assertAdminMutationRequest: (r)=>{if(r.headers.get('origin')!=='https://halleus.ir')throw Object.assign(new Error('origin'),{status:403});if(!r.headers.get('content-type')?.includes('application/json')) throw Object.assign(new Error('json'),{status:415});},
  requireAdminCapability: async (r,c)=>{assert.equal(c,'shop_orders.read');if(r.headers.get('authorization')!=='Bearer owner')throw Object.assign(new Error('unauthorized'),{status:401});return {role:r.headers.get('x-role')??'owner'};},
 },
 '@/lib/admin/admin-http': {
  noStoreJsonResponse: (d,status=200)=>Response.json(d,{status}),
  adminErrorResponse: (e)=>Response.json({ok:false,error:'mock'},{status:e.status??500}),
 },
 '@/lib/shop/shop-final-print': { buildPrivateShopFinalPrintCandidate: async(o,line,s,options)=>{calls++;tones.push(options?.ownerP01MoonTone);assert.equal(line,1);assert.equal(o.status,'payment_verified');assert.equal(o.items.length,1);assert.equal(o.items[0].productId,'p01');assert.equal(s.moonMap.sha256,'VALID');return {bytes:Buffer.from('jpeg-bytes')} } },
 '@/lib/shop/shop-private-print-originals': {loadPrivateShopFinalPrintSources: async(id)=>{sourceCalls++;assert.equal(id,'p01');return sourceValid?{moonMap:{sha256:'VALID'}}:{moonMap:{sha256:'wrong'}}}},
 '@/lib/shop/shop-personalization': { validateShopMoment: (_p,d)=>d.date==='bad'?{ok:false,message:'date'}:{ok:true} },
 '@/lib/shop/shop-artwork-text': {safeShopArtworkText: (s)=>{if(/[\u202a-\u202e\u2066-\u2069]/u.test(s))throw Object.assign(new Error('bidi'),{status:422});return s.trim();}},
 '@/lib/shop/shop-print-handoff': {ShopPrintHandoffError: class extends Error {constructor(s,status){super(s);this.status=status}}},
 '@/lib/shop/shop-p01-r9b-master': {SHOP_P01_R9B_STYLE:{preferredMapSha256:'VALID'}},
};
const mod={exports:{}};
vm.runInNewContext(`(function(module,exports,require){${js}\n})`,{Buffer,Request,Response,Uint8Array})(mod,mod.exports,k=>{assert.ok(k in deps,k);return deps[k];});
const input={calendar:'gregorian',date:'1999-12-12',names:'هاله',message:'نمونه',size:'20x30',city:'',moonTone:'original'};
const request=(body,headers={})=>new Request('https://halleus.ir/api/admin/shop/design-sample/artwork',{method:'POST',headers:{origin:'https://halleus.ir',authorization:'Bearer owner','content-type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)});
let r=await mod.exports.POST(request(input));assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'image/jpeg');assert.equal(r.headers.get('cache-control'),'private, no-store, max-age=0');assert.equal(calls,1);
assert.match(r.headers.get('content-disposition'), /-original\.jpg/);
r=await mod.exports.POST(request({...input,moonTone:'lifted'}));assert.equal(r.status,200);
assert.match(r.headers.get('content-disposition'), /-lifted\.jpg/);
assert.equal(calls,2);assert.deepEqual(tones,['original','lifted']);
sourceValid=false;r=await mod.exports.POST(request(input));assert.equal(r.status,409);assert.equal(calls,2);sourceValid=true;
for(const [body,h,status] of [
 [input,{authorization:'Bearer not-owner'},401],[input,{'x-role':'editor'},403],[input,{origin:'https://attacker.example'},403],[input,{'content-type':'text/plain'},415],
 [{...input,date:'bad'}, {},422],[{...input,size:'40x60'}, {},422],[{...input,moonTone:'overbright'}, {},422],[{...input,productId:'p03'}, {},422],
 [{...input,names:'a'.repeat(61)}, {},422],[{...input,message:'a'.repeat(61)}, {},422],[{...input,city:'x'.repeat(101)}, {},422],
 [{...input,names:'a'.repeat(2100)}, {},413],['not json',{},400],
 [{...input,names:'name\u202eoverride'}, {},422]
]){
 const res=await mod.exports.POST(request(body,h));assert.equal(res.status,status,`${JSON.stringify(body).slice(0,100)} expected ${status}, got ${res.status}`);
}
assert.equal(calls,2,'Only two authorized A/B requests may render.');
assert.ok(!src.includes('getAdminShopOrder'));
assert.ok(!src.includes('isShopAutomaticArtworkEnabled'));
assert.ok(!src.includes('getAdminDatabase'));
const ui=readFileSync(resolve(root,'components/admin/ShopOrdersWorkspace.tsx'),'utf8');
assert.ok(ui.includes("/api/admin/shop/design-sample/artwork"));
assert.ok(ui.includes('downloadSampleArtwork'));
assert.ok(ui.includes('samplePreviewUrl'));
assert.ok(ui.includes('sampleMoonTone'));
assert.ok(ui.includes('value="original"') && ui.includes('value="lifted"'));
const renderer=readFileSync(resolve(root,'lib/shop/shop-p01-r9b-master.ts'),'utf8');
assert.ok(renderer.includes('projectText(input.name,') && renderer.includes('projectText(dateLine,'));
assert.doesNotMatch(renderer,/const personalInfo = \[input\.name, datePrinted/);
assert.ok(renderer.includes("input.moonTone === 'lifted' ? 1.14 : 1"));
assert.ok(renderer.includes("moonTone?: 'original' | 'lifted'"));
const mode=readFileSync(resolve(root,'lib/shop/shop-artwork-mode.ts'),'utf8');
assert.ok(mode.includes('return false;'), 'Real order artwork must remain manually gated.');
console.log('P01_OWNER_SAMPLE_ROUTE_GUARD=PASS');
