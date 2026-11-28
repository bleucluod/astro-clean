"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {getSupabaseBrowserAuthClient} from "@/lib/auth/supabase-browser-client";
import {SupabaseAuthPanel} from "@/components/SupabaseAuthPanel";
import {ComparisonPayButton} from "./ComparisonPayButton";
import {ComparisonReport} from "./ComparisonReport";
import type {PremiumComparisonView} from "@/lib/comparison/comparison-premium-store";
import styles from "./comparison.module.css";
type Summary=Pick<PremiumComparisonView,"id"|"chartALabel"|"chartBLabel"|"createdAt"|"purchaseStatus">;
type Session={kind:"loading"}|{kind:"error"}|{kind:"guest"}|{kind:"account";owner:string};
export function ComparisonPremiumLibrary({checkoutEnabled,directReportId}:{checkoutEnabled:boolean;directReportId?:string}){
 const [session,setSession]=useState<Session>({kind:"loading"});
 const [report,setReport]=useState<PremiumComparisonView|null>(null),[items,setItems]=useState<Summary[]>([]);
 const [page,setPage]=useState(1),[more,setMore]=useState(false),[error,setError]=useState(false),[revision,setRevision]=useState(0),[authRetry,setAuthRetry]=useState(0);
 const epoch=useRef(0),current=useRef<Session>({kind:"loading"});
 useEffect(()=>{
  const client=getSupabaseBrowserAuthClient();let active=true,eventSeen=false;
  function update(next:Session){
   if(!active)return;
   const old=current.current;
   if(old.kind===next.kind&&(old.kind!=="account"||next.kind==="account"&&old.owner===next.owner))return;
   current.current=next;epoch.current++;setSession(next);setReport(null);setItems([]);setPage(1);setMore(false);setError(false);
  }
  if(!client){queueMicrotask(()=>update({kind:"error"}));return()=>{active=false;epoch.current++;};}
  const {data}=client.auth.onAuthStateChange((event,s)=>{if(event==="INITIAL_SESSION"&&!s)return;eventSeen=true;update(s?{kind:"account",owner:s.user.id}:{kind:"guest"});});
  void client.auth.getSession().then(({data,error})=>{if(!eventSeen)update(error?{kind:"error"}:data.session?{kind:"account",owner:data.session.user.id}:{kind:"guest"});}).catch(()=>{if(!eventSeen)update({kind:"error"});});
  return()=>{active=false;epoch.current++;data.subscription.unsubscribe();};
 },[authRetry,directReportId]);
 useEffect(()=>{
  if(session.kind==="loading"||session.kind==="error")return;
  const abort=new AbortController(),run=epoch.current;
  async function load(){
   const client=getSupabaseBrowserAuthClient(),s=await client?.auth.getSession();
   if(!s||s.error)throw Error("AUTH");
   const auth=s.data.session;
   if(session.kind==="account"?(auth?.user.id!==session.owner||!auth.access_token):Boolean(auth))throw Error("AUTH");
   const headers:Record<string,string>=session.kind==="account"&&auth?{Authorization:"Bearer "+auth.access_token}:{};
   if(session.kind==="account"){
    const claimed=await fetch("/api/compare/premium",{method:"POST",cache:"no-store",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({action:"claim_guest"}),signal:abort.signal});
    if(!claimed.ok)throw Error("CLAIM");
   }
   const query=directReportId?"id="+encodeURIComponent(directReportId):"page="+page;
   const res=await fetch("/api/compare/premium?"+query,{cache:"no-store",headers,signal:abort.signal});
   if(session.kind==="guest"&&res.status===401&&!directReportId)return {reports:[],hasMore:false};
   const data=await res.json();if(!res.ok||data.ok!==true)throw Error("READ");
   return data;
  }
  void load().then(data=>{
   if(abort.signal.aborted||epoch.current!==run)return;
   if(directReportId){
    if(data.report?.id!==directReportId||data.report.purchaseStatus==="paid"&&(session.kind!=="account"||data.report.record?.id!==directReportId))throw Error("READ");
    setReport(data.report);
   }else{setItems(data.reports);setMore(data.hasMore===true);}
   setError(false);
  }).catch(()=>{if(!abort.signal.aborted&&epoch.current===run){setReport(null);setError(true);}});
  return()=>abort.abort();
 },[session,directReportId,page,revision]);
 const retry=()=>{setError(false);setRevision(n=>n+1);};
 const login=<div className={styles.emptyState}><p>برای خرید گزارش کامل یا دیدن گزارش خریداری‌شده، وارد حساب هالیوس شو.</p><SupabaseAuthPanel compact /></div>;
 if(session.kind==="loading")return directReportId?<p role="status">در حال بررسی حساب…</p>:null;
 if(session.kind==="error")return <div className={styles.emptyState}><p role="status">بررسی نشست حساب ممکن نشد.</p><button type="button" className={styles.secondaryButton} onClick={()=>setAuthRetry(n=>n+1)}>تلاش مجدد</button></div>;
 if(!directReportId){
  if(!items.length&&!error&&session.kind==="guest")return null;
  return <section className={styles.product} dir="rtl"><h2>گزارش‌های عاطفی من</h2>
   {error&&<p role="status">دریافت گزارش‌ها ممکن نشد. <button type="button" onClick={retry}>تلاش مجدد</button></p>}
   {items.map(item=><p key={item.id}><Link href={"/compare/"+encodeURIComponent(item.id)}>{item.chartALabel} و {item.chartBLabel} — {item.purchaseStatus==="paid"?"خریداری‌شده":item.purchaseStatus==="pending"?"در انتظار تأیید":"پیش‌نمایش رایگان"}</Link></p>)}
   {page>1&&<button type="button" onClick={()=>setPage(n=>n-1)}>قبلی</button>}{more&&<button type="button" onClick={()=>setPage(n=>n+1)}>بعدی</button>}
  </section>;
 }
 if(error)return <div className={styles.product}><p role="status">دریافت گزارش ممکن نشد.</p>{session.kind==="guest"&&login}<button type="button" className={styles.secondaryButton} onClick={retry}>تلاش مجدد</button><Link href="/reports">گزارش‌های من</Link></div>;
 if(!report)return <p role="status">در حال دریافت گزارش…</p>;
 if(report.purchaseStatus==="paid"&&report.record&&session.kind==="account")return <ComparisonReport key={report.id} comparisonId={report.id} premiumRecord={report.record}/>;
 return <div className={styles.product+" "+styles.humanFirstProduct} dir="rtl">
  <section className={styles.reportHero+" "+styles.humanReportHero}>
   <div><h1>این رابطه از چه داستانی می‌گوید؟</h1><div className={styles.overviewParagraphs}>{report.preview.overviewParagraphsFa.map((p,i)=><p key={i} className={styles.heroLead}>{p}</p>)}</div></div>
   <aside className={styles.pairCard}><span>{report.chartALabel}</span><b aria-hidden="true">↔</b><span>{report.chartBLabel}</span></aside>
  </section>
  <div className={styles.chapterSequence}>{report.preview.chapters.map(ch=><section className={styles.relationshipChapter} key={ch.id}>
   <div className={styles.sectionHeading}><p className={styles.eyebrow}>{ch.eyebrow}</p><h2>{ch.title}</h2></div>
   <article className={styles.chapterStory}><h3>{ch.storyTitle}</h3><p className={styles.storyLead} style={{whiteSpace:"pre-line"}}>{ch.excerptFa}</p><p>ادامهٔ فصل در گزارش کامل</p></article>
  </section>)}</div>
  <section className={styles.relationshipChapter}><h2>گزارش کامل رابطه</h2>
   {!report.preview.readyForSale?<p>نسخهٔ کامل این گزارش هنوز آمادهٔ خرید نیست.</p>:session.kind==="guest"?login:
   <ComparisonPayButton reportId={report.id} owner={session.owner} enabled={checkoutEnabled} pending={report.purchaseStatus==="pending"} amount={report.amountToman} onRefresh={retry}/>}
   {report.purchaseStatus==="pending"&&<p>اگر پرداخت انجام شده ولی تأیید نشده، با شمارهٔ فاکتور {report.factor} پیگیری کن.</p>}
   <Link href="/reports">گزارش‌های من</Link>
  </section>
 </div>;
}
