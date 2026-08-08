import type {
  WholeChartLifeArea,
  WholeChartSynthesisChapter,
  WholeChartSynthesisProfile,
} from "@/lib/astrology/whole-chart-synthesis";
import styles from "./human-first-report.module.css";

const INTERNAL_SYNTHESIS_MARKERS = [
  "رتبه‌بندی",
  "موتور برجستگی",
  "این فصل فقط",
  "فقط چون",
  "انتخاب شده",
  "در میان امضاهای اصلی",
  "این حوزه از رابطهٔ این عوامل ساخته می‌شود",
  "هر کارت فقط وقتی",
] as const;

export function ReportWholeChartSynthesis({
  profile,
}: {
  profile: WholeChartSynthesisProfile;
}) {
  const fixed = profile.fixedChapters.filter((chapter) => chapter.available);
  const dynamic = profile.dynamicChapters.filter((chapter) => chapter.available);
  const lifeAreas = profile.lifeAreas.filter((area) => area.available);

  return (
    <section
      className={styles.section}
      data-whole-chart-synthesis={profile.version}
      data-acceptance-redesign-synthesis="reader-first"
      id="whole-chart-synthesis"
      aria-labelledby="whole-chart-synthesis-title"
    >
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>سنتز نجومی کل چارت</p>
        <h2 id="whole-chart-synthesis-title">سیاره‌ها، حاکمیت‌ها و الگوها وقتی کنار هم خوانده می‌شوند</h2>
        <p>
          اینجا هر جایگاه جداگانه تکرار نمی‌شود؛ هدف این است که ببینی چند بخش مهم چارت کجا به یک داستان مشترک می‌رسند.
        </p>
      </div>

      <div className={styles.synthesisEditorialList} data-whole-chart-fixed-chapters>
        {fixed.map((chapter) => (
          <SynthesisChapterCard chapter={chapter} key={chapter.id} />
        ))}
      </div>

      {dynamic.length > 0 ? (
        <section className={styles.synthesisGroup} data-whole-chart-dynamic-chapters>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>الگوهای نجومی برجسته</p>
            <h3>استلیوم‌ها، الگوهای جنبه‌ای و مسیرهای حاکمیتیِ مهم همین چارت</h3>
          </div>
          <div className={styles.synthesisEditorialList}>
            {dynamic.map((chapter) => (
              <SynthesisChapterCard chapter={chapter} key={chapter.id} />
            ))}
          </div>
        </section>
      ) : null}

      {lifeAreas.length > 0 ? (
        <section className={styles.synthesisGroup} data-whole-chart-life-areas>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>خانه‌ها و حوزه‌های زندگی</p>
            <h3>چند عامل نجومی در کدام بخش‌های زندگی به هم می‌رسند؟</h3>
            <p>
              هر حوزه از چند شاهد واقعی چارت ساخته شده است؛ خودِ عوامل را فقط وقتی خواستی در «چرا نجومی؟» باز کن.
            </p>
          </div>
          <div className={styles.lifeAreaEditorialList}>
            {lifeAreas.map((area) => (
              <LifeAreaCard area={area} key={area.id} />
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function SynthesisChapterCard({
  chapter,
}: {
  chapter: WholeChartSynthesisChapter;
}) {
  const paragraphs = unique([
    cleanSynthesisCopy(chapter.summary),
    ...chapter.paragraphs.map(cleanSynthesisCopy),
  ]).filter(Boolean);

  return (
    <article
      className={styles.synthesisEditorialChapter}
      data-reading-motion-card
      data-reading-motion-focus={chapter.id}
      data-whole-chart-chapter-id={chapter.id}
      data-whole-chart-chapter-kind={chapter.kind}
    >
      <h3>{chapter.title}</h3>
      <div className={styles.synthesisEditorialBody}>
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      {chapter.evidence.length > 0 ? (
        <details className={styles.evidenceDisclosure}>
          <summary>چرا این سنتز نجومی است؟</summary>
          <div className={styles.evidenceBody}>
            {unique(chapter.evidence).map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </details>
      ) : null}
    </article>
  );
}

function LifeAreaCard({ area }: { area: WholeChartLifeArea }) {
  const summary = cleanSynthesisCopy(area.summary);
  return (
    <article
      className={styles.lifeAreaEditorialCard}
      data-reading-motion-card
      data-reading-motion-focus={`life-area:${area.id}`}
      data-whole-chart-life-area={area.id}
    >
      <p className={styles.lifeAreaAstrologyLabel}>خانه‌ها و حوزهٔ زندگی</p>
      <h3>{area.title}</h3>
      {summary ? <p>{summary}</p> : null}
      <details className={styles.evidenceDisclosure}>
        <summary>چرا این حوزه در چارت پررنگ است؟</summary>
        <div className={styles.evidenceBody}>
          {unique([...area.factors, ...area.evidence]).map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </details>
    </article>
  );
}

function cleanSynthesisCopy(value: string): string {
  const source = String(value ?? "").replace(/\s+/gu, " ").trim();
  if (!source) return "";
  const sentences = source.match(/[^.!؟]+[.!؟]?/gu) ?? [source];
  return sentences
    .filter(
      (sentence) =>
        !INTERNAL_SYNTHESIS_MARKERS.some((marker) => sentence.includes(marker)),
    )
    .join(" ")
    .replace(/\s+/gu, " ")
    .trim();
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())))];
}
