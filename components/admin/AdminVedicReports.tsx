"use client";
import { useEffect, useState } from "react";
import { formatAdminDateTime } from "@/lib/admin/admin-date";
import styles from "./admin-console.module.css";

type Row={id:string;createdAt:string;status:"paid"|"pending"|"locked";amountToman:number|null;factor:string|null};
type Data={enabled:boolean;reports:Row[];hasMore:boolean};
export function AdminVedicReports({accessToken}:{accessToken:string}) {
  const [page,setPage]=useState(1);
  const [revision,setRevision]=useState(0);
  const [data,setData]=useState<Data|null>(null);
  const [error,setError]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    let active=true;
    if(!accessToken)return;
    void fetch("/api/admin/reports/vedic?page="+page,{cache:"no-store",headers:{authorization:`Bearer ${accessToken}`},signal:controller.signal})
      .then(async res=>{if(!res.ok)throw Error("READ");return res.json() as Promise<Data>;})
      .then(next=>{if(active){setData(next);setError(false);}})
      .catch(()=>{if(active){setData(null);setError(true);}});
    return()=>{active=false;controller.abort();};
  },[accessToken,page,revision]);
  function move(next:number){setData(null);setError(false);setPage(next);}
  return <section className={styles.reportRecentSection}>
    <h3>گزارش‌های خصوصی ودیک</h3>
    <p>فقط گزارش‌های ذخیره‌شده با رضایت کاربر؛ متن خصوصی، اطلاعات تولد و اطلاعات تماس در این نما نمایش داده نمی‌شوند.</p>
    <button type="button" onClick={()=>{setData(null);setError(false);setRevision(x=>x+1);}}>به‌روزرسانی</button>
    {error?<p className={styles.error}>دریافت گزارش‌های ودیک ممکن نشد.</p>:!data?<p role="status">در حال دریافت…</p>:!data.enabled?<p>ذخیرهٔ خصوصی فعال نیست.</p>:<>
      {!data.reports.length?<p>هنوز گزارشی ذخیره نشده است.</p>:<div className={styles.tableWrap}><table>
        <thead><tr><th>شناسه گزارش</th><th>تاریخ</th><th>وضعیت خرید</th><th>مبلغ (تومان)</th><th>فاکتور</th></tr></thead>
        <tbody>{data.reports.map(row=><tr key={row.id}><td><small>{row.id}</small></td><td>{formatAdminDateTime(row.createdAt)}</td><td>{row.status==="paid"?"پرداخت‌شده":row.status==="pending"?"در انتظار تأیید":"خریداری‌نشده"}</td><td>{row.amountToman?.toLocaleString("fa-IR")??"—"}</td><td>{row.factor??"—"}</td></tr>)}</tbody>
      </table></div>}
      {page>1&&<button type="button" onClick={()=>move(page-1)}>قبلی</button>}
      {data.hasMore&&<button type="button" onClick={()=>move(page+1)}>بعدی</button>}
    </>}
  </section>;
}
