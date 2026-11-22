/**
 * Pure display component for the server-computed FREE D1 view.
 * The SVG is decorative; the complete 9-body table is the accessible source.
 */
import type { VedicD1NorthView } from '@/lib/vedic/vedic-d1-north-layout';
import { VEDIC_D1_NORTH_GRID_PATH } from '@/lib/vedic/vedic-d1-north-layout';
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
      <h2 id="vedic-d1-north-title" className={styles.heading}>چارت ودیک (راشی D1)</h2>
      <div className={styles.summary} aria-label="خلاصهٔ چارت ودیک">
        <div className={styles.summaryItem}>
          <span>طالع (لاگنا)</span>
          <strong>{view.canDrawHouses ? view.houses[0].signNameFa : 'نزدیک مرز نشان'}</strong>
        </div>
        <div className={styles.summaryItem}>
          <span>نشان ماه</span>
          <strong>{moon.signNameFa ?? 'نزدیک مرز نشان'}</strong>
        </div>
        <div className={styles.summaryItem}>
          <span>ناکشاترای ماه</span>
          <strong>{view.moonNakshatra.nameFa ?? 'نزدیک مرز ناکشاترا'}</strong>
          <small>پادا: {view.moonNakshatra.pada === null ? 'نامطمئن' : fa(view.moonNakshatra.pada)}</small>
        </div>
      </div>
      {view.canDrawHouses ? (
        <figure className={styles.figure}>
          <figcaption className={styles.caption}>
            نمودار شمال هند؛ جای خانه‌ها ثابت است. «خانه» شمارهٔ بخش و «نشان» شمارهٔ برج آن است؛ شمارهٔ نشان با خانه یکی نیست.
            برای خواندن همهٔ سیاره‌ها، از جدول زیر استفاده کن.
          </figcaption>
          <div className={styles.svgScroll} role="region" tabIndex={0} aria-label="نمودار ودیک، قابل پیمایش افقی">
            <svg className={styles.svg} viewBox="0 0 480 480" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
              <rect x="1" y="1" width="478" height="478" rx="2" className={styles.frame} />
              <path d={VEDIC_D1_NORTH_GRID_PATH} className={styles.lines} />
              {view.houses.map(house => {
                const first = house.placements[0];
                const additional = house.placements.length - 1;
                return (
                  <g key={house.houseNumber}>
                    <text x={house.x} y={house.y - 21} className={styles.houseText} textAnchor="middle">خانه {fa(house.houseNumber)}</text>
                    <text x={house.x} y={house.y - 1} className={styles.signText} textAnchor="middle">نشان {fa(house.signNumber)}</text>
                    <text x={house.x} y={house.y + 18} className={styles.bodyText} textAnchor="middle">{first?.labelFa ?? '—'}</text>
                    {additional > 0 && <text x={house.x} y={house.y + 35} className={styles.countText} textAnchor="middle">+{fa(additional)} سیاره</text>}
                  </g>
                );
              })}
            </svg>
          </div>
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
              <td>{row.signNameFa === null ? 'مرزی؛ نامطمئن' : `${row.signNameFa} (${fa(row.signIndex! + 1)})`}</td>
              <td><bdi>{degrees(row.degreeInSign)}</bdi></td>
              <td>{row.houseNumber === null ? 'مرزی؛ نامطمئن' : fa(row.houseNumber)}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <p className={styles.legend}>راهو بر اساس گرهٔ میانگین و کیتو در نقطهٔ مقابل آن محاسبه می‌شود. این نمودار فقط خروجیِ یک موتور عددیِ تأییدشده را باید نمایش دهد.</p>
    </section>
  );
}
