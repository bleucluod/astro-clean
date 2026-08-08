import type { ChartRulershipProfile } from "@/lib/astrology/chart-rulership";
import type { ValidatedSupplementaryPointsProfile } from "@/lib/astrology/validated-supplementary-points";
import styles from "./human-first-report.module.css";

export function ReportSupplementaryPointsSection({
  profile,
  rulership,
}: {
  profile: ValidatedSupplementaryPointsProfile;
  rulership: ChartRulershipProfile;
}) {
  const fortune = profile.partOfFortune;
  if (!fortune) return null;

  const houseField = rulership.houseRulers.find(
    (item) => item.house === fortune.house,
  )?.houseField;

  return (
    <section
      aria-labelledby="report-supplementary-points-title"
      className={styles.chartPatternSection}
      data-validated-supplementary-points={profile.version}
      id="supplementary-points"
    >
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>نقطهٔ تکمیلی معتبر</p>
        <h2 id="report-supplementary-points-title">
          سهم سعادت؛ جایی که هماهنگی طبیعی‌تر می‌شود
        </h2>
        <p>
          این نقطه از طالع، خورشید و ماه محاسبه می‌شود و فقط وقتی ساعت تولد
          معتبر باشد وارد خوانش می‌شود. در هالیوس از آن برای دیدن زمینه‌های
          روان‌تر تجربه استفاده می‌کنیم، نه برای وعدهٔ شانس یا نتیجهٔ قطعی.
        </p>
      </div>

      <article className={styles.chartPatternCard}>
        <div className={styles.chartPatternCardHeading}>
          <span>⊕</span>
          <div>
            <p>{fortune.sect === "day" ? "چارت روز" : "چارت شب"}</p>
            <h3>
              {fortune.signLabel} · خانه {fortune.house.toLocaleString("fa-IR")}
            </h3>
          </div>
        </div>
        <p>{fortune.summary}</p>
        {houseField ? (
          <p>
            <strong>میدان زندگی:</strong> {houseField}
          </p>
        ) : null}
        <details
          className={styles.technicalDisclosure}
          data-supplementary-point-detail="part-of-fortune"
        >
          <summary>فرمول و پشتوانهٔ محاسبه</summary>
          <ul className={styles.chartPatternEvidence}>
            {fortune.evidence.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
      </article>
    </section>
  );
}
