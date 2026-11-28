"use client";
import {useState,useRef} from "react";
import {getSupabaseBrowserAuthClient} from "@/lib/auth/supabase-browser-client";
import {COMPARISON_PRICE_TOMAN} from "@/lib/comparison/comparison-price";
import styles from "./comparison.module.css";
export function ComparisonPayButton({reportId,owner,enabled,pending=false,amount,onRefresh}:{reportId:string;owner:string;enabled:boolean;pending?:boolean;amount?:number|null;onRefresh?:()=>void}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const running=useRef(false);
 async function pay(action:"start"|"retry"){
  if(running.current)return;running.current=true;setBusy(true);setMessage("");
  try{
   const client=getSupabaseBrowserAuthClient();const s=await client?.auth.getSession();
   if(s?.data.session?.user.id!==owner||!s.data.session.access_token)throw Error("AUTH");
   const response=await fetch("/api/compare/payment",{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json",Authorization:`Bearer ${s.data.session.access_token}`},body:JSON.stringify({reportId,action})});
   const data=await response.json();
   const current=await client?.auth.getSession();if(current?.data.session?.user.id!==owner)return;
   if(response.ok&&data.status==="redirect"&&typeof data.redirectUrl==="string"&&/^https:\/\/bitpay\.ir\/payment\/gateway-[1-9][0-9]{0,63}-get$/.test(data.redirectUrl)){window.location.assign(data.redirectUrl);return;}
   if(response.ok&&data.status==="paid"){window.location.assign("/compare/"+encodeURIComponent(reportId));return;}
   setMessage("وضعیت پرداخت هنوز قطعی نیست. از همین گزارش پیگیری کن و دوباره پرداخت نکن.");onRefresh?.();
  }catch{setMessage("ارتباط برقرار نشد. وضعیت را از گزارش‌های من پیگیری کن.");}
  finally{running.current=false;setBusy(false);}
 }
 return <div>
  <button className={styles.primaryButton} type="button" disabled={busy||!enabled} onClick={()=>void pay("start")}>{pending?"ادامهٔ همان پرداخت":`پرداخت ${(amount??COMPARISON_PRICE_TOMAN).toLocaleString("fa-IR")} تومان`}</button>
  {pending&&<button className={styles.secondaryButton} type="button" disabled={busy} onClick={()=>void pay("retry")}>بررسی دوبارهٔ پرداخت</button>}
  {message&&<p role="status">{message}</p>}
 </div>;
}
