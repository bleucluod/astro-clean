import {createHash,randomUUID} from "node:crypto";
import {isDeepStrictEqual} from "node:util";
import {getAdminDatabase} from "@/lib/admin/admin-database";
import {generateReportContract} from "@/lib/report-generation";
import {createPrivateComparison,getDefaultComparisonBirthTimeStatus} from "./comparison-premium-product-service";
import {buildComparisonEvidencePlan} from "./comparison-evidence-plan";
import {projectComparisonChapterPreview,refreshStoredComparisonChapterPreview} from "./comparison-preview-projection.mjs";
import type {AstrologyReport,BirthInput} from "@/types/astro";
import type {ComparisonRecord} from "@/types/comparison-product";

export type ComparisonActor={id:string;kind:"account"|"guest"};
export type ComparisonRequest={chartAId:string;chartBId:string;relationshipContext:"romantic";chartABirthTimeStatus:"exact"|"unknown";chartBBirthTimeStatus:"exact"|"unknown";retryKey:string};
const keys=["chartAId","chartBId","relationshipContext","chartABirthTimeStatus","chartBBirthTimeStatus","retryKey"];
const object=(v:unknown):v is Record<string,unknown>=>Boolean(v&&typeof v==="object"&&!Array.isArray(v));
const validId=(v:unknown):v is string=>typeof v==="string"&&v.length>0&&v.length<=220&&v===v.trim()&&!/[\x00-\x1f\x7f]/u.test(v);
const validTime=(v:unknown):v is "exact"|"unknown"=>v==="exact"||v==="unknown";
export function parsePremiumComparison(v:unknown):ComparisonRequest|null{
 if(!object(v)||Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k))||
 !validId(v.chartAId)||!validId(v.chartBId)||v.chartAId===v.chartBId||v.relationshipContext!=="romantic"||
 !validTime(v.chartABirthTimeStatus)||!validTime(v.chartBBirthTimeStatus)||
 typeof v.retryKey!=="string"||!/^[A-Za-z0-9_-]{16,128}$/u.test(v.retryKey))return null;
 return {chartAId:v.chartAId,chartBId:v.chartBId,relationshipContext:"romantic",chartABirthTimeStatus:v.chartABirthTimeStatus,chartBBirthTimeStatus:v.chartBBirthTimeStatus,retryKey:v.retryKey};
}
export type Preview=ReturnType<typeof projectComparisonChapterPreview>;
export type PremiumComparisonView={id:string;chartALabel:string;chartBLabel:string;createdAt:string;purchaseStatus:"locked"|"pending"|"paid";amountToman:number|null;factor:string|null;preview:Preview;record?:ComparisonRecord};
function column(actor:ComparisonActor){return actor.kind==="account"?"owner_id":"guest_owner_id";}
function snapshot(row:Record<string,unknown>){
 const rec=row.record as ComparisonRecord, saved=row.preview as Preview;
 if(!rec||rec.id!==String(row.id)||rec.version!=="comparison-product-v1"||rec.relationshipContext!=="romantic"||
 rec.privacy?.visibility!=="private"||rec.privacy.indexingPolicy!=="noindex"||rec.privacy.rawBirthInputStored!==false||
 !object(rec.reading)||!object(rec.report)||!saved||saved.version!=="comparison-chapter-preview-v7")throw Error("INVALID_SNAPSHOT");
 return {rec,saved};
}
function view(row:Record<string,unknown>,actor:ComparisonActor):PremiumComparisonView{
 const {rec,saved}=snapshot(row);
 const paid=actor.kind==="account"&&row.payment_status==="verified";
 const preview=paid?saved:refreshStoredComparisonChapterPreview(rec.reading,saved,buildComparisonEvidencePlan(rec.report));
 if(!paid&&(!isDeepStrictEqual(saved,preview)||row.ready_for_sale!==preview.readyForSale))throw Error("PREVIEW_MISMATCH");
 return {id:rec.id,chartALabel:rec.chartALabel,chartBLabel:rec.chartBLabel,createdAt:rec.createdAt,
 purchaseStatus:paid?"paid":row.payment_status?"pending":"locked",amountToman:row.amount_toman==null?null:Number(row.amount_toman),
 factor:row.factor_id==null?null:String(row.factor_id),
 preview:{version:preview.version,overviewParagraphsFa:preview.overviewParagraphsFa,readyForSale:preview.readyForSale,
 chapters:preview.chapters.map(c=>({id:c.id,title:c.title,eyebrow:c.eyebrow,storyTitle:c.storyTitle,evidenceStatus:c.evidenceStatus,excerptFa:c.excerptFa,previewReady:c.previewReady}))},
 ...(paid?{record:rec}:{})};
}
function calculateOwnedChart(stored:unknown,id:string,requested:"exact"|"unknown",at:string):AstrologyReport{
 if(!object(stored)||stored.id!==id||!object(stored.input)||!object(stored.realEngine))throw Error("CHART_UNAVAILABLE");
 const input=stored.input as BirthInput;
 if(requested==="exact"&&getDefaultComparisonBirthTimeStatus(stored as unknown as AstrologyReport)!=="exact")throw Error("TIME_STATUS_INVALID");
 const result=generateReportContract({input:{...input,birthTimeAccuracy:requested==="unknown"?"unknown":"known"},reportOwnerKind:"local",reportTier:"preview"},{generatedAt:at});
 if(!result.ok||result.contract.fallback.used||!result.contract.report.realEngine)throw Error("CHART_CALCULATION_FAILED");
 return {...result.contract.report,id};
}
export async function getPremiumComparison(actor:ComparisonActor,id:string){
 const sql=getAdminDatabase();
 const rows=await sql`select r.*,p.status as payment_status,p.amount_toman,p.factor_id
 from halleus_private.comparison_premium_reports r left join halleus_private.comparison_premium_payments p on p.report_id=r.id
 where r.${sql(column(actor))}=${actor.id}::uuid and r.id=${id}::uuid limit 1`;
 return rows.length?view(rows[0],actor):null;
}
export async function createPremiumComparison(actor:ComparisonActor,input:ComparisonRequest){
 const sql=getAdminDatabase(),col=column(actor);
 const binding=createHash("sha256").update(JSON.stringify(input)).digest("hex");
 return sql.begin(async tx=>{
  await tx`select pg_advisory_xact_lock(hashtextextended(${"compare-premium:"+actor.kind+":"+actor.id},0))`;
  const old=await tx`select r.*,p.status as payment_status,p.amount_toman,p.factor_id
   from halleus_private.comparison_premium_reports r left join halleus_private.comparison_premium_payments p on p.report_id=r.id
   where r.${tx(col)}=${actor.id}::uuid and r.retry_key=${input.retryKey}`;
  if(old.length){if(old[0].binding_hash!==binding)throw Error("RETRY_CONFLICT");return view(old[0],actor);}
  const at=new Date().toISOString(),id=randomUUID();
  const charts=await tx`select id,report_json from public.halleus_reports
   where user_id=${actor.id}::uuid and deleted_at is null and id in (${input.chartAId},${input.chartBId})`;
  const a=calculateOwnedChart(charts.find(row=>String(row.id)===input.chartAId)?.report_json,input.chartAId,input.chartABirthTimeStatus,at);
  const b=calculateOwnedChart(charts.find(row=>String(row.id)===input.chartBId)?.report_json,input.chartBId,input.chartBBirthTimeStatus,at);
  const generated=createPrivateComparison(a,b,{...input,recordId:id,generatedAt:at});
  if(!generated.ok)throw Error("GENERATION_INVALID");
  const rec=generated.record;
  if(rec.id!==id||rec.chartAId!==input.chartAId||rec.chartBId!==input.chartBId||rec.chartABirthTimeStatus!==input.chartABirthTimeStatus||rec.chartBBirthTimeStatus!==input.chartBBirthTimeStatus||rec.relationshipContext!==input.relationshipContext)throw Error("GENERATION_BINDING");
  const preview=projectComparisonChapterPreview(rec.reading,buildComparisonEvidencePlan(rec.report));
  const rows=await tx`insert into halleus_private.comparison_premium_reports(id,${tx(col)},retry_key,binding_hash,record,preview,ready_for_sale)
   values (${id}::uuid,${actor.id}::uuid,${input.retryKey},${binding},${JSON.stringify(rec)}::text::jsonb,${JSON.stringify(preview)}::text::jsonb,${preview.readyForSale}) returning *`;
  return view(rows[0],actor);
 });
}
export async function listPremiumComparisons(actor:ComparisonActor,offset:number){
 const sql=getAdminDatabase();
 const rows=await sql`select r.id,r.created_at,r.record->>'chartALabel' as chart_a,r.record->>'chartBLabel' as chart_b,p.status as payment_status
 from halleus_private.comparison_premium_reports r left join halleus_private.comparison_premium_payments p on p.report_id=r.id
 where r.${sql(column(actor))}=${actor.id}::uuid order by r.created_at desc,r.id limit 21 offset ${offset}`;
 return rows.map(row=>({id:String(row.id),chartALabel:String(row.chart_a),chartBLabel:String(row.chart_b),createdAt:String(row.created_at),purchaseStatus:actor.kind==="account"&&row.payment_status==="verified"?"paid":row.payment_status?"pending":"locked"}));
}
export async function claimComparisonGuestReports(account:string,guest:string){
 return getAdminDatabase().begin(async tx=>{
  await tx`select pg_advisory_xact_lock(hashtextextended(${"compare-premium:account:"+account},0))`;
  await tx`select pg_advisory_xact_lock(hashtextextended(${"compare-premium:guest:"+guest},0))`;
  const unsafe=await tx`select p.id from halleus_private.comparison_premium_payments p join halleus_private.comparison_premium_reports r on r.id=p.report_id where r.guest_owner_id=${guest}::uuid limit 1`;
  if(unsafe.length)throw Error("GUEST_PAYMENT_INVARIANT");
  const moved=await tx`update halleus_private.comparison_premium_reports set owner_id=${account}::uuid,guest_owner_id=null where guest_owner_id=${guest}::uuid returning id`;
  return moved.length;
 });
}
