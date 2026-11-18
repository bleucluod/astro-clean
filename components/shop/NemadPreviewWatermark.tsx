import type { ReactNode } from 'react';
import styles from './nemad-preview-watermark.module.css';

/** Customer-facing preview only; never wrap print/export artwork. */
export function NemadPreviewWatermark({ children, theme }: {
  children: ReactNode;
  theme: 'dark' | 'light';
}) {
  return <span className={styles.surface} data-theme={theme}>
    {children}
    <span className={styles.marks} aria-hidden="true">
      <span className={`${styles.seal} ${styles.first}`}>
        <span className={styles.brand} dir="ltr">HALLEUS</span>
        <span className={styles.preview} dir="rtl" lang="fa">پیش‌نمایش</span>
      </span>
      <span className={`${styles.seal} ${styles.second}`}>
        <span className={styles.brand} dir="ltr">HALLEUS</span>
        <span className={styles.preview} dir="rtl" lang="fa">پیش‌نمایش</span>
      </span>
    </span>
  </span>;
}
