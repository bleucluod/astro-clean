"use client";
import type { AstrologyReport } from "@/types/astro";
import type { ComparisonRecord } from "@/types/comparison-product";
export type DemoSummary = Pick<ComparisonRecord,"id"|"chartALabel"|"chartBLabel"|"relationshipContext"|"updatedAt">;
export type DemoLibrary = {account:boolean;charts:AstrologyReport[];reports:DemoSummary[]};
export type DemoReport = {reportId:string;paid:boolean;summary:DemoSummary;preview:{overviewParagraphsFa:string[];primaryPatterns:{id:string;title:string;excerptFa:string}[];chapters:{id:string;title:string;eyebrow:string;storyTitle:string;evidenceStatus:"supported"|"limited"|"insufficient";excerptFa:string}[]};record?:ComparisonRecord};
export type DemoInvoice = {invoiceId:string;status:"pending"|"verified";amountToman:number};
const messages:Record<string,string> = {
  CHART_UNAVAILABLE:"چارت انتخاب‌شده در دسترس نیست.",
  TIME_STATUS_INVALID:"دقت ساعت تولد معتبر نیست.",
  LOGIN_REQUIRED:"پیش از خرید وارد حساب آزمایشی شو.",
  RETRY_CONFLICT:"مشخصات تغییر کرده‌اند؛ دوباره تلاش کن.",
  CHART_CALCULATION_FAILED:"محاسبهٔ معتبر چارت کامل نشد.",
  REPORT_UNAVAILABLE:"گزارش در دسترس نیست.",
  INVOICE_UNAVAILABLE:"فاکتور در دسترس نیست.",
  DEMO_SESSION_REQUIRED:"نشست آزمایشی در دسترس نیست؛ صفحه را تازه کن.",
};
export async function comparisonDemoRequest<T>(action:string,fields:Record<string,unknown>={}):Promise<T>{
  const res=await fetch("/api/compare/demo",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,...fields}),cache:"no-store"});
  const data=await res.json();
  if(!res.ok||data.ok!==true)throw new Error(messages[data.code]??"عملیات آزمایشی کامل نشد.");
  return data as T;
}
let pending:Promise<DemoLibrary>|undefined;
export function initComparisonDemo(){
  if(!pending)pending=comparisonDemoRequest<DemoLibrary>("init").finally(()=>{pending=undefined;});
  return pending;
}
