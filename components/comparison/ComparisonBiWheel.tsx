"use client";

import { HalleusSynastryWheel } from "@/components/HalleusWheelCore";
import type { RealSynastryReport } from "@/types/synastry-engine";
import styles from "./comparison.module.css";

type ComparisonBiWheelProps = {
  report: RealSynastryReport;
};

export function ComparisonBiWheel({ report }: ComparisonBiWheelProps) {
  return (
    <section
      className={styles.wheelSection}
      aria-labelledby="comparison-wheel-title"
      data-halleus-wheel-adapter="synastry"
    >
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>چرخ مقایسه</p>
        <h2 id="comparison-wheel-title">دو چارت در یک قاب</h2>
        <p>
          حلقهٔ داخلی چارت اول و حلقهٔ بیرونی چارت دوم است. این نما از همان
          سیستم بصری چرخ هالیوس استفاده می‌کند و فقط داده‌های محاسبه‌شدهٔ همین
          گزارش را نمایش می‌دهد.
        </p>
      </div>
      <div className={styles.wheelFrame}>
        <HalleusSynastryWheel
          data={report.biWheel}
          chartALabel={report.chartA.label}
          chartBLabel={report.chartB.label}
          chartAHouses={report.chartA.houses}
          chartBHouses={report.chartB.houses}
        />
      </div>
    </section>
  );
}
