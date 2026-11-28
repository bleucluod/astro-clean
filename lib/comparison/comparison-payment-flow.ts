import {createHash,createHmac} from 'node:crypto';
import {requestBitPayIrPayment,verifyBitPayIrPayment} from '../shop/bitpay-ir-client.ts';
import {COMPARISON_PRICE_TOMAN} from './comparison-price.ts';
export {COMPARISON_PRICE_TOMAN};
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const decimal=(s:string)=>/^[1-9][0-9]{0,63}$/.test(s);
export type Invoice={id:string;reportId:string;factor:string;amount:number;status:string;paymentId:string|null;transactionId:string|null;createdNow?:boolean};
export type Verify=typeof verifyBitPayIrPayment;
export type PaymentStore={
 reserve(owner:string,report:string,proofHash:string,amount:number):Promise<Invoice|null>;
 recordRedirect(id:string,paymentId:string):Promise<void>;
 prepareCallback(id:string,proofHash:string,paymentId:string,transactionId:string):Promise<Invoice|null>;
 pending(owner:string,report:string):Promise<Invoice|null>;
 verifyAndSettle(id:string,verify:(invoice:Invoice)=>ReturnType<Verify>,expectedTransaction?:string):Promise<'paid'|'pending'>;
};
type Config={apiKey:string;secret:string};
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const proofFor=(secret:string,report:string)=>createHmac('sha256',secret).update('halleus:compare:callback:v1:'+report).digest('hex');
export async function startComparisonPayment(owner:string,report:string,config:Config,store:PaymentStore,create= requestBitPayIrPayment){
 if(!UUID.test(owner)||!UUID.test(report))return {status:'not_found'} as const;
 const proof=proofFor(config.secret,report),invoice=await store.reserve(owner,report,digest(proof),COMPARISON_PRICE_TOMAN);
 if(!invoice)return {status:'not_found'} as const;
 if(invoice.reportId!==report||!UUID.test(invoice.id)||!decimal(invoice.factor)||invoice.amount!==COMPARISON_PRICE_TOMAN)throw Error('INVOICE_BINDING_INVALID');
 if(invoice.status==='verified')return {status:'paid'} as const;
 if(!invoice.createdNow){
  if(invoice.status==='redirect_ready'&&invoice.paymentId&&decimal(invoice.paymentId))
   return {status:'redirect',redirectUrl:'https://bitpay.ir/payment/gateway-'+invoice.paymentId+'-get',amountToman:invoice.amount} as const;
  return {status:'pending'} as const;
 }
 if(invoice.status!=='created'||invoice.paymentId||invoice.transactionId)throw Error('INVOICE_STATE_INVALID');
 const url=new URL('/api/compare/payment/return','https://halleus.ir');
 url.searchParams.set('attempt',invoice.id);url.searchParams.set('proof',proof);
 const p=await create({apiKey:config.apiKey,amountToman:invoice.amount,factorId:invoice.factor,returnUrl:url.toString()});
 if(!decimal(p.providerPaymentId)||p.amountRial!==invoice.amount*10)throw Error('INVALID_PROVIDER_CREATE');
 await store.recordRedirect(invoice.id,p.providerPaymentId);
 return {status:'redirect',redirectUrl:'https://bitpay.ir/payment/gateway-'+p.providerPaymentId+'-get',amountToman:invoice.amount} as const;
}
function verifier(config:Config,verify:Verify){
 return (i:Invoice)=>{
  if(!i.paymentId||!i.transactionId)throw Error('INVOICE_UNCONFIRMED');
  return verify({apiKey:config.apiKey,providerPaymentId:i.paymentId,transactionId:i.transactionId,expectedAmountToman:i.amount,expectedFactorId:i.factor});
 };
}
export function parseComparisonCallback(q:URLSearchParams){
 const one=(k:string)=>q.getAll(k).length===1?q.get(k)!:'';
 const id=one('attempt'),proof=one('proof'),payment=one('id_get'),transaction=one('trans_id');
 if(!UUID.test(id)||!/^[a-f0-9]{64}$/.test(proof)||!decimal(payment)||!decimal(transaction))return null;
 return {id,proofHash:digest(proof),payment,transaction};
}
export type ComparisonPaymentReturn = {status:'invalid'|'pending'} | {status:'paid';reportId:string};
export async function finishComparisonPayment(q:URLSearchParams,config:Config,store:PaymentStore,verify:Verify=verifyBitPayIrPayment):Promise<ComparisonPaymentReturn>{
 const c=parseComparisonCallback(q);if(!c)return {status:'invalid'};
 const i=await store.prepareCallback(c.id,c.proofHash,c.payment,c.transaction);
 if(!i||!UUID.test(i.reportId)||i.id!==c.id||i.paymentId!==c.payment||i.transactionId!==c.transaction||i.amount!==COMPARISON_PRICE_TOMAN||!decimal(i.factor))return {status:'invalid'};
 const status=i.status==='verified'?'paid':await store.verifyAndSettle(i.id,verifier(config,verify),c.transaction);
 return status==='paid'?{status,reportId:i.reportId}:{status:'pending'};
}
export async function retryComparisonPayment(owner:string,report:string,config:Config,store:PaymentStore,verify:Verify=verifyBitPayIrPayment){
 if(!UUID.test(owner)||!UUID.test(report))return 'not_found' as const;
 const i=await store.pending(owner,report);
 if(!i)return 'not_found' as const;
 if(i.reportId!==report||!UUID.test(i.id)||i.amount!==COMPARISON_PRICE_TOMAN||!decimal(i.factor))throw Error('INVOICE_BINDING_INVALID');
 if(i.status==='verified')return 'paid' as const;
 if(!i.paymentId||!i.transactionId)return 'pending' as const;
 return store.verifyAndSettle(i.id,verifier(config,verify),i.transactionId);
}
