/**
 * Pure display component for the server-computed FREE D1 view.
 * The SVG is decorative; the complete 9-body table is the accessible source.
 */
import type { VedicD1NorthView } from '@/lib/vedic/vedic-d1-north-layout';
import { VEDIC_D1_NORTH_GRID_PATH, VEDIC_D1_DISPLAY_SIGNS_FA } from '@/lib/vedic/vedic-d1-north-layout';
import styles from './vedic-d1-north.module.css';

const formatter = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2, useGrouping: false });
const fa = (value: number) => formatter.format(value);
function degrees(value: number) {
  // Truncate, never round 29.999° into an apparent 30° in the preceding sign.
  return `${fa(Math.trunc(value * 100) / 100)}°`;
}

export function VedicD1NorthChart({ view }: { view: VedicD1NorthView }) {
  const moon = view.rows.find(row => row.id === 'moon')!;
  return (
    <section className={styles.root} dir="rtl" aria-labelledby="vedic-d1-north-title">
      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.eyebrow}>نقشهٔ شخصی · راشی D1</span>
          <h2 id="vedic-d1-north-title" className={styles.heading}>چارت ودیک تو</h2>
          <p className={styles.lead}>سه نشانهٔ کلیدی برای شروع خواندن نقشهٔ تولدت</p>
        </div>
        <span className={styles.sectionNumber} aria-hidden="true">۰۱</span>
      </div>
      <div className={styles.summary} aria-label="خلاصهٔ چارت ودیک">
        <div className={styles.summaryItem}>
          <span className={styles.summaryIndex} aria-hidden="true">۰۱</span>
          <span>رایزینگ (لاگنا)</span>
          <strong>{view.canDrawHouses ? VEDIC_D1_DISPLAY_SIGNS_FA[view.houses[0].signIndex] : 'نزدیک مرز نشان'}</strong>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryIndex} aria-hidden="true">۰۲</span>
          <span>نشان ماه</span>
          <strong>{moon.signIndex === null ? 'نزدیک مرز نشان' : VEDIC_D1_DISPLAY_SIGNS_FA[moon.signIndex]}</strong>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryIndex} aria-hidden="true">۰۳</span>
          <span>ناکشاترای ماه</span>
          <strong>{view.moonNakshatra.nameFa ?? 'نزدیک مرز ناکشاترا'}</strong>
          <small>پادا: {view.moonNakshatra.pada === null ? 'نامطمئن' : fa(view.moonNakshatra.pada)}</small>
        </div>
      </div>
      {view.canDrawHouses ? (
        <figure className={styles.figure}>
          <div className={styles.figureHeading}>
            <div>
              <span className={styles.figureEyebrow}>۱۲ خانهٔ ثابت</span>
              <h3>نقشهٔ شمال هند</h3>
            </div>
            <span className={styles.figureChip}>راشی · D1</span>
          </div>
          <div className={styles.svgScroll} role="region" tabIndex={0} aria-label="نمودار ودیک، قابل پیمایش افقی">
            <svg className={styles.svg} xmlLang="fa" viewBox="0 0 480 480" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
              <defs>
                <linearGradient id="vedic-d1-chart-paper" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#0b0d11" />
                  <stop offset="100%" stopColor="#11141a" />
                </linearGradient>
              </defs>
              <rect x="1" y="1" width="478" height="478" rx="8" className={styles.frame} />
              <polygon points="240,0 360,120 240,240 120,120" className={styles.lagnaHighlight} />
              <path d={VEDIC_D1_NORTH_GRID_PATH} className={styles.lines} />
              {view.houses.map(house => {
                const first = house.placements[0];
                const additional = house.placements.length - 1;
                return (
                  <g key={house.houseNumber}>
                    {first && <ellipse cx={house.x} cy={house.y + 13} rx={house.houseNumber === 1 ? 44 : 38} ry="17" className={house.houseNumber === 1 ? styles.lagnaSpot : styles.planetSpot} />}
                    <text x={house.x} y={house.y - 21} className={styles.houseText} textAnchor="middle" direction="rtl" unicodeBidi="isolate">خانه {fa(house.houseNumber)}</text>
                    <text x={house.x} y={house.y - 1} className={styles.signText} textAnchor="middle" direction="rtl" unicodeBidi="isolate">{VEDIC_D1_DISPLAY_SIGNS_FA[house.signIndex]}</text>
                    <text x={house.x} y={house.y + 18} className={styles.bodyText} textAnchor="middle" direction="rtl" unicodeBidi="isolate">{first?.labelFa ?? '·'}</text>
                    {additional > 0 && <text x={house.x} y={house.y + 35} className={styles.countText} textAnchor="middle" direction="rtl" unicodeBidi="isolate">{fa(additional)} دیگر</text>}
                  </g>
                );
              })}
            </svg>
          </div>
          <figcaption className={styles.caption}>
            خانه‌ها در نمودار شمال هند جای ثابتی دارند؛ نشان‌ها با طالع تغییر می‌کنند. خانهٔ اول با رنگ ملایم مشخص شده است.
            جایگاه کامل هر ۹ جرم و گره را در جدول پایین ببین.
          </figcaption>
        </figure>
      ) : (
        <p className={styles.notice} role="status">طالع به مرز دو نشان نزدیک است؛ نمایش قطعی خانه‌ها قابل اتکا نیست. موقعیت سیاره‌ها در جدول زیر آمده‌اند.</p>
      )}
      {view.boundaryRows.length > 0 && (
        <p className={styles.notice} role="status">
          موقعیت مرزی {fa(view.boundaryRows.length)} سیاره با خانهٔ قطعی نمایش داده نمی‌شود؛ همهٔ آن‌ها در جدول حفظ شده‌اند.
        </p>
      )}
      {view.moonNakshatra.cautionFa && <p className={styles.notice}>{view.moonNakshatra.cautionFa}</p>}
      <div className={styles.tableHeading}>
        <div>
          <span className={styles.eyebrow}>جزئیات چارت</span>
          <h3>موقعیت سیاره‌ها و گره‌ها</h3>
        </div>
        <span className={styles.tableCount}>۹ موقعیت</span>
      </div>
      <div className={styles.tableScroll} role="region" tabIndex={0} aria-label="جدول موقعیت سیاره‌های ودیک، قابل پیمایش افقی">
        <table className={styles.table}>
          <caption>موقعیت همهٔ ۹ جرم و گره در چارت ودیک</caption>
          <thead><tr>
            <th scope="col">سیاره یا گره</th>
            <th scope="col">نشان</th>
            <th scope="col">درجه در نشان</th>
            <th scope="col">خانه</th>
          </tr></thead>
          <tbody>
            {view.rows.map(row => <tr key={row.id}>
              <th scope="row">{row.labelFa}</th>
              <td>{row.signIndex === null ? 'مرزی؛ نامطمئن' : `${VEDIC_D1_DISPLAY_SIGNS_FA[row.signIndex]} (${fa(row.signIndex + 1)})`}</td>
              <td><bdi>{degrees(row.degreeInSign)}</bdi></td>
              <td>{row.houseNumber === null ? 'مرزی؛ نامطمئن' : fa(row.houseNumber)}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <p className={styles.legend}>راهو بر اساس گرهٔ میانگین و کیتو در نقطهٔ مقابل آن محاسبه می‌شود. </p>
    </section>
  );
}
