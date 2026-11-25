import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
const id='22222222-2222-4222-8222-222222222222';
const attempt='33333333-3333-4333-8333-333333333333';
let outcome={status:'paid',reportId:id},enabled=true,received;
globalThis.__vedicReturnFixture={
 config:()=>enabled?{}:null,
 finish:async q=>{received=q;if(outcome instanceof Error)throw outcome;return outcome;},
};
const stubs=new Map([
 ['@/lib/vedic/vedic-d1-payment-config','export const vedicPaymentConfig=()=>globalThis.__vedicReturnFixture.config()'],
 ['@/lib/vedic/vedic-d1-payment-flow','export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i; export const finishVedicPayment=q=>globalThis.__vedicReturnFixture.finish(q)'],
 ['@/lib/vedic/vedic-d1-payment-store','export const vedicPaymentStore={}'],
]);
const hook=registerHooks({resolve(specifier,context,next){if(stubs.has(specifier))return {url:'data:text/javascript,'+encodeURIComponent(stubs.get(specifier)),shortCircuit:true};return next(specifier,context);}});
try{
 const {GET,POST}=await import('../app/api/vedic/d1/payment/return/route.ts');
 const url='https://halleus.ir/api/vedic/d1/payment/return?attempt='+attempt+'&proof=secret&reportId=forged';
 const location='https://halleus.ir/reports/vedic/'+id;
 const check=(res,dest)=>{assert.equal(res.status,303);assert.equal(res.headers.get('location'),dest);assert.match(res.headers.get('cache-control'),/no-store/);assert.match(res.headers.get('x-robots-tag'),/noindex/);assert.equal(res.headers.get('referrer-policy'),'no-referrer');};
 check(await GET(new Request(url)),location);
 check(await POST(new Request(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'id_get=88&trans_id=99'})),location);
 assert.equal(received.get('trans_id'),'99');
 for(const result of [{status:'pending'},{status:'invalid'},{status:'paid',reportId:'https://evil.example'},new Error('failure')]){
  outcome=result;check(await GET(new Request(url)),'https://halleus.ir/reports');
 }
 enabled=false;assert.equal((await GET(new Request(url))).status,503);
 console.log('VEDIC_CALLBACK_DESTINATION_PASS (actual route; settlement injected, no real charge)');
}finally{hook.deregister();delete globalThis.__vedicReturnFixture;}
