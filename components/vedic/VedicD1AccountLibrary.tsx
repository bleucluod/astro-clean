"use client";
import {Fragment,useEffect,useRef,useState} from "react";
import {getSupabaseBrowserAuthClient} from "@/lib/auth/supabase-browser-client";
import {VedicD1PayButton} from "./VedicD1PayButton";
import {SupabaseAuthPanel} from "@/components/SupabaseAuthPanel";
import reportStyles from "@/components/report/human-first-report.module.css";
import {VedicD1FullReport} from "./VedicD1FullReport";
import {VedicD1NorthChart} from "./VedicD1NorthChart";
import type {VedicD1LocalPreview} from "./VedicD1GuestSession";
import type {VedicD1FreeReading} from "@/lib/vedic/vedic-d1-reading-contract";
import styles from "./vedic-d1-guest.module.css";
type Item={id:string;name:string;createdAt:string;purchaseStatus:"locked"|"pending"|"paid";amountToman:number|null;factor:string|null;reading:VedicD1FreeReading;manuscript?:VedicD1LocalPreview};
export function VedicD1AccountLibrary({checkoutEnabled,directReportId}:{checkoutEnabled:boolean;directReportId?:string}){
 const [owner,setOwner]=useState<string|null>(null),[ready,setReady]=useState(false),[items,setItems]=useState<Item[]>([]),[selected,setSelected]=useState<Item|null>(null),[page,setPage]=useState(1),[more,setMore]=useState(false),[error,setError]=useState(false),[revision,setRevision]=useState(0);
 const ownerRef=useRef<string|null>(null),epoch=useRef(0),detailRun=useRef(0);
 const [sessionError,setSessionError]=useState(false),[sessionRetry,setSessionRetry]=useState(0);
 useEffect(()=>{
  const client=getSupabaseBrowserAuthClient();
  let active=true,eventSeen=false;
  function update(id:string|null){if(!active)return;setSessionError(false);setReady(true);if(ownerRef.current===id)return;ownerRef.current=id;epoch.current++;detailRun.current++;setOwner(id);setItems([]);setSelected(null);setPage(1);setMore(false);setError(false);}
  function unavailable(){if(!active)return;update(null);setSessionError(true);}
  if(!client){queueMicrotask(()=>directReportId?unavailable():update(null));return()=>{active=false;};}
  const {data}=client.auth.onAuthStateChange((event,s)=>{if(event==="INITIAL_SESSION"&&!s)return;eventSeen=true;update(s?.user.id??null);});
  void client.auth.getSession().then(({data,error})=>{if(!eventSeen){if(error)unavailable();else update(data.session?.user.id??null);}}).catch(()=>{if(!eventSeen)unavailable();});
  return()=>{active=false;epoch.current++;detailRun.current++;data.subscription.unsubscribe();};
 },[directReportId,sessionRetry]);
 async function load(query:string,target:string|null,signal?:AbortSignal){
  const client=getSupabaseBrowserAuthClient();const s=await client?.auth.getSession();
  if(s?.error)throw Error("AUTH");
  if(target?(s?.data.session?.user.id!==target||!s.data.session.access_token):Boolean(s?.data.session))throw Error("AUTH");
  const headers:Record<string,string>=target&&s?.data.session?{Authorization:`Bearer ${s.data.session.access_token}`}:{};
  if(target&&query.startsWith("page=")){
    const claimed=await fetch("/api/vedic/d1/account",{method:"POST",cache:"no-store",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({action:"claim_guest"}),signal});
    if(!claimed.ok)throw Error("CLAIM");
  }
  const res=await fetch("/api/vedic/d1/account?"+query,{cache:"no-store",headers,signal});
  if(!target&&res.status===401&&query.startsWith("page="))return {reports:[],hasMore:false};
  const data=await res.json();if(!res.ok||data.ok!==true)throw Error("READ");return data;
 }
 useEffect(()=>{
  if(!ready||sessionError||(directReportId&&!owner))return;
  const abort=new AbortController(),run=epoch.current;
  const query=directReportId?"id="+encodeURIComponent(directReportId):"page="+page;
  void load(query,owner,abort.signal).then(d=>{
   if(abort.signal.aborted||epoch.current!==run)return;
   if(directReportId){
    if(d.report?.id!==directReportId||(d.report.purchaseStatus==="paid"&&!d.report.manuscript))throw Error("READ");
    setSelected(d.report);
   }else{setItems(d.reports);setMore(d.hasMore===true);}
   setError(false);
  }).catch(()=>{if(!abort.signal.aborted&&epoch.current===run){if(directReportId)setSelected(null);setError(true);}});
  return()=>abort.abort();
 },[ready,owner,page,revision,directReportId,sessionError]);
 async function open(id:string){
  if(!ready)return;const target=owner,run=epoch.current,detail=++detailRun.current;setSelected(null);setError(false);
  try{const d=await load("id="+encodeURIComponent(id),target);if(epoch.current===run&&detailRun.current===detail)setSelected(d.report);}
  catch{if(epoch.current===run&&detailRun.current===detail)setError(true);}
 }
 if(directReportId){
  if(!ready)return <p role="status">در حال بررسی حساب کاربری…</p>;
  if(sessionError)return <section className={styles.purchaseOffer}><p role="status">بررسی نشست حساب ممکن نشد.</p><button className={styles.resultBackLink} type="button" onClick={()=>{setReady(false);setSessionRetry(n=>n+1);}}>تلاش مجدد</button><a href="/reports">گزارش‌های من</a></section>;
  if(!owner)return <section className={styles.purchaseOffer}><h1>گزارش چارت تولد ودیک</h1><p>برای دیدن این گزارش وارد حسابی شو که گزارش را با آن خریدی.</p><div className={reportStyles.reportAccountAuthDialog+" "+styles.accountSurface}><SupabaseAuthPanel compact reconcileReports={false}/></div><a href="/reports">گزارش‌های من</a></section>;
 }else if(!ready||(!owner&&!items.length&&!error))return null;
 const reportContent=selected&&(!directReportId||selected.id===directReportId)?<Fragment key={selected.id}>
   {!directReportId&&<button type="button" onClick={()=>{detailRun.current++;setSelected(null);}}>بستن گزارش</button>}
   {directReportId?<header className={reportStyles.adaptiveHero}><p className={reportStyles.eyebrow}>راشی D1 · {selected.purchaseStatus==="paid"&&selected.manuscript?"گزارش کامل":"گزارش ودیک"}</p><h1>چارت تولد ودیک {selected.name}</h1><p>{selected.reading.shortReading.textFa}</p></header>:<h3>{selected.name}</h3>}
   <section className={reportStyles.chartDetails} aria-label="نقشهٔ تولد"><VedicD1NorthChart view={selected.reading.view}/></section>
   {selected.purchaseStatus==="paid"&&selected.manuscript?<VedicD1FullReport manuscript={selected.manuscript}/>:<>
    {selected.reading.premiumPreview?.map(ch=><article key={ch.id}><h4>{ch.title}</h4><p>{ch.excerptFa}</p></article>)}
    {owner&&selected.purchaseStatus!=="paid"&&<div className={directReportId?styles.purchaseOffer:undefined}><VedicD1PayButton reportId={selected.id} owner={owner} enabled={checkoutEnabled} pending={selected.purchaseStatus==="pending"} amount={selected.amountToman} onRefresh={()=>{setRevision(x=>x+1);if(!directReportId)void open(selected.id);}}/></div>}
    {!owner&&<p>برای خرید گزارش کامل، <a href="/profile">وارد حساب هالیوس شو</a>.</p>}
    {selected.purchaseStatus==="pending"&&<p>اگر پرداخت انجام شده ولی تأیید نشده، از پشتیبانی با شمارهٔ فاکتور {selected.factor} پیگیری کن.</p>}
   </>}
  </Fragment>:null;
 const errorMessage=error&&<p role="status">دریافت گزارش ممکن نشد. <button type="button" onClick={()=>{setError(false);setRevision(x=>x+1);}}>تلاش مجدد</button></p>;
 if(directReportId)return <>
  {errorMessage}
  {!error&&!reportContent&&<p role="status">در حال دریافت گزارش…</p>}
  {reportContent}
  <div className={styles.reportFooter}><a className={styles.resultBackLink} href="/reports">گزارش‌های من</a></div>
 </>;
 return <section className={styles.purchaseOffer} aria-label="گزارش‌های خصوصی ودیک" dir="rtl">
  <h2>گزارش‌های ودیک من</h2>
  {sessionError&&<p role="status">بررسی نشست حساب ممکن نشد. <button type="button" onClick={()=>{setReady(false);setSessionRetry(n=>n+1);}}>تلاش مجدد</button></p>}
  {errorMessage}
  {items.map(item=><div key={item.id}>{item.purchaseStatus==="paid"?<a className={styles.resultBackLink} href={"/reports/vedic/"+encodeURIComponent(item.id)}>{item.name} — خریداری‌شده</a>:<button type="button" className={styles.resultBackLink} onClick={()=>void open(item.id)}>{item.name} — {item.purchaseStatus==="pending"?"در انتظار تأیید":"رایگان"}</button>}</div>)}
  {page>1&&<button type="button" onClick={()=>setPage(x=>x-1)}>قبلی</button>}{more&&<button type="button" onClick={()=>setPage(x=>x+1)}>بعدی</button>}
  {reportContent&&<div>{reportContent}</div>}
 </section>;
}
