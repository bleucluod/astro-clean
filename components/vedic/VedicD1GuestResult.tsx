"use client";

import Link from "next/link";
import { VedicD1NorthChart } from "./VedicD1NorthChart";
import { useVedicD1GuestSession } from "./VedicD1GuestSession";
import chartStyles from "@/app/chart/chart-shell.module.css";
import styles from "./vedic-d1-guest.module.css";

/** A separate report surface; only the certified free API response can populate it. */
export function VedicD1GuestResult() {
  const { result } = useVedicD1GuestSession();

  return (
    <main className={chartStyles.page + " " + styles.vedicPage} dir="rtl">
      <nav className={styles.breadcrumb} aria-label="مسیر صفحه">
        <Link href="/chart/vedic">چارت تولد ودیک</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">گزارش رایگان</span>
      </nav>
      <header className={chartStyles.hero + " " + styles.vedicHero + " " + styles.resultHero}>
        <div className={chartStyles.heroCopy}>
          <span className={chartStyles.heroKicker}>راشی D1 · گزارش رایگان</span>
          <h1 className={chartStyles.heroTitle}>گزارش چارت تولد ودیک</h1>
          <p className={chartStyles.heroLead}>نمودار شمال هند، جایگاه سیاره‌ها و خوانش کوتاه فارسیِ چارت محاسبه‌شده.</p>
        </div>
      </header>
      {result ? (
        <section className={styles.freeResult + " " + styles.reportResult} aria-label="نتیجهٔ رایگان چارت ودیک">
          <div className={styles.reportWelcome}>
            <span className={styles.reportKicker}>گزارش شخصی تو</span>
            <h2 className={styles.resultGreeting}>{result.name}، این نقشهٔ آسمان توست</h2>
            <p className={styles.freeReading}>{result.reading.shortReading.textFa}</p>
          </div>
          <VedicD1NorthChart view={result.reading.view} />
          <div className={styles.reportFooter}>
            <p className={styles.resultPrivacy}>فصل‌های پرمیوم هنوز فعال نیستند. این نتیجه فقط خوانش رایگان است.</p>
            <Link className={styles.resultBackLink} href="/chart/vedic">ویرایش اطلاعات تولد</Link>
          </div>
        </section>
      ) : (
        <section className={styles.emptyResult} role="status">
          <h2>گزارشی برای نمایش پیدا نشد</h2>
          <p>این نسخهٔ آزمایشی گزارش را ذخیره نمی‌کند. اگر آدرس را مستقیم باز کرده‌ای یا صفحه را Refresh کرده‌ای، دوباره اطلاعات تولد را در فرم وارد و چارت را محاسبه کن.</p>
          <Link className={styles.resultBackLink} href="/chart/vedic">بازگشت به فرم ودیک</Link>
        </section>
      )}
      <p className={styles.afterword}>گزارش مهمان فعلاً فقط در حافظهٔ همین صفحهٔ مرورگر نگه داشته می‌شود و لینک عمومی یا ذخیرهٔ دائمی ندارد.</p>
    </main>
  );
}
