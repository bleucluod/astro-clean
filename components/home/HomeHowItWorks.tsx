"use client";

// HALLEUS_SITEWIDE_SEO_HOMEPAGE_REFRESH_R1
import { useState } from "react";

import styles from "@/app/home.module.css";

const steps = [
  {
    number: "۰۱",
    title: "۱. اطلاعات تولدت را وارد کن",
    description:
      "روز و شهر تولدت را انتخاب کن و اگر ساعت دقیق را می‌دانی، آن را وارد کن. اگر نمی‌دانی، گزینهٔ ساعت نامشخص را انتخاب کن تا بخش‌های وابسته به آن با همان محدودیت خوانده شوند.",
  },
  {
    number: "۰۲",
    title: "۲. چارت را ببین",
    description:
      "هالیوس جایگاه سیاره‌ها و جنبه‌های اصلی را از اطلاعات تولدت محاسبه می‌کند. خانه‌ها و محورهایی که به ساعت نیاز دارند تنها با اطلاعات زمانی قابل‌اتکا معنا پیدا می‌کنند.",
  },
  {
    number: "۰۳",
    title: "۳. گزارش فارسی‌ات را بخوان",
    description:
      "اول سراغ الگوهای اصلی برو و بعد هرجا خواستی درجه‌ها، خانه‌ها، جنبه‌ها و توضیح‌های تکمیلی را دنبال کن. لازم نیست برای فهمیدن شروع گزارش همهٔ اصطلاحات آسترولوژی را از قبل بلد باشی.",
  },
] as const;

export function HomeHowItWorks() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeStep = steps[activeIndex];

  return (
    <section className={styles.howSection} aria-labelledby="how-title">
      <header className={styles.sectionHeaderSplit}>
        <div>
          <h2 id="how-title">سه قدم تا گزارش</h2>
        </div>
        <p>{activeStep.description}</p>
      </header>

      <div className={styles.howGrid}>
        <div className={styles.howSteps} role="list" aria-label="مراحل کار هالیوس">
          {steps.map((step, index) => {
            const isActive = activeIndex === index;
            return (
              <button
                aria-pressed={isActive}
                className={isActive ? styles.howStepActive : styles.howStep}
                key={step.number}
                onClick={() => setActiveIndex(index)}
                type="button"
              >
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.description}</p>
                </div>
                <i aria-hidden="true" />
              </button>
            );
          })}
        </div>

        <div className={styles.howCanvas} aria-live="polite">
          <div className={styles.howCanvasHeader}>
            <span>
              <i /> گام {activeStep.number}
            </span>
            <div aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
          </div>

          <div className={styles.howCanvasBody}>
            <span className={styles.howCanvasStatus}>گام {activeStep.number}</span>
            <strong>{activeStep.title}</strong>
            <p>{activeStep.description}</p>

            <div className={styles.howProgress} aria-hidden="true">
              {steps.map((step, index) => (
                <span
                  className={
                    index <= activeIndex ? styles.howProgressActive : undefined
                  }
                  key={step.number}
                />
              ))}
            </div>

            <div className={styles.howOrbitVisual} aria-hidden="true">
              <span />
              <span />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}