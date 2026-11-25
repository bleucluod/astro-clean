import { isTrustedAdminRequestOrigin } from '@/lib/admin/admin-origin';
import { getHalleusRuntimeEnv } from '@/lib/config/env';
import {getSupabaseUserFromAuthorizationHeader} from '@/lib/auth/supabase-server-user';
import {isVedicD1CheckoutReady,vedicPaymentConfig} from '@/lib/vedic/vedic-d1-payment-config';
import {startVedicPayment,retryVedicPayment,UUID} from '@/lib/vedic/vedic-d1-payment-flow';
import {vedicPaymentStore} from '@/lib/vedic/vedic-d1-payment-store';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const reply=(status:number,body:unknown)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'}});
export async function POST(request:Request){
 if(!isTrustedAdminRequestOrigin(request,getHalleusRuntimeEnv().siteUrl))return reply(403,{ok:false});
 const config=vedicPaymentConfig();if(!config)return reply(503,{ok:false});
 let user;try{user=await getSupabaseUserFromAuthorizationHeader(request.headers.get('authorization'));}catch{return reply(401,{ok:false});}
 if(!user)return reply(401,{ok:false});
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')??''))return reply(415,{ok:false});
 const reader=request.body?.getReader();if(!reader)return reply(400,{ok:false});
 let input:unknown;
 try{let size=0;const parts:Uint8Array[]=[];for(;;){const c=await reader.read();if(c.done)break;size+=c.value.length;
 if(size>1024){void reader.cancel().catch(()=>{});return reply(413,{ok:false});}parts.push(c.value);}
 input=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{return reply(400,{ok:false});}finally{reader.releaseLock();}
 if(!input||typeof input!=='object'||Array.isArray(input))return reply(400,{ok:false});
 const f=input as Record<string,unknown>;
 if(Object.keys(f).some(k=>!['reportId','action'].includes(k))||typeof f.reportId!=='string'||!UUID.test(f.reportId)||(f.action!=='start'&&f.action!=='retry'))return reply(400,{ok:false});
 try{
  if(f.action==='start'){
   if(!isVedicD1CheckoutReady())return reply(503,{ok:false});
   const result=await startVedicPayment(user.id,f.reportId,config,vedicPaymentStore);
   return reply(result.status==='not_found'?404:200,{ok:result.status!=='not_found',...result});
  }
  const status=await retryVedicPayment(user.id,f.reportId,config,vedicPaymentStore);
  return reply(status==='not_found'?404:200,{ok:status!=='not_found',status});
 }catch{return reply(503,{ok:false,status:'pending'});}
}
