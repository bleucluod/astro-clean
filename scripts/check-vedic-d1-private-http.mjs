import assert from 'node:assert/strict';
import { handleVedicD1Private } from '../lib/vedic/vedic-d1-private-http.ts';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',id='33333333-3333-4333-8333-333333333333';
const reading={responseVersion:'vedic-d1-reading/1',kind:'free-d1',view:{},shortReading:{textFa:'free',evidence:[]},availablePremiumChapterTitles:[],premiumPreview:null,premiumStatus:'not-available'};
const saved={id,name:'Fixture',createdAt:'2026-11-25T00:00:00Z',reading,privateManuscript:'SECRET',owner:a};
let writes=0;
const deps={ready:()=>true,authenticate:async token=>token==='Bearer a'?{id:a}:token==='Bearer b'?{id:b}:null,
  resolve:input=>input.cityId==='fixture'?{ok:true,value:{}}:{ok:false,issue:{code:'CITY_UNKNOWN'}},
  save:async(owner)=>{assert.equal(owner,a);writes++;return saved;},
  get:async(owner,report)=>owner===a&&report===id?saved:null,
  list:async owner=>owner===a?[saved]:[]};
const base='https://example.test/api/vedic/d1/account';
const body={calendar:'gregorian',birthDate:'2000-01-01',birthTime:'12:00',cityId:'fixture',displayName:'Fixture',consent:true};
const post=(value,token='a',extra={})=>new Request(base,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,...extra},body:JSON.stringify(value)});
const get=(token,query='')=>new Request(base+query,{headers:{Authorization:'Bearer '+token}});
async function check(request,status,override=deps){
  const response=await handleVedicD1Private(request,override);
  assert.equal(response.status,status);
  assert.match(response.headers.get('cache-control'),/no-store/);
  const text=await response.text();assert.ok(!text.includes('SECRET'));
  return JSON.parse(text);
}
await check(post(body),503,{...deps,ready:()=>false});
await check(post(body,'invalid'),401); await check(post(body,'a',{Origin:'https://evil.test'}),403);
await check(post({...body,consent:false}),400); await check(post({...body,ownerId:b}),400);
await check(post({...body,cityId:'bad'}),400); await check(post({...body,displayName:'x'.repeat(5000)}),413);
assert.equal(writes,0);
const savedPayload=await check(post(body),200); assert.equal(savedPayload.report.purchaseStatus,'locked'); assert.equal(writes,1);
await check(get('b','?id='+id),404); await check(get('a','?id='+id),200);
assert.equal((await check(get('b'),200)).reports.length,0);
assert.equal((await check(get('a'),200)).reports.length,1);
await check(get('a','?page=0'),400); await check(get('a','?id='+id+'&page=1'),400);
await check(post(body),503,{...deps,save:async()=>{throw Error('SECRET')}});
const paid={...saved,payment:{status:'paid',amountToman:300000,factor:'42'},manuscript:{writerRulesVersion:'v',chapters:[{id:'1',title:'chapter',paragraphsFa:['FULL_PAID_TEXT'],evidence:['SECRET']}]}};
const paidDeps={...deps,get:async(o,r)=>o===a&&r===id?paid:null,list:async o=>o===a?[paid]:[]};
assert.equal((await check(get('a','?id='+id),200,paidDeps)).report.manuscript.chapters[0].paragraphsFa[0],'FULL_PAID_TEXT');
assert.equal((await check(get('a'),200,paidDeps)).reports[0].manuscript,undefined);
await check(get('b','?id='+id),404,paidDeps);
const pendingDeps={...deps,get:async()=>({...paid,payment:{status:'pending'}})};
assert.equal((await check(get('a','?id='+id),200,pendingDeps)).report.manuscript,undefined);
console.log('VEDIC_D1_PRIVATE_HTTP_PASS');
