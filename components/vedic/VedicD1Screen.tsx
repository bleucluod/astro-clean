"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import reportStyles from "@/components/report/human-first-report.module.css";
import { VedicD1GuestForm } from "./VedicD1GuestForm";
import { VedicD1GuestResult } from "./VedicD1GuestResult";
import { useVedicD1GuestSession } from "./VedicD1GuestSession";
import chartStyles from "@/app/chart/chart-shell.module.css";
import styles from "./vedic-d1-guest.module.css";

const LazySupabaseAuthPanel = dynamic(() => import("@/components/SupabaseAuthPanel").then(m => m.SupabaseAuthPanel), { ssr: false });

/** Keep both screens on /vedic. Only ephemeral React state holds birth data. */
export function VedicD1Screen({storageEnabled=false,checkoutEnabled=false}:{storageEnabled?:boolean;checkoutEnabled?:boolean}) {
  const { result, setResult } = useVedicD1GuestSession();
  const [showReport, setShowReport] = useState(false);
  const [showAccountPanel, setShowAccountPanel] = useState(false);

  function openReport() {
    setShowReport(true);
    window.scrollTo({ top: 0, behavior: "auto" });
  }
  function editBirth() {
    setResult(current => current?.kind === "timed" ? { ...current, localPreview: null } : current);
    setShowReport(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  if (showReport && result) return <VedicD1GuestResult onEdit={editBirth} storageEnabled={storageEnabled} checkoutEnabled={checkoutEnabled} />;

  return (
    <div className={chartStyles.page + " " + styles.vedicPage} dir="rtl">
      <header className={chartStyles.hero + " " + styles.vedicHero}>
        <div className={chartStyles.heroCopy}>
          <h1 className={chartStyles.heroTitle}>چارت تولد ودیک</h1>
        </div>
      </header>
      <section className={chartStyles.workspace + " " + styles.vedicWorkspace} aria-label="فرم چارت تولد ودیک">
        <div className={chartStyles.formPanel}>
          <VedicD1GuestForm onComplete={openReport} storageEnabled={storageEnabled} />
          {storageEnabled && <div className={"chart-account-option " + styles.entryAccount}>
            <label className="chart-account-option-toggle">
              <input type="checkbox" checked={showAccountPanel} onChange={event => setShowAccountPanel(event.target.checked)} />
              <span className="chart-account-option-copy"><strong>ورود یا ثبت‌نام در حساب هالیوس</strong></span>
            </label>
            {showAccountPanel && <div className={reportStyles.reportAccountAuthDialog + " " + styles.accountSurface}><LazySupabaseAuthPanel compact reconcileReports={false} /></div>}
          </div>}
        </div>
      </section>
      <section className={chartStyles.heroEditorial} aria-label="راهنمای چارت تولد ودیک">
        <h2>در چارت تولد ودیک رایگان چه می‌بینی؟</h2>
        <p className={chartStyles.editorialParagraph}>اگر تاریخ تولدت شمسی است، همان تاریخ شناسنامه‌ات را وارد کن؛ فرم تقویم میلادی را هم می‌پذیرد. نقشه‌ای که بعد از تکمیل فرم می‌بینی، در آسترولوژی هندی «راشی» یا D1 نام دارد. برای اولین نگاه، ماه را در جدول جایگاه‌ها پیدا کن و بعد همان نام را در نقشه ببین. به این ترتیب می‌توانی بدون حفظ کردن شکل نمودار شمال هند، از روی چارت خودت خواندنش را شروع کنی.</p>
      </section>
      <section className={chartStyles.heroEditorial}>
        <h2>چرا نشان ماه من با چارت غربی فرق دارد؟</h2>
        <p className={chartStyles.editorialParagraph}>اگر اطلاعات تولدت را در هر دو فرم یکسان وارد کرده‌ای و دو نام متفاوت می‌بینی، اول روش محاسبه را نگاه کن. هالیوس در چارت ودیک از روش سایدریال با مبنای لاهیری استفاده می‌کند. مبدأ نشان‌ها در این روش با چارت تروپیکال فرق دارد و این اختلاف می‌تواند جای ماه را از یک نشان به نشان کناری ببرد. برای مقایسه، تاریخ، ساعت و شهرت را در <Link href="/chart">چارت تولد غربی</Link> هم یکسان وارد کن.</p>
      </section>
      <section className={chartStyles.heroEditorial}>
        <h2>ساعت و شهر تولد کجای نقشه اثر می‌گذارند؟</h2>
        <p className={chartStyles.editorialParagraph}>اگر دنبال رایزینگت در چارت هندی می‌گردی، آن را با نام طالع یا «لاگنا» می‌بینی. برای پیدا کردن آن باید بدانیم در زمان تولدت کدام نشان از افق شهر تولد بالا می‌آمد. به همین دلیل اگر ساعت را نمی‌دانی، در فرم گزینهٔ «ساعت تولدم را نمی‌دانم» را انتخاب کن. در این حالت نقشهٔ شخصی و جدول خانه‌ها ساخته نمی‌شوند؛ ساعت حدسی می‌تواند طالع و خانه‌ها را جابه‌جا کند.</p>
      </section>
      <section className={chartStyles.heroEditorial}>
        <h2>در گزارش رایگان و تفسیر کامل چه می‌خوانی؟</h2>
        <p className={chartStyles.editorialParagraph}>در نسخهٔ رایگان نقشه، جدول جایگاه‌ها و یک خوانش کوتاه فارسی در اختیارت قرار می‌گیرد. اگر بخواهی ارتباط این جایگاه‌ها را دنبال کنی، گزارش کامل چهار فصل دارد. از لاگنا و سیارهٔ حاکم آن شروع می‌کنی، بعد به ماه و الگوی عاطفی می‌رسی، پیوند خانه‌ها را می‌خوانی و در فصل آخر برداشت‌ها را کنار هم می‌بینی. برای آشنایی با اصطلاحات هم می‌توانی <Link href="/wiki/free-vedic-birth-chart">راهنمای خواندن چارت ودیک</Link> را بخوانی.</p>
      </section>
    </div>
  );
}
