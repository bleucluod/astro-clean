"use client";
import {useEffect,useRef,useState} from "react";
import {getSupabaseBrowserAuthClient} from "@/lib/auth/supabase-browser-client";
import {VedicD1PayButton} from "./VedicD1PayButton";
import {VedicD1FullReport} from "./VedicD1FullReport";
import {VedicD1NorthChart} from "./VedicD1NorthChart";
import type {VedicD1LocalPreview} from "./VedicD1GuestSession";
import type {VedicD1FreeReading} from "@/lib/vedic/vedic-d1-reading-contract";
import styles from "./vedic-d1-guest.module.css";
type Item={id:string;name:string;createdAt:string;purchaseStatus:"locked"|"pending"|"paid";amountToman:number|null;factor:string|null;reading:VedicD1FreeReading;manuscript?:VedicD1LocalPreview};
export function VedicD1AccountLibrary({checkoutEnabled}:{checkoutEnabled:boolean}){
 const [owner,setOwner]=useState<string|null>(null),[ready,setReady]=useState(false),[items,setItems]=useState<Item[]>([]),[selected,setSelected]=useState<Item|null>(null),[page,setPage]=useState(1),[more,setMore]=useState(false),[error,setError]=useState(false),[revision,setRevision]=useState(0);
 const ownerRef=useRef<string|null>(null),epoch=useRef(0),detailRun=useRef(0);
 useEffect(()=>{
  const client=getSupabaseBrowserAuthClient();if(!client){queueMicrotask(()=>setReady(true));return;}
  let active=true,eventSeen=false;
  function update(id:string|null){if(!active)return;setReady(true);if(ownerRef.current===id)return;ownerRef.current=id;epoch.current++;detailRun.current++;setOwner(id);setItems([]);setSelected(null);setPage(1);setMore(false);setError(false);}
  const {data}=client.auth.onAuthStateChange((_event,s)=>{eventSeen=true;update(s?.user.id??null);});
  void client.auth.getSession().then(({data})=>{if(!eventSeen)update(data.session?.user.id??null);}).catch(()=>{if(active&&!eventSeen)setReady(true);});
  return()=>{active=false;epoch.current++;detailRun.current++;data.subscription.unsubscribe();};
 },[]);
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
  if(!ready)return;
  const abort=new AbortController(),run=epoch.current;
  void load("page="+page,owner,abort.signal).then(d=>{if(!abort.signal.aborted&&epoch.current===run){setItems(d.reports);setMore(d.hasMore===true);setError(false);}}).catch(()=>{if(!abort.signal.aborted&&epoch.current===run)setError(true);});
  return()=>abort.abort();
 },[ready,owner,page,revision]);
 async function open(id:string){
  if(!ready)return;const target=owner,run=epoch.current,detail=++detailRun.current;setSelected(null);setError(false);
  try{const d=await load("id="+encodeURIComponent(id),target);if(epoch.current===run&&detailRun.current===detail)setSelected(d.report);}
  catch{if(epoch.current===run&&detailRun.current===detail)setError(true);}
 }
 if(!ready||(!owner&&!items.length&&!error))return null;
 return <section className={styles.purchaseOffer} aria-label="گزارش‌های خصوصی ودیک" dir="rtl">
  <h2>گزارش‌های ودیک من</h2>
  {error&&<p role="status">دریافت گزارش ممکن نشد. <button type="button" onClick={()=>setRevision(x=>x+1)}>تلاش مجدد</button></p>}
  {items.map(item=><div key={item.id}><button type="button" className={styles.resultBackLink} onClick={()=>void open(item.id)}>{item.name} — {item.purchaseStatus==="paid"?"خریداری‌شده":item.purchaseStatus==="pending"?"در انتظار تأیید":"رایگان"}</button></div>)}
  {page>1&&<button type="button" onClick={()=>setPage(x=>x-1)}>قبلی</button>}{more&&<button type="button" onClick={()=>setPage(x=>x+1)}>بعدی</button>}
  {selected&&<div key={selected.id}>
   <button type="button" onClick={()=>{detailRun.current++;setSelected(null);}}>بستن گزارش</button>
   <h3>{selected.name}</h3><VedicD1NorthChart view={selected.reading.view}/>
   {selected.purchaseStatus==="paid"&&selected.manuscript?<VedicD1FullReport manuscript={selected.manuscript}/>:<>
    {selected.reading.premiumPreview?.map(ch=><article key={ch.id}><h4>{ch.title}</h4><p>{ch.excerptFa}</p></article>)}
    {owner&&selected.purchaseStatus!=="paid"&&<VedicD1PayButton reportId={selected.id} owner={owner} enabled={checkoutEnabled} pending={selected.purchaseStatus==="pending"} amount={selected.amountToman} onRefresh={()=>{setRevision(x=>x+1);void open(selected.id);}}/>}
    {!owner&&<p>برای خرید گزارش کامل، <a href="/profile">وارد حساب هالیوس شو</a>.</p>}
    {selected.purchaseStatus==="pending"&&<p>اگر پرداخت انجام شده ولی تأیید نشده، از پشتیبانی با شمارهٔ فاکتور {selected.factor} پیگیری کن.</p>}
   </>}
  </div>}
 </section>;
}
