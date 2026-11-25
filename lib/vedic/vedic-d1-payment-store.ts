import {getAdminDatabase} from '@/lib/admin/admin-database';
import type {Invoice,PaymentStore} from './vedic-d1-payment-flow';
function map(r:Record<string,unknown>,createdNow=false):Invoice{
 return {id:String(r.id),factor:String(r.factor_id),amount:Number(r.amount_toman),status:String(r.status),
 paymentId:r.provider_payment_id==null?null:String(r.provider_payment_id),transactionId:r.provider_transaction_id==null?null:String(r.provider_transaction_id),createdNow};
}
export const vedicPaymentStore:PaymentStore={
 async reserve(owner,report,proofHash,amount){
  return getAdminDatabase().begin(async tx=>{
   const own=await tx`select id from halleus_private.vedic_d1_reports where id=${report}::uuid and owner_id=${owner}::uuid for update`;
   if(!own.length)return null;
   const old=await tx`select * from halleus_private.vedic_d1_payments where report_id=${report}::uuid`;
   if(old.length){if(old[0].status!=='verified'&&old[0].proof_hash!==proofHash)throw Error('PROOF_ROTATED');return map(old[0]);}
   const rows=await tx`insert into halleus_private.vedic_d1_payments(report_id,amount_toman,amount_rial,proof_hash)
     values (${report}::uuid,${amount},${amount}::bigint*10,${proofHash}) returning *`;
   return map(rows[0],true);
  });
 },
 async recordRedirect(id,paymentId){
  const rows=await getAdminDatabase()`update halleus_private.vedic_d1_payments set status='redirect_ready',provider_payment_id=${paymentId},updated_at=now() where id=${id}::uuid and status='created' returning id`;
  if(rows.length!==1)throw Error('REDIRECT_NOT_RECORDED');
 },
 async prepareCallback(id,proofHash,paymentId,transactionId){
  return getAdminDatabase().begin(async tx=>{
   const rows=await tx`select * from halleus_private.vedic_d1_payments where id=${id}::uuid and proof_hash=${proofHash} and provider_payment_id=${paymentId} for update`;
   if(!rows.length)return null;
   const row=rows[0];
   if(row.status==='verified')return row.provider_transaction_id===transactionId?map(row):null;
   if(row.status==='verify_pending'&&row.provider_transaction_id!=null&&row.provider_transaction_id!==transactionId)return null;
   if(!['redirect_ready','verify_pending','review_required'].includes(row.status))return null;
   const next=await tx`update halleus_private.vedic_d1_payments set status='verify_pending',provider_transaction_id=${transactionId},updated_at=now() where id=${id}::uuid returning *`;
   return map(next[0]);
  });
 },
 async pending(owner,report){
  const rows=await getAdminDatabase()`select p.* from halleus_private.vedic_d1_payments p join halleus_private.vedic_d1_reports r on r.id=p.report_id where r.owner_id=${owner}::uuid and r.id=${report}::uuid`;
  return rows.length?map(rows[0]):null;
 },
 async verifyAndSettle(id,verify,expectedTransaction){
  // Serializes provider verification. The callback transaction ID is committed before this operation.
  return getAdminDatabase().begin(async tx=>{
   const rows=await tx`select * from halleus_private.vedic_d1_payments where id=${id}::uuid for update`;
   if(!rows.length)throw Error('INVOICE_NOT_FOUND');
   const i=map(rows[0]);
   if(expectedTransaction && i.transactionId!==expectedTransaction)return 'pending' as const;
   if(i.status==='verified')return 'paid' as const;
   if(!['verify_pending','review_required'].includes(i.status)||!i.transactionId||!i.paymentId)return 'pending' as const;
   let result;
   try{result=await verify(i);}catch{result=null;}
   if(!result||result.status!=='paid'||result.confirmedAmountToman!==i.amount||result.providerReference!==i.transactionId){
    await tx`update halleus_private.vedic_d1_payments set status='review_required',updated_at=now() where id=${id}::uuid`;
    return 'pending' as const;
   }
   // A verified invoice is the grant, atomically tied to its unique report.
   await tx`update halleus_private.vedic_d1_payments set status='verified',verified_at=now(),updated_at=now() where id=${id}::uuid`;
   return 'paid' as const;
  });
 }
};
