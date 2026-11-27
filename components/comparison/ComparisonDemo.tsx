"use client";

import { useEffect, useRef, useState } from "react";
import { ChartForm, type ComparisonFormHandle } from "@/components/ChartForm";
import type { ComparisonRecord } from "@/types/comparison-product";
import type { SynastryRelationshipContext } from "@/types/synastry-engine";
import styles from "./comparison.module.css";
import chartStyles from "@/app/chart/chart-shell.module.css";

type Time = "exact" | "unknown";
type SavedChart = { id: string; name: string; timeStatus: Time };
type Library = { account: boolean; charts: SavedChart[]; reports: { id: string }[] };
type Preview = { id: string; title: string; excerptFa: string | null };
type Report = { reportId: string; paid: boolean; preview: { chapters: Preview[] }; record?: ComparisonRecord };
type Invoice = { invoiceId: string; status: "pending" | "verified"; amountToman: number };
const contexts: [SynastryRelationshipContext, string][] = [["romantic","عاطفی"],["friendship","دوستی"],["family","خانوادگی"],["work","کاری"],["general","عمومی"]];
const errors: Record<string,string> = {
  CHART_UNAVAILABLE: "چارت انتخاب‌شده در دسترس نیست.",
  TIME_STATUS_INVALID: "دقت ساعت تولد معتبر نیست.",
  LOGIN_REQUIRED: "پیش از خرید وارد حساب آزمایشی شو.",
  RETRY_CONFLICT: "مشخصات تغییر کرده‌اند؛ دوباره تلاش کن.",
  CHART_CALCULATION_FAILED: "محاسبهٔ معتبر چارت کامل نشد.",
  DEMO_OPERATION_FAILED: "عملیات آزمایشی کامل نشد.",
  DEMO_SESSION_REQUIRED: "نشست آزمایشی در دسترس نیست؛ صفحه را تازه کن.",
  REPORT_UNAVAILABLE: "گزارش در دسترس نیست.",
  INVOICE_UNAVAILABLE: "فاکتور در دسترس نیست.",
  INVALID_REQUEST: "مشخصات هر دو نفر را بررسی کن.",
};

async function api<T>(action: string, fields: Record<string,unknown> = {}): Promise<T> {
  const response = await fetch("/api/compare/demo", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({action,...fields}), cache:"no-store" });
  const result = await response.json();
  if (!response.ok || result.ok !== true) throw new Error(errors[result.code] ?? "عملیات آزمایشی کامل نشد.");
  return result as T;
}

