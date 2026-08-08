import type { ChartRulershipProfile } from "@/lib/astrology/chart-rulership";
import styles from "./human-first-report.module.css";

export function ReportRulershipSection({
  profile,
}: {
  profile: ChartRulershipProfile;
}) {
  if (
    !profile.chartRuler &&
    profile.houseRulers.length === 0 &&
    profile.planetConditions.length === 0
  ) {
    return null;
  }

  return (
    <section
      aria-labelledby="report-rulership-title"
      className={styles.chartPatternSection}
      data-chart-rulership-version={profile.version}
      id="chart-rulership"
    >
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>حاکمیت‌ها و وضعیت سیاره‌ها</p>
        <h2 id="report-rulership-title">
          خانه‌ها چطور از مسیر سیاره‌هایشان به هم وصل می‌شوند؟
        </h2>
        <p>
          حاکمیت در این بخش برای ساختن ارتباط میان میدان‌های زندگی استفاده
          می‌شود. وضعیت کلاسیک سیاره هم فقط شیوهٔ بیان آن را توصیف می‌کند؛ نه
          آن را به رتبه‌بندی ارزش یا خوش‌شانسی تبدیل نمی‌کند.
        </p>
      </div>

      {!profile.hasReliableBirthTime ? (
        <div className={styles.emptyTechnical} role="note">
          ساعت تولد دقیق ثبت نشده؛ بنابراین حاکمان خانه‌ها و حاکم طالع در این
          خوانش وارد نتیجه‌گیری نمی‌شوند. وضعیت‌های مستقل از خانه همچنان قابل
          خواندن‌اند.
        </div>
      ) : null}

      {profile.chartRuler ? (
        <article className={styles.chartPatternCard}>
          <div className={styles.chartPatternCardHeading}>
            <span>۱</span>
            <div>
              <p>مسیر حاکم چارت</p>
              <h3>{profile.chartRuler.planetLabel}</h3>
            </div>
          </div>
          <p>{profile.chartRuler.pathSummary}</p>
          <details
            className={styles.technicalDisclosure}
            data-rulership-detail="chart-ruler-evidence"
          >
            <summary>پشتوانهٔ این مسیر</summary>
            <ul className={styles.chartPatternEvidence}>
              {profile.chartRuler.evidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </details>
        </article>
      ) : null}

      {profile.dispositorChain ? (
        <article className={styles.chartPatternCard}>
          <div className={styles.chartPatternCardHeading}>
            <span>۲</span>
            <div>
              <p>زنجیرهٔ حاکمیتی</p>
              <h3>مسیر انتقال جهت در چارت</h3>
            </div>
          </div>
          <p>{profile.dispositorChain.summary}</p>
        </article>
      ) : null}

      {profile.planetConditions.length > 0 ? (
        <details
          className={styles.technicalDisclosure}
          data-rulership-detail="planet-conditions"
        >
          <summary>وضعیت کلاسیک سیاره‌ها و شواهدشان</summary>
          <div className={styles.chartPatternGrid}>
            {profile.planetConditions.map((condition) => (
              <article
                className={styles.chartPatternCard}
                data-planet-dignity={condition.dignities.join("+")}
                key={condition.planetId}
              >
                <div className={styles.chartPatternCardHeading}>
                  <span>{condition.planetLabel.slice(0, 1)}</span>
                  <div>
                    <p>{condition.dignityLabel}</p>
                    <h3>
                      {condition.planetLabel} در {condition.signLabel}
                    </h3>
                  </div>
                </div>
                <p>{condition.expression}</p>
                {condition.majorAspect ? (
                  <p>
                    <strong>جنبهٔ نزدیک:</strong> {condition.majorAspect}
                  </p>
                ) : null}
                <ul className={styles.chartPatternEvidence}>
                  {condition.evidence.slice(0, 3).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </details>
      ) : null}

      {profile.houseRulers.length === 12 ? (
        <details
          className={styles.technicalDisclosure}
          data-rulership-detail="house-rulers"
        >
          <summary>ارتباط حاکم هر ۱۲ خانه</summary>
          <div className={styles.chartPatternGrid}>
            {profile.houseRulers.map((house) => (
              <article className={styles.chartPatternCard} key={house.house}>
                <div className={styles.chartPatternCardHeading}>
                  <span>{house.house.toLocaleString("fa-IR")}</span>
                  <div>
                    <p>{house.cuspSignLabel}</p>
                    <h3>
                      خانه {house.house.toLocaleString("fa-IR")} ←{" "}
                      {house.rulerPlanetLabel}
                    </h3>
                  </div>
                </div>
                <p>{house.summary}</p>
              </article>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
