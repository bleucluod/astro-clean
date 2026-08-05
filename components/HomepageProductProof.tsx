import Link from "next/link";

import styles from "@/app/home.module.css";
import {
  HOME_REPORT_PREVIEW_LAYERS,
  HOME_REPORT_PREVIEW_SECTIONS,
} from "@/lib/report-preview/homepage-report-preview";

export function HomepageProductProof() {
  const preview = HOME_REPORT_PREVIEW_SECTIONS[0];

  return (
    <article
      className={styles.reportPanel}
      id="report-preview"
      aria-label="نمونه کوتاه گزارش هالیوس"
    >
      <header className={styles.reportPanelHeader}>
        <span className={styles.productBadge}>گزارش تولد فارسی</span>
        <span className={styles.calculationBadge}>ردپای محاسبه محفوظ</span>
      </header>

      <h3>چارت تولد فقط یک جدول نیست</h3>
      <p className={styles.reportPanelLead}>
        گزارش با یک تصویر کلی شروع می‌شود و بعد خورشید، ماه، رایزینگ، خانه‌ها،
        جنبه‌ها و الگوهای برجسته را در فصل‌هایی مرتبط کنار هم می‌گذارد.
      </p>

      <div className={styles.reportPreviewWindow}>
        <div className={styles.reportPreviewToolbar} aria-hidden="true">
          <div>
            <span />
            <span />
            <span />
          </div>
          <small>نمونه گزارش هالیوس</small>
        </div>

        {preview ? (
          <div className={styles.reportPreviewContent}>
            <span>تصویر کلی گزارش</span>
            <h4>{preview.title}</h4>
            <p>{preview.body}</p>
            <div className={styles.reportEvidence}>
              <strong>ردپای محاسبه</strong>
              <span>{preview.evidence}</span>
            </div>
            <blockquote>{preview.reflection}</blockquote>
          </div>
        ) : null}
      </div>

      <div className={styles.reportLayerList} aria-label="ساختار گزارش کامل">
        {HOME_REPORT_PREVIEW_LAYERS.map((layer) => (
          <div key={layer.label}>
            <p>
              <strong>{layer.label}</strong>
              <small>{layer.description}</small>
            </p>
          </div>
        ))}
      </div>

      <p className={styles.reportLimitNote}>
        اگر ساعت تولد نامعلوم باشد، محدودیت رایزینگ و خانه‌ها داخل گزارش پنهان
        نمی‌شود.
      </p>

      <div className={styles.reportActions}>
        <Link className={styles.secondaryButton} href="/product">
          داخل گزارش چه می‌بینی؟
        </Link>
        <Link className={styles.primaryButton} href="/chart">
          ساخت گزارش شخصی
          <span aria-hidden="true">←</span>
        </Link>
      </div>
    </article>
  );
}