export function ComparisonDemo() {
  const [library,setLibrary] = useState<Library>({account:false,charts:[],reports:[]});
  const [ready,setReady] = useState(false);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [a,setA] = useState("");
  const [b,setB] = useState("");
  const [context,setContext] = useState<SynastryRelationshipContext>("romantic");
  const [report,setReport] = useState<Report|null>(null);
  const [invoice,setInvoice] = useState<Invoice|null>(null);
  const formA = useRef<ComparisonFormHandle>(null);
  const formB = useRef<ComparisonFormHandle>(null);
  const booted = useRef(false);
  const working = useRef(false);
  const pending = useRef<{signature:string;key:string}|null>(null);

  async function refresh() { const next=await api<Library>("init");setLibrary(next);return next; }
  function show(value: Report) {
    setReport(value);setInvoice(null);
    const url=new URL(window.location.href);
    url.searchParams.set("report",value.reportId);
    window.history.replaceState(null,"",url);
  }
  useEffect(()=>{
    if (booted.current) return;
    booted.current=true;
    void (async()=>{
      try {
        await refresh();
        const id=new URL(window.location.href).searchParams.get("report");
        if (id) show(await api<Report>("read",{reportId:id}));
        setReady(true);
      } catch(error) {setMessage(error instanceof Error ? error.message : "آزمایش در دسترس نیست.");}
    })();
  },[]);
  async function run(action:()=>Promise<void>) {
    if (working.current) return;
    working.current=true;setBusy(true);setMessage("");
    try {await action();}
    catch(error){setMessage(error instanceof Error ? error.message : "عملیات کامل نشد.");}
    finally{working.current=false;setBusy(false);}
  }
  async function generate() {
    await run(async()=>{
      const prepared=await Promise.all([
        a ? Promise.resolve(null) : formA.current?.prepare() ?? Promise.reject(new Error("مشخصات نفر اول را کامل کن.")),
        b ? Promise.resolve(null) : formB.current?.prepare() ?? Promise.reject(new Error("مشخصات نفر دوم را کامل کن.")),
      ]);
      let idA=a,idB=b;
      if (!idA && prepared[0]) {idA=(await api<{chartId:string}>("save-chart",{input:prepared[0].birthInput})).chartId;setA(idA);}
      if (!idB && prepared[1]) {idB=(await api<{chartId:string}>("save-chart",{input:prepared[1].birthInput})).chartId;setB(idB);}
      const next=await refresh();
      const ca=next.charts.find(c=>c.id===idA),cb=next.charts.find(c=>c.id===idB);
      if (!ca || !cb || ca.id===cb.id) throw new Error("دو چارت متفاوت انتخاب کن.");
      const signature=[ca.id,cb.id,context,ca.timeStatus,cb.timeStatus].join("|");
      if (pending.current?.signature!==signature) pending.current={signature,key:crypto.randomUUID()};
      show(await api<Report>("create",{input:{chartAId:ca.id,chartBId:cb.id,relationshipContext:context,chartABirthTimeStatus:ca.timeStatus,chartBBirthTimeStatus:cb.timeStatus,retryKey:pending.current.key}}));
      pending.current=null;await refresh();
    });
  }
  return <main dir="rtl" style={{maxWidth:960,margin:"24px auto",padding:16}}>
    <p role="status">محیط آزمایشی محلی — اطلاعات ساختگی وارد کن. ورود و پرداخت شبیه‌سازی شده‌اند؛ هیچ تراکنش واقعی انجام نمی‌شود.</p>
    <h1>تحلیل رابطه</h1>
    {message && <p role="alert" className={styles.errorMessage}>{message}</p>}
    {!ready ? <p>آماده‌سازی محیط آزمایشی…</p> : <>
      <p>{library.account ? "حساب آزمایشی فعال است" : "مهمان آزمایشی"}</p>
      <div className={styles.directPeopleGrid}>
        {(["a","b"] as const).map(slot=>{
          const first=slot==="a",value=first?a:b,other=first?b:a,set=first?setA:setB;
          return <section key={slot} className={`${styles.directEntryPanel} ${chartStyles.formPanel}`} aria-labelledby={`demo-person-${slot}`}>
            <h2 id={`demo-person-${slot}`}>{first?"نفر اول":"نفر دوم"}</h2>
            <label>چارت ذخیره‌شده
              <select disabled={busy} value={value} onChange={event=>set(event.target.value)}>
                <option value="">ورود مشخصات تازه</option>
                {library.charts.filter(c=>c.id!==other).map(c=><option key={c.id} value={c.id}>{c.name} · {c.timeStatus==="exact"?"ساعت دقیق":"ساعت نامعلوم"}</option>)}
              </select>
            </label>
            {!value && <ChartForm mode="comparison" comparisonHeadingId={`demo-person-${slot}`} comparisonFormRef={first?formA:formB} comparisonBusy={busy}/>}
          </section>;
        })}
      </div>
      <label>نوع رابطه <select disabled={busy} value={context} onChange={event=>setContext(event.target.value as SynastryRelationshipContext)}>{contexts.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
      <button disabled={busy} onClick={()=>void generate()}>بررسی رابطه</button>
      {library.reports.length>0 && <label>گزارش‌های آزمایشی <select disabled={busy} value={report?.reportId??""} onChange={event=>{const id=event.target.value;if(id)void run(async()=>show(await api<Report>("read",{reportId:id})));}}><option value="">انتخاب گزارش</option>{library.reports.map((item,index)=><option key={item.id} value={item.id}>گزارش {library.reports.length-index}</option>)}</select></label>}
      {report && <section aria-label="گزارش رابطه">
        <h2>{report.paid?"گزارش کامل":"پیش‌نمایش گزارش"}</h2>
        {report.paid && report.record?.reading.overviewParagraphsFa.map((p,i)=><p key={i}>{p}</p>)}
        {report.preview.chapters.map(chapter=>{
          const block=report.paid?report.record?.reading.chapters.find(c=>c.id===chapter.id)?.block:null;
          return <article key={chapter.id} className={styles.chapterStory}>
            <h3>{chapter.title}</h3>
            <p>{block?.humanExperience ?? chapter.excerptFa ?? "برای این فصل پیش‌نمایش معتبر کافی نیست."}</p>
            {block ? <>
              <p><strong>در زندگی روزمره</strong> {block.dailySituation}</p>
              <p><strong>در حالت سالم</strong> {block.strength}</p>
              <p><strong>زیر فشار</strong> {block.challenge}</p>
              <p><strong>یک پیشنهاد عملی</strong> {block.practicalStep}</p>
            </> : <p>ادامهٔ فصل پس از خرید در دسترس است.</p>}
          </article>;
        })}
        {!report.paid && <>
          {!library.account ? <button disabled={busy} onClick={()=>void run(async()=>{await api("login");await refresh();})}>ورود به حساب آزمایشی</button> :
          <button disabled={busy} onClick={()=>void run(async()=>{const next=await api<Invoice>("checkout",{reportId:report.reportId});if(next.status==="verified")show(await api<Report>("read",{reportId:report.reportId}));else setInvoice(next);})}>خرید آزمایشی گزارش کامل — ۵۰۰٬۰۰۰ تومان</button>}
          {invoice?.status==="pending" && <div role="group" aria-label="درگاه آزمایشی">
            <p>درگاه شبیه‌سازی‌شده — {invoice.amountToman.toLocaleString("fa-IR")} تومان (بدون دریافت وجه)</p>
            <button disabled={busy} onClick={()=>void run(async()=>show(await api<Report>("settle",{reportId:report.reportId,invoiceId:invoice.invoiceId,outcome:"verified"})))}>پرداخت موفق</button>
            <button disabled={busy} onClick={()=>void run(async()=>show(await api<Report>("settle",{reportId:report.reportId,invoiceId:invoice.invoiceId,outcome:"cancelled"})))}>انصراف</button>
          </div>}
        </>}
      </section>}
    </>}
  </main>;
}
