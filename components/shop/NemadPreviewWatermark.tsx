import type { ReactNode } from 'react';
import { nemadPreviewEstedadFontClassName } from './NemadManBahmanArtwork';
import styles from './nemad-preview-watermark.module.css';

type ZoomText = { name: string; date: string; sign: string };

/** Customer-facing preview only; never wrap print/export artwork.
 * Zoom text is HTML to avoid mobile WebKit's SVG Persian shaping defects. */
export function NemadPreviewWatermark({ children, theme, zoomText }: {
  children: ReactNode;
  theme: 'dark' | 'light';
  zoomText?: ZoomText;
}) {
  const length = zoomText ? Array.from(zoomText.name).length : 0;
  const nameSize = length > 16 ? 46 : length > 9 ? 58 : 72;
  const nameFontSize = (nameSize * .9 / 9).toFixed(3) + 'cqw';
  const latinName = zoomText ? /^[\x20-\x7E]+$/.test(zoomText.name) : false;

  return <span className={styles.surface} data-theme={theme}
    data-zoom-text={zoomText ? 'true' : undefined}>
    {children}
    {zoomText ? <span className={[styles.zoomTypography, nemadPreviewEstedadFontClassName].join(' ')}
      aria-hidden="true">
      <span className={styles.zoomSign} dir="rtl" lang="fa">{zoomText.sign}</span>
      <span className={styles.zoomName} dir={latinName ? 'ltr' : 'rtl'}
        lang={latinName ? 'en' : 'fa'} style={{ fontSize: nameFontSize }}>{zoomText.name}</span>
      <span className={styles.zoomDate} dir="rtl" lang="fa">{zoomText.date}</span>
    </span> : null}
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
