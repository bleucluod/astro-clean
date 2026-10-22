import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BirthChartPromptBuilder } from "@/components/wiki/BirthChartPromptBuilder";
import styles from "../wiki.module.css";

export const metadata: Metadata = {
  title: "پیش‌نمایش فرم پرامپت چارت تولد | هالیوس",
  robots: { index: false, follow: false },
};

// Local visual QA only. Never expose this preview in a production runtime.
export default function PromptBuilderPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <main className={`${styles.page} ${styles.articlePage}`} dir="rtl">
      <div className={styles.articleLayout}>
        <article className={styles.articleMain}>
          <header className={styles.articleHero}>
            <span className={styles.sectionKicker}>پیش‌نمایش محلی · بدون دیتابیس</span>
            <h1>ساخت پرامپت شخصی چارت تولد</h1>
            <p>
              این صفحه فقط برای بررسی فرم مقالهٔ «تفسیر چارت تولد با هوش مصنوعی»
              در محیط توسعه است؛ مقالهٔ منتشرشده و دیتابیس را تغییر نمی‌دهد.
            </p>
          </header>
          <BirthChartPromptBuilder />
        </article>
      </div>
    </main>
  );
}
