import type { ReactNode } from 'react';
import styles from './nemad-preview-watermark.module.css';

/** Customer-facing preview only; never wrap print/export artwork. */
export function NemadPreviewWatermark({ children }: { children: ReactNode }) {
  return <span className={styles.surface}>
    {children}
    <span className={styles.marks} aria-hidden="true">
      <span>HALLEUS · پیش‌نمایش</span>
      <span>HALLEUS · پیش‌نمایش</span>
      <span>HALLEUS · پیش‌نمایش</span>
    </span>
  </span>;
}
