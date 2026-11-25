import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {startVedicPayment,finishVedicPayment,retryVedicPayment,proofFor} from '../lib/vedic/vedic-d1-payment-flow.ts';
const owner='11111111-1111-4111-8111-111111111111',report='22222222-2222-4222-8222-222222222222',id='33333333-3333-4333-8333-333333333333';
const config={apiKey:'fixture-key',secret:'fixture-secret-32-characters-long'};
let invoice=null,proofHash,created=0,verified=0;
const store={
 async reserve(o,r,p,amount){if(o!==owner||r!==report)return null;if(invoice)return {...invoice,createdNow:false};proofHash=p;invoice={id,reportId:report,factor:'42',amount,status:'created',paymentId:null,transactionId:null};return {...invoice,createdNow:true};},
 async recordRedirect(i,p){assert.equal(i,id);invoice={...invoice,status:'redirect_ready',paymentId:p};},
 async prepareCallback(i,h,p,t){if(i!==id||h!==proofHash||p!==invoice?.paymentId)return null;if(invoice.status==='verified')return invoice.transactionId===t?invoice:null;invoice={...invoice,status:'verify_pending',transactionId:t};return invoice;},
 async pending(o,r){return o===owner&&r===report?invoice:null;},
 async verifyAndSettle(i,verify,expected){assert.equal(i,id);if(expected!==invoice.transactionId)return 'pending';if(invoice.status==='verified')return 'paid';let result;try{result=await verify(invoice);}catch{}if(result?.status!=='paid'||result.confirmedAmountToman!==invoice.amount||result.providerReference!==invoice.transactionId){invoice.status='review_required';return 'pending';}invoice.status='verified';return 'paid';}
};
const create=async input=>{created++;assert.equal(input.amountToman,300000);assert.equal(input.factorId,'42');assert.match(input.returnUrl,/^https:\/\/halleus\.ir\/api\/vedic\/d1\/payment\/return\?/);return {providerPaymentId:'88',amountRial:3000000,redirectUrl:'https://untrusted.example/'};};
const verify=async input=>{verified++;assert.equal(input.expectedAmountToman,300000);assert.equal(input.expectedFactorId,'42');assert.equal(input.providerPaymentId,'88');return {status:'paid',providerReference:input.transactionId,confirmedAmountToman:300000};};
assert.equal((await startVedicPayment('other',report,config,store,create)).status,'not_found');
const first=await startVedicPayment(owner,report,config,store,create);assert.equal(first.redirectUrl,'https://bitpay.ir/payment/gateway-88-get');
assert.equal((await startVedicPayment(owner,report,config,store,create)).redirectUrl,first.redirectUrl);assert.equal(created,1);
const proof=proofFor(config.secret,report);
assert.equal(proofHash,createHash('sha256').update(proof).digest('hex'));
const q=new URLSearchParams({attempt:id,proof,id_get:'88',trans_id:'99',status:'1',amount:'1',reportId:'forged-client-report'});
const bad=new URLSearchParams(q);bad.set('proof','0'.repeat(64));assert.deepEqual(await finishVedicPayment(bad,config,store,verify),{status:'invalid'});
const duplicate=new URLSearchParams(q);duplicate.append('trans_id','100');assert.deepEqual(await finishVedicPayment(duplicate,config,store,verify),{status:'invalid'});assert.equal(verified,0);
assert.deepEqual(await finishVedicPayment(q,config,store,async()=>({status:'unconfirmed',providerReference:null})),{status:'pending'});
assert.deepEqual(await finishVedicPayment(q,config,store,async()=>({status:'paid',providerReference:'99',confirmedAmountToman:1})),{status:'pending'});
assert.equal(await retryVedicPayment('other',report,config,store,verify),'not_found');
assert.equal(await retryVedicPayment(owner,report,config,store,verify),'paid');
assert.deepEqual(await finishVedicPayment(q,config,store,verify),{status:'paid',reportId:report});assert.equal(verified,1);
assert.equal((await startVedicPayment(owner,report,config,store,create)).status,'paid');assert.equal(created,1);
console.log('VEDIC_D1_PAYMENT_FLOW_PASS (in-memory store, injected provider)');

// A first-time successful callback (not just an already settled replay) must identify the stored report.
invoice={...invoice,status:'redirect_ready',transactionId:null};
assert.deepEqual(await finishVedicPayment(q,config,store,verify),{status:'paid',reportId:report});
assert.equal(verified,2);
const forged={...store,prepareCallback:async()=>({...invoice,reportId:'invalid'})};
assert.deepEqual(await finishVedicPayment(q,config,forged,verify),{status:'invalid'});
console.log('VEDIC_PAID_RETURN_ID_PASS');
