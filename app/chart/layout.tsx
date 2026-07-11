import type { ReactNode } from "react";

import styles from "./chart-shell.module.css";

type ChartLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function ChartLayout({ children }: ChartLayoutProps) {
  return (
    <div
      className={styles.page}
      data-chart-visual-shell="homepage-aligned"
      data-product-surface="Halleus Chart"
    >
      <header className={styles.intro} aria-label="شروع ساخت گزارش تولد">
        <div className={styles.introGlow} aria-hidden="true" />

        <div className={styles.introCopy}>
          <span className={styles.eyebrow}>گزارش تولد شخصی تو</span>

          <p className={styles.title}>
            نقشه‌ی آسمانِ لحظه‌ی تولدت را بساز.
          </p>

          <p className={styles.lead}>
            تاریخ، ساعت و شهر تولدت را وارد کن تا هالیوس چارت را محاسبه
            کند و گزارش فارسی تو را بسازد.
          </p>

          <div className={styles.steps} aria-label="مراحل ساخت گزارش">
            <span>
              <b>۱</b>
              اطلاعات تولد
            </span>
            <span>
              <b>۲</b>
              محاسبه‌ی چارت
            </span>
            <span>
              <b>۳</b>
              گزارش فارسی
            </span>
          </div>
        </div>

        <div className={styles.visual} aria-hidden="true">
          <span className={styles.orbitOuter} />
          <span className={styles.orbitInner} />
          <span className={styles.sun} />
          <span className={styles.moon}>☾</span>
          <span className={styles.starA}>✦</span>
          <span className={styles.starB}>✧</span>
          <span className={styles.signA}>♓</span>
          <span className={styles.signB}>♌</span>
          <span className={styles.signC}>♎</span>
        </div>
      </header>

      <div className={styles.formStage}>{children}</div>
    </div>
  );
}
