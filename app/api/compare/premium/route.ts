import {getHalleusRuntimeEnv} from "@/lib/config/env";
import {isTrustedAdminRequestOrigin} from "@/lib/admin/admin-origin";
import {getSupabaseUserFromAuthorizationHeader} from "@/lib/auth/supabase-server-user";
import {readGuestReportSession} from "@/lib/auth/guest-report-session";
import {isComparisonStorageReady} from "@/lib/comparison/comparison-payment-config";
import {UUID} from "@/lib/comparison/comparison-payment-flow";
import {parsePremiumComparison,createPremiumComparison,getPremiumComparison,listPremiumComparisons,claimComparisonGuestReports,type ComparisonActor} from "@/lib/comparison/comparison-premium-store";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store, max-age=0","X-Robots-Tag":"noindex, nofollow","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff"};
const reply=(status:number,body:unknown)=>Response.json(body,{status,headers});
const fail=(status:number,code:string)=>reply(status,{ok:false,code});
async function actor(request:Request):Promise<ComparisonActor|null>{
 const auth=request.headers.get("authorization");
 if(auth){const user=await getSupabaseUserFromAuthorizationHeader(auth);return user&&UUID.test(user.id)?{id:user.id,kind:"account"}:null;}
 const guest=readGuestReportSession(request);return guest&&UUID.test(guest.userId)?{id:guest.userId,kind:"guest"}:null;
}
function guard(request:Request){
 if(!isComparisonStorageReady())return fail(503,"STORAGE_DISABLED");
 if(!isTrustedAdminRequestOrigin(request,getHalleusRuntimeEnv().siteUrl))return fail(403,"ORIGIN");
 return null;
}
export async function GET(request:Request){
 const stop=guard(request);if(stop)return stop;
 let owner;try{owner=await actor(request);}catch{return fail(401,"AUTH_REQUIRED");}if(!owner)return fail(401,"AUTH_REQUIRED");
 try{
  const q=new URL(request.url).searchParams;
  if([...q.keys()].some(k=>k!=="id"&&k!=="page")||q.getAll("id").length>1||q.getAll("page").length>1||(q.has("id")&&q.has("page")))return fail(400,"INVALID_REQUEST");
  const id=q.get("id");if(id!==null){if(!UUID.test(id))return fail(400,"INVALID_REQUEST");const report=await getPremiumComparison(owner,id);return report?reply(200,{ok:true,report}):fail(404,"NOT_FOUND");}
  const page=q.get("page")??"1";if(!/^[1-9]\d{0,3}$/.test(page))return fail(400,"INVALID_REQUEST");
  const reports=await listPremiumComparisons(owner,(Number(page)-1)*20);return reply(200,{ok:true,reports:reports.slice(0,20),hasMore:reports.length>20});
 }catch{return fail(503,"STORAGE_UNAVAILABLE");}
}
export async function POST(request:Request){
 const stop=guard(request);if(stop)return stop;
 if(!request.headers.get("origin"))return fail(403,"ORIGIN");
 let owner;try{owner=await actor(request);}catch{return fail(401,"AUTH_REQUIRED");}if(!owner)return fail(401,"AUTH_REQUIRED");
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type")??""))return fail(415,"INVALID_CONTENT_TYPE");
 const reader=request.body?.getReader();if(!reader)return fail(400,"INVALID_REQUEST");
 let raw:unknown;
 try{const chunks:Uint8Array[]=[];let size=0;for(;;){const c=await reader.read();if(c.done)break;size+=c.value.length;if(size>4096){void reader.cancel().catch(()=>{});return fail(413,"TOO_LARGE");}chunks.push(c.value);}
 raw=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(Buffer.concat(chunks)));}
 catch{return fail(400,"INVALID_JSON");}finally{reader.releaseLock();}
 try{
  if(raw&&typeof raw==="object"&&!Array.isArray(raw)&&Object.keys(raw).length===1&&(raw as {action?:unknown}).action==="claim_guest"){
   if(owner.kind!=="account")return fail(401,"AUTH_REQUIRED");
   const guest=readGuestReportSession(request);return reply(200,{ok:true,claimed:guest?await claimComparisonGuestReports(owner.id,guest.userId):0});
  }
  const input=parsePremiumComparison(raw);if(!input)return fail(400,"INVALID_REQUEST");
  if(owner.kind==="account"){const guest=readGuestReportSession(request);if(guest)await claimComparisonGuestReports(owner.id,guest.userId);}
  const report=await createPremiumComparison(owner,input);return reply(200,{ok:true,reportId:report.id});
 }catch(e){const code=e instanceof Error?e.message:"";if(["RETRY_CONFLICT","CHART_UNAVAILABLE","TIME_STATUS_INVALID","CHART_CALCULATION_FAILED"].includes(code))return fail(409,code);return fail(503,"GENERATION_UNAVAILABLE");}
}
