"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { SupabaseAuthPanel } from "@/components/SupabaseAuthPanel";
import { getSupabaseBrowserAuthClient } from "@/lib/auth/supabase-browser-client";
import type { VedicD1BirthRequest } from "@/lib/vedic/vedic-d1-contract";
import styles from "./vedic-d1-guest.module.css";
import reportStyles from "@/components/report/human-first-report.module.css";
import {VedicD1PayButton} from "./VedicD1PayButton";

export function VedicD1PrivateSave({name,birth,savedReportId,checkoutEnabled}:{name:string;birth:VedicD1BirthRequest;savedReportId?:string;checkoutEnabled:boolean}) {
  const [owner,setOwner]=useState<string|null>(null);
  const [sessionState,setSessionState]=useState<"checking"|"guest"|"account"|"unavailable">("checking");
  const [sessionRetry,setSessionRetry]=useState(0);
  const [status,setStatus]=useState<"idle"|"saving"|"saved"|"error">("idle");
  const [savedReport,setSavedReport]=useState<{id:string;purchaseStatus:"locked"|"pending"|"paid";amountToman:number|null}|null>(null);
  const ownerRef=useRef<string|null>(null);
  const attempt=useRef(0);
  useEffect(()=>{
    const client=getSupabaseBrowserAuthClient();
    let active=true;
    let eventSeen=false;
    function update(next:string|null){
      if(!active)return;
      if(ownerRef.current!==next){
        ownerRef.current=next;
        attempt.current++;
        setOwner(next);
        setSavedReport(null);
        setStatus("idle");
      }
      setSessionState(next?"account":"guest");
    }
    function unavailable(){
      if(!active)return;
      attempt.current++;
      ownerRef.current=null;
      setOwner(null);
      setSavedReport(null);
      setStatus("idle");
      setSessionState("unavailable");
    }
    if(!client){
      queueMicrotask(unavailable);
      return()=>{active=false;attempt.current++;};
    }
    const {data}=client.auth.onAuthStateChange((event,session)=>{
      // A null INITIAL_SESSION is not proof of a successful session lookup.
      if(event==="INITIAL_SESSION"&&!session)return;
      eventSeen=true;
      update(session?.user.id??null);
    });
    void client.auth.getSession().then(({data,error})=>{
      if(eventSeen||!active)return;
      if(error)unavailable();
      else update(data.session?.user.id??null);
    }).catch(()=>{if(!eventSeen)unavailable();});
    return()=>{active=false;attempt.current++;data.subscription.unsubscribe();};
  },[sessionRetry]);
  const save=useCallback(async()=>{
    if(!owner||status==="saving"||status==="saved") return;
    const target=owner,run=++attempt.current;
    setStatus("saving");
    try{
      const client=getSupabaseBrowserAuthClient();
      const session=await client?.auth.getSession();
      const token=session?.data.session?.access_token;
      if(session?.error||!token||session?.data.session?.user.id!==target)throw new Error("AUTH");
      const headers={"Content-Type":"application/json",Authorization:`Bearer ${token}`};
      let response:Response|null=null;
      if(savedReportId){
        const claimed=await fetch("/api/vedic/d1/account",{method:"POST",cache:"no-store",headers,body:JSON.stringify({action:"claim_guest"})});
        if(!claimed.ok)throw Error("CLAIM");
        response=await fetch("/api/vedic/d1/account?id="+encodeURIComponent(savedReportId),{cache:"no-store",headers});
        if(response.status!==404&&!response.ok)throw Error("READ");
      }
      // A guest duplicate may have been merged into a previously saved account report.
      // The existing owner/input/version unique constraint makes this fallback idempotent.
      if(!response||response.status===404)response=await fetch("/api/vedic/d1/account",{method:"POST",cache:"no-store",headers,
        body:JSON.stringify({...birth,displayName:name.trim(),consent:true})});
      const payload=await response.json();
      if(!response.ok||payload.ok!==true||typeof payload.report?.id!=="string")throw new Error("SAVE");
      if(attempt.current===run&&ownerRef.current===target){setSavedReport({id:payload.report.id,purchaseStatus:payload.report.purchaseStatus,amountToman:payload.report.amountToman});setStatus("saved");}
    }catch{if(attempt.current===run&&ownerRef.current===target)setStatus("error");}
  },[owner,status,birth,name,savedReportId]);
  useEffect(()=>{
    if(sessionState==="account"&&owner&&status==="idle"){
      const timer=window.setTimeout(()=>void save(),0);
      return()=>window.clearTimeout(timer);
    }
  },[sessionState,owner,status,save]);
  return <div>
    {sessionState==="checking"&&<p role="status">در حال بررسی حساب کاربری…</p>}
    {sessionState==="unavailable"&&<div role="status"><p>بررسی نشست حساب ممکن نشد.</p><button className={styles.resultBackLink} type="button" onClick={()=>{setSessionState("checking");setSessionRetry(n=>n+1);}}>تلاش مجدد</button></div>}
    {sessionState==="guest"&&<div className={reportStyles.reportAccountAuthDialog + " " + styles.accountSurface}>
      <p className={styles.accountHint}>برای خرید، وارد حساب کاربری هالیوس شو یا یک حساب بساز.</p>
      <SupabaseAuthPanel compact reconcileReports={false} />
    </div>}
    {sessionState==="account"&&owner&&<div>
      {status==="saving"&&<p role="status">در حال اتصال گزارش به حساب…</p>}
      {status==="saved"&&savedReport&&<><p role="status">گزارش به حساب تو متصل شد.</p>{savedReport.purchaseStatus!=="paid"&&<VedicD1PayButton reportId={savedReport.id} owner={owner} enabled={checkoutEnabled} pending={savedReport.purchaseStatus==="pending"} amount={savedReport.amountToman} />}<p><a href="/reports">بازگشت به گزارش‌های من</a></p></>}
      {status==="error"&&<p role="status">اتصال گزارش به حساب ممکن نشد. <button type="button" onClick={()=>void save()}>تلاش مجدد</button></p>}
    </div>}
  </div>;
}
