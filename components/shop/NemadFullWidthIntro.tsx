import styles from './product-detail.module.css';

/** Full-width product overview shared by all 12 Nemad Man pages. */
export function NemadFullWidthIntro({ introduction }: { introduction: string }) {
  return <section className={styles.nemadWideOverview} aria-label="معرفی و مشخصات نماد من">
    <p className={styles.nemadWideIntroduction}>{introduction}</p>
    <div className={styles.nemadWideSpecifications}>
      <span>محاسبهٔ نشان خورشیدی بر اساس تاریخ تولد</span>
      <span>چاپ مات روی شاسی بدون قاب در سه اندازه</span>
    </div>
  </section>;
}
