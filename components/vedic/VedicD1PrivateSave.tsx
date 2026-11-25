"use client";
import { useEffect, useRef, useState } from "react";
import { SupabaseAuthPanel } from "@/components/SupabaseAuthPanel";
import { getSupabaseBrowserAuthClient } from "@/lib/auth/supabase-browser-client";
import type { VedicD1BirthRequest } from "@/lib/vedic/vedic-d1-contract";
import styles from "./vedic-d1-guest.module.css";
import reportStyles from "@/components/report/human-first-report.module.css";
import {VedicD1PayButton} from "./VedicD1PayButton";

export function VedicD1PrivateSave({name,birth,checkoutEnabled}:{name:string;birth:VedicD1BirthRequest;checkoutEnabled:boolean}) {
  const [owner,setOwner]=useState<string|null>(null);
  const [consent,setConsent]=useState(false);
  const [status,setStatus]=useState<"idle"|"saving"|"saved"|"error">("idle");
  const [savedReport,setSavedReport]=useState<{id:string;purchaseStatus:"locked"|"pending"|"paid";amountToman:number|null}|null>(null);
  const ownerRef=useRef<string|null>(null);
  const attempt=useRef(0);
  useEffect(()=>{
    const client=getSupabaseBrowserAuthClient();
    if(!client) return;
    let active=true;
    let eventSeen=false;
    function update(next:string|null){
      if(!active) return;
      if(ownerRef.current!==next){
        ownerRef.current=next;
        attempt.current++;
        setOwner(next);
        setConsent(false);
        setSavedReport(null);
        setStatus("idle");
      }
    }
    const {data}=client.auth.onAuthStateChange((_event,session)=>{
      eventSeen=true;update(session?.user.id??null);
    });
    void client.auth.getSession().then(({data})=>{if(!eventSeen)update(data.session?.user.id??null);}).catch(()=>{});
    return ()=>{active=false;attempt.current++;data.subscription.unsubscribe();};
  },[]);
  async function save(){
    if(!owner||!consent||status==="saving"||status==="saved") return;
    const target=owner,run=++attempt.current;
    setStatus("saving");
    try{
      const client=getSupabaseBrowserAuthClient();
      const session=await client?.auth.getSession();
      const token=session?.data.session?.access_token;
      if(!token||session?.data.session?.user.id!==target)throw new Error("AUTH");
      const response=await fetch("/api/vedic/d1/account",{method:"POST",cache:"no-store",
        headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
        body:JSON.stringify({...birth,displayName:name.trim(),consent:true})});
      const payload=await response.json();
      if(!response.ok||payload.ok!==true||typeof payload.report?.id!=="string")throw new Error("SAVE");
      if(attempt.current===run&&ownerRef.current===target){setSavedReport({id:payload.report.id,purchaseStatus:payload.report.purchaseStatus,amountToman:payload.report.amountToman});setStatus("saved");}
    }catch{if(attempt.current===run&&ownerRef.current===target)setStatus("error");}
  }
  return <div>
    <div className={reportStyles.reportAccountAuthDialog + " " + styles.accountSurface}>
      <SupabaseAuthPanel compact reconcileReports={false} />
    </div>
    {owner&&<div>
      <label><input type="checkbox" checked={consent} disabled={status==="saving"||status==="saved"}
        onChange={event=>setConsent(event.target.checked)} /> موافقم چارت و متن گزارش همین تولد به صورت خصوصی در حسابم ذخیره شود.</label>
      <button type="button" className={styles.purchasePrimary}
        disabled={!consent||status==="saving"||status==="saved"} onClick={save}>
        {status==="saving"?"در حال ذخیره…":status==="saved"?"گزارش ذخیره شد":"ذخیرهٔ خصوصی همین گزارش"}
      </button>
      {status==="saved"&&savedReport&&<><p role="status">گزارش به حساب تو متصل شد.</p>{savedReport.purchaseStatus!=="paid"&&<VedicD1PayButton reportId={savedReport.id} owner={owner} enabled={checkoutEnabled} pending={savedReport.purchaseStatus==="pending"} amount={savedReport.amountToman} />}<p><a href="/reports">بازگشت به گزارش‌های من</a></p></>}
      {status==="error"&&<p role="status">ذخیره ممکن نشد. چارت رایگان همچنان در دسترس است؛ دوباره امتحان کن.</p>}
    </div>}
  </div>;
}
