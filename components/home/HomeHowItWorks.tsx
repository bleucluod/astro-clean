"use client";

import { useState } from "react";

import styles from "@/app/home.module.css";

const steps = [
  {
    number: "۰۱",
    title: "اطلاعات تولد را وارد کن",
    description:
      "تاریخ، ساعت و شهر تولد را بنویس یا روشن کن که ساعت دقیق را نمی‌دانی.",
    status: "داده ورودی",
    detail: "تقویم شمسی یا میلادی · شهر معتبر · ساعت معلوم یا نامعلوم",
  },
  {
    number: "۰۲",
    title: "هالیوس چارت را محاسبه می‌کند",
    description:
      "جایگاه‌ها، خانه‌ها، جنبه‌ها و داده‌های لازم از همان اطلاعات ساخته می‌شوند.",
    status: "موتور محاسبه",
    detail: "جایگاه سیاره‌ها · رایزینگ · خانه‌ها · جنبه‌ها · محدودیت‌ها",
  },
  {
    number: "۰۳",
    title: "نتیجه فارسی را بخوان",
    description:
      "گزارش تولد، تحلیل رابطه یا آسمان امروز را مرحله‌به‌مرحله و با مرزهای روشن مرور کن.",
    status: "خروجی قابل‌مرور",
    detail: "روایت فارسی · ردپای محاسبه · نکات فنی · استفاده مسئولانه",
  },
] as const;

export function HomeHowItWorks() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeStep = steps[activeIndex];

  return (
    <section className={styles.howSection} aria-labelledby="how-title">
      <header className={styles.sectionHeaderSplit}>
        <div>
          <h2 id="how-title">از اطلاعات تولد تا یک نتیجه قابل‌خواندن</h2>
        </div>
        <p>
          هر مرحله مشخص است: داده وارد می‌شود، محاسبه انجام می‌شود و نتیجه با
          محدودیت‌های واقعی خودش نمایش داده می‌شود.
        </p>
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
              <i /> مسیر محاسبه هالیوس
            </span>
            <div aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
          </div>

          <div className={styles.howCanvasBody}>
            <span className={styles.howCanvasStatus}>{activeStep.status}</span>
            <strong>{activeStep.title}</strong>
            <p>{activeStep.detail}</p>

            <div className={styles.howProgress} aria-hidden="true">
              {steps.map((step, index) => (
                <span
                  className={index <= activeIndex ? styles.howProgressActive : undefined}
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
