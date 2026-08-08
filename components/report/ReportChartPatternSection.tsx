import type { ChartPatternProfile } from "@/lib/astrology/chart-patterns";
import styles from "./human-first-report.module.css";

const KIND_LABELS: Record<
  ChartPatternProfile["patterns"][number]["kind"],
  string
> = {
  "sign-stellium": "تمرکز در یک برج",
  "house-stellium": "تمرکز در یک خانه",
  "t-square": "الگوی تنش سه‌نقطه‌ای",
  "grand-trine": "الگوی هماهنگ سه‌نقطه‌ای",
  "grand-cross": "الگوی تنش چهار‌نقطه‌ای",
};

export function ReportChartPatternSection({
  profile,
}: {
  profile: ChartPatternProfile;
}) {
  if (profile.patterns.length === 0) return null;

  const visiblePatterns = profile.patterns.slice(0, 4);

  return (
    <section
      aria-labelledby="report-chart-patterns-title"
      className={styles.chartPatternSection}
      data-chart-pattern-version={profile.version}
      id="chart-patterns"
    >
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>الگوهای چندسیاره‌ای</p>
        <h2 id="report-chart-patterns-title">
          وقتی چند تماس یک داستان واحد می‌سازند
        </h2>
        <p>
          این بخش فقط الگوهایی را نشان می‌دهد که چند جایگاه یا جنبهٔ واقعی را
          هم‌زمان به هم وصل می‌کنند. هر تماسِ جدا دوباره تکرار نشده است.
        </p>
      </div>

      <div className={styles.chartPatternGrid}>
        {visiblePatterns.map((pattern, index) => (
          <article
            className={styles.chartPatternCard}
            data-chart-pattern-kind={pattern.kind}
            key={pattern.id}
          >
            <div className={styles.chartPatternCardHeading}>
              <span>{(index + 1).toLocaleString("fa-IR")}</span>
              <div>
                <p>{KIND_LABELS[pattern.kind]}</p>
                <h3>{pattern.title}</h3>
              </div>
            </div>

            <p>{pattern.summary}</p>

            <ul className={styles.chartPatternEvidence}>
              {pattern.evidence.slice(0, 3).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <details className={styles.chartPatternTechnical}>
              <summary>ساختار دقیق این الگو</summary>
              <p>{pattern.technicalSummary}</p>
              <p>
                سیاره‌های درگیر: {pattern.participantLabels.join("، ")}
              </p>
            </details>
          </article>
        ))}
      </div>

      {profile.patterns.length > visiblePatterns.length ? (
        <p className={styles.chartPatternMoreNote}>
          الگوهای معتبر دیگر در بخش «چارت و جزئیات» به‌طور کامل فهرست شده‌اند.
        </p>
      ) : null}
    </section>
  );
}
