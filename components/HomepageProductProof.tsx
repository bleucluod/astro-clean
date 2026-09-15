// HALLEUS_SITEWIDE_SEO_HOMEPAGE_REFRESH_R1
import Link from "next/link";

import styles from "@/app/home.module.css";

const reportFeatures = [
  {
    title: "شروع شخصی",
    text: "گزارش با مهم‌ترین داستان‌ها و الگوهای خود چارت تو شروع می‌شود.",
  },
  {
    title: "لایه‌های عمیق‌تر",
    text: "گره‌های ماه، لیلیت، کایران و نقاط ویژه فقط وقتی برجسته می‌شوند که چیزی به خوانش اضافه کنند.",
  },
  {
    title: "زمان حال",
    text: "اگر بخش آسمان شخصی را انتخاب کنی، ترنزیت‌های مرتبط هم در کنار چارت تولدت خوانده می‌شوند.",
  },
] as const;

export function HomepageProductProof() {
  return (
    <article
      className={styles.reportPanel}
      id="report-preview"
      aria-label="معرفی گزارش شخصی چارت تولد هالیوس"
    >
      <header className={styles.reportPanelHeader}>
        <span className={styles.productBadge}>گزارش شخصی چارت تولد</span>
      </header>

      <h3>چارتت فقط خورشید و ماه نیست</h3>
      <p className={styles.reportPanelLead}>
        هالیوس از سیاره‌ها، رایزینگ، خانه‌ها و جنبه‌ها شروع می‌کند و اگر در چارتت
        مهم باشند، گره‌های ماه، لیلیت، کایران، سهم بخت، ورتکس و لایه‌های
        پیشرفته‌تر را هم وارد خوانش می‌کند.
      </p>
      <p className={styles.reportPanelLead}>
        هدف، فهرست‌کردن همه‌چیز نیست. مهم‌ترین الگوهای چارت کنار هم قرار می‌گیرند
        تا به‌جای چند معنی جدا، یک روایت شخصی و قابل‌خواندن داشته باشی.
      </p>

      <div className={styles.reportLayerList} aria-label="ویژگی‌های گزارش شخصی">
        {reportFeatures.map((feature) => (
          <div key={feature.title}>
            <p>
              <strong>{feature.title}</strong>
              <small>{feature.text}</small>
            </p>
          </div>
        ))}
      </div>

      <p className={styles.reportLimitNote}>
        اگر ساعت تولدت دقیق نباشد، هالیوس بخش‌های وابسته به ساعت را با محدودیت
        روشن نشان می‌دهد.
      </p>

      <div className={styles.reportActions}>
        <Link className={styles.primaryButton} href="/chart">
          ساخت گزارش شخصی
          <span aria-hidden="true">←</span>
        </Link>
        <Link className={styles.secondaryButton} href="/product">
          دیدن نمونه گزارش
        </Link>
      </div>
    </article>
  );
}