"use client";

import type { VedicD1LocalPreview } from "./VedicD1GuestSession";
import reportStyles from "@/components/report/human-first-report.module.css";
import styles from "./vedic-d1-guest.module.css";

/** Presentation only: the caller must already have an authorized manuscript. */
export function VedicD1FullReport({ manuscript }: { manuscript: VedicD1LocalPreview }) {
  function goToChapter(id: string) {
    const target = document.getElementById("vedic-full-" + id);
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: "start", behavior: "auto" });
  }

  return (
    <div className={reportStyles.adaptiveNarrative + " " + styles.fullNarrative}>
      <nav className={styles.fullContents} aria-label="فصل‌های گزارش کامل">
        <h2>فصل‌های گزارش تو</h2>
        {manuscript.chapters.map((chapter, index) => (
          <button key={chapter.id} type="button" onClick={() => goToChapter(chapter.id)}>
            <span aria-hidden="true">{(index + 1).toLocaleString("fa-IR")}</span>
            {chapter.title}
          </button>
        ))}
      </nav>
      {manuscript.chapters.map((chapter, index) => (
        <section key={chapter.id} id={"vedic-full-" + chapter.id}
          tabIndex={-1} className={reportStyles.adaptiveSection + " " + styles.fullChapter}
          aria-labelledby={"vedic-full-heading-" + chapter.id}>
          <header className={reportStyles.adaptiveSectionHeader}>
            <p className={reportStyles.eyebrow}>فصل {(index + 1).toLocaleString("fa-IR")} از ۴</p>
            <h2 id={"vedic-full-heading-" + chapter.id}>{chapter.title}</h2>
          </header>
          <div className={reportStyles.chapterParagraphs + " " + styles.fullParagraphs}>
            {chapter.paragraphsFa.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
          </div>
        </section>
      ))}
    </div>
  );
}
