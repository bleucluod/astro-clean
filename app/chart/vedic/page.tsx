import type { Metadata } from "next";
import Link from "next/link";
import { VedicD1GuestForm } from "@/components/vedic/VedicD1GuestForm";
import styles from "@/components/vedic/vedic-d1-guest.module.css";

// Keep the new guest route noindex until the combined-app/browser acceptance passes.
export const metadata: Metadata = {
  title: "چارت تولد ودیک | هالیوس",
  description: "آشنایی با چارت تولد ودیک و شرایط لازم برای محاسبهٔ طالع و ناکشاترای ماه.",
  robots: { index: false, follow: false },
};

export default function VedicD1Page() {
  return (
    <div className={styles.page} dir="rtl">
      <nav className={styles.breadcrumb} aria-label="مسیر صفحه">
        <Link href="/chart">چارت تولد غربی</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">چارت ودیک</span>
      </nav>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>راشی · D1</p>
        <h1>چارت تولد ودیک</h1>
        <p className={styles.lead}>چارت ودیک از دایرةالبروج سایدرئال و مبنای لاهیری استفاده می‌کند. در این روش، جایگاه نشان‌ها و خانه‌ها ممکن است با چارت غربی تو فرق داشته باشد.</p>
        <p className={styles.notice}>محاسبهٔ عددی ودیک با نمونه‌های مرجع بررسی شده است. این مسیر هنوز در نسخهٔ آزمایشی قرار دارد و برای انتشار عمومی تأیید نشده است.</p>
      </header>
      <section aria-label="فرم چارت تولد ودیک">
        <VedicD1GuestForm />
      </section>
      <section className={styles.explanation} aria-labelledby="vedic-method-heading">
        <h2 id="vedic-method-heading">در نتیجهٔ رایگان چه چیزی می‌بینی؟</h2>
        <p>در نتیجهٔ رایگان، طالع (لاگنا)، نشان ماه، ناکشاترا و پادای ماه، نمودار دوازده‌خانهٔ شمال هند و جدول متنی موقعیت‌ها نمایش داده می‌شوند.</p>
        <p>بدون ساعت دقیق تولد نمی‌توان طالع و خانه‌های معتبر محاسبه کرد؛ به‌جای حدس‌زدن، باید محدودیت را توضیح داد.</p>
      </section>
    </div>
  );
}
