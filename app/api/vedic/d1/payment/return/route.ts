import {vedicPaymentConfig} from '@/lib/vedic/vedic-d1-payment-config';
import {finishVedicPayment,UUID} from '@/lib/vedic/vedic-d1-payment-flow';
import {vedicPaymentStore} from '@/lib/vedic/vedic-d1-payment-store';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'};
async function finish(query:URLSearchParams){
 const config=vedicPaymentConfig();if(!config)return new Response(null,{status:503,headers});
 let destination='https://halleus.ir/reports';
 try{
  const result=await finishVedicPayment(query,config,vedicPaymentStore);
  if(result.status==='paid'&&UUID.test(result.reportId))destination='https://halleus.ir/reports/vedic/'+result.reportId;
 }catch{/* No grant or report-specific redirect on uncertainty. */}
 return new Response(null,{status:303,headers:{...headers,Location:destination}});
}
export async function GET(request:Request){return finish(new URL(request.url).searchParams);}
export async function POST(request:Request){
 if(!/^application\/x-www-form-urlencoded(?:\s*;|$)/i.test(request.headers.get('content-type')??''))return new Response(null,{status:415,headers});
 const reader=request.body?.getReader();if(!reader)return new Response(null,{status:400,headers});
 let size=0;const parts:Uint8Array[]=[];
 try{for(;;){const c=await reader.read();if(c.done)break;size+=c.value.length;if(size>2048){void reader.cancel().catch(()=>{});return new Response(null,{status:413,headers});}parts.push(c.value);}}
 catch{return new Response(null,{status:400,headers});}finally{reader.releaseLock();}
 const q=new URL(request.url).searchParams;
 for(const [k,v] of new URLSearchParams(Buffer.concat(parts).toString('utf8')))q.append(k,v);
 return finish(q);
}
