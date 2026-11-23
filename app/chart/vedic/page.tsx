import type { Metadata } from "next";
import Link from "next/link";
import { VedicD1GuestForm } from "@/components/vedic/VedicD1GuestForm";
import chartStyles from "../chart-shell.module.css";
import styles from "@/components/vedic/vedic-d1-guest.module.css";

// Keep the experimental guest route noindex until combined-app/browser acceptance.
export const metadata: Metadata = {
  title: "چارت تولد ودیک | هالیوس",
  description: "آشنایی با چارت تولد ودیک و شرایط محاسبهٔ طالع و ناکشاترای ماه.",
  robots: { index: false, follow: false },
};

export default function VedicD1Page() {
  return (
    <main className={chartStyles.page + " " + styles.vedicPage} dir="rtl">
      <nav className={styles.breadcrumb} aria-label="مسیر صفحه">
        <Link href="/chart">چارت تولد غربی</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">چارت ودیک</span>
      </nav>
      <header className={chartStyles.hero + " " + styles.vedicHero}>
        <div className={chartStyles.heroCopy}>
          <span className={chartStyles.heroKicker}>ساخت آنلاین نقشه تولد شخصی · راشی D1</span>
          <h1 className={chartStyles.heroTitle}>چارت تولد ودیک</h1>
          <p className={chartStyles.heroLead}>در روش ودیک، نقشهٔ تولد بر اساس دایرةالبروج سایدرئال و مبنای لاهیری محاسبه می‌شود. جای نشان‌ها و خانه‌ها ممکن است با چارت غربی تو متفاوت باشد.</p>
          <p className={styles.previewNotice}>محاسبهٔ عددی با نمونه‌های مرجع بررسی شده است؛ این مسیر هنوز آزمایشی است و برای انتشار عمومی تأیید نشده است.</p>
        </div>
      </header>
      <section className={chartStyles.workspace + " " + styles.vedicWorkspace} aria-label="فرم چارت تولد ودیک">
        <div className={chartStyles.formPanel}>
          <div className={chartStyles.formPanelHeading}>
            <span className={chartStyles.panelStep} aria-hidden="true">۰۱</span>
            <div>
              <span className={chartStyles.sectionEyebrow}>محاسبه چارت تولد</span>
              <h2>ساخت چارت ودیک با تاریخ شمسی یا میلادی</h2>
            </div>
          </div>
          <VedicD1GuestForm />
        </div>
      </section>
      <section className={chartStyles.education + " " + styles.explanation} aria-labelledby="vedic-method-heading">
        <h2 id="vedic-method-heading">در نتیجهٔ رایگان چه چیزی می‌بینی؟</h2>
        <p>طالع (لاگنا)، نشان ماه، ناکشاترا و پادای ماه، نمودار دوازده‌خانهٔ شمال هند و جدول متنی موقعیت‌ها نمایش داده می‌شوند.</p>
        <p>برای محاسبهٔ طالع و خانه‌های معتبر، ساعت و شهر دقیق لازم است؛ اگر داده‌ای مرزی باشد، عدم قطعیت نمایش داده می‌شود.</p>
      </section>
    </main>
  );
}
