import type {
  PersonalPlanetChapter,
  PersonalPlanetChaptersProfile,
} from "@/lib/astrology/personal-planet-chapters";
import styles from "./human-first-report.module.css";

type PersonalPlanetSection = PersonalPlanetChapter["sections"][number];

const INTERNAL_SENTENCE_MARKERS = [
  "در نسخهٔ فعلی",
  "در نسخه فعلی",
  "رابطه روایی",
  "دادهٔ کافی",
  "داده کافی",
  "ثبت نشده است",
] as const;

export function ReportPersonalPlanetChapters({
  profile,
}: {
  profile: PersonalPlanetChaptersProfile;
}) {
  return (
    <div
      className={styles.deepDiveList}
      data-personal-planet-chapters={profile.version}
      data-acceptance-redesign-chapters="narrative-astrology"
    >
      {profile.chapters.map((chapter) => (
        <PersonalPlanetChapterCard chapter={chapter} key={chapter.id} />
      ))}
    </div>
  );
}

function PersonalPlanetChapterCard({
  chapter,
}: {
  chapter: PersonalPlanetChapter;
}) {
  const position = findSection(chapter, "position");
  const meaning = findSection(chapter, "core-meaning");
  const sign = findSection(chapter, "sign-expression");
  const house = findSection(chapter, "house-expression");
  const condition = findSection(chapter, "planet-condition");
  const aspects = findSection(chapter, "major-aspects");
  const wholeChart = findSection(chapter, "whole-chart-connection");
  const daily = findSection(chapter, "daily-life");
  const healthy = findSection(chapter, "healthy-capacity");
  const pressure = findSection(chapter, "under-pressure");
  const integration = findSection(chapter, "integration");
  const evidenceSection = chapter.sections.find((section) => section.id === "evidence");

  const dailyBody = cleanDailyCopy(
    daily?.body ?? "",
    [healthy?.body, pressure?.body, integration?.body],
  );

  const evidenceItems = unique([
    condition?.body,
    aspects?.body,
    wholeChart?.body,
    ...(evidenceSection?.evidence ?? []),
  ]).map(cleanReaderCopy).filter(Boolean);

  return (
    <section
      className={styles.section}
      data-personal-planet-chapter={chapter.id}
      data-personal-planet-chapter-available={chapter.available}
      data-reading-motion-card
      data-reading-motion-focus={chapter.id}
      id={chapter.navigationId ?? `planet-chapter-${chapter.id}`}
      aria-labelledby={`planet-chapter-${chapter.id}-title`}
    >
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>فصل نجومی چارت</p>
        <h2 id={`planet-chapter-${chapter.id}-title`}>{chapter.title}</h2>
        {position ? <p className={styles.chapterPosition}>{cleanReaderCopy(position.body)}</p> : null}
      </div>

      <div className={styles.chapterNarrative}>
        {meaning ? (
          <section className={styles.chapterNarrativeLead} data-personal-planet-layer="core-meaning">
            <h3>این سیاره در چارت دربارهٔ چه چیزی است؟</h3>
            <p>{cleanReaderCopy(meaning.body)}</p>
          </section>
        ) : null}

        {sign || house ? (
          <section className={styles.chapterNarrativeBlock} data-personal-planet-layer="sign-house">
            <h3>برج و خانه؛ این جایگاه چطور خودش را نشان می‌دهد؟</h3>
            {sign ? <p>{cleanReaderCopy(sign.body)}</p> : null}
            {house ? <p>{cleanReaderCopy(house.body)}</p> : null}
          </section>
        ) : null}

        {dailyBody ? (
          <section className={styles.chapterNarrativeBlock} data-personal-planet-layer="daily-life">
            <h3>این جایگاه در زندگی روزمره</h3>
            <p>{dailyBody}</p>
          </section>
        ) : null}

        {healthy || pressure ? (
          <div className={styles.chapterPolarityGrid}>
            {healthy ? (
              <article data-personal-planet-layer="healthy-capacity">
                <h3>بیان سازندهٔ این جایگاه</h3>
                <p>{cleanReaderCopy(healthy.body)}</p>
              </article>
            ) : null}
            {pressure ? (
              <article data-personal-planet-layer="under-pressure">
                <h3>وقتی این جایگاه زیر فشار می‌رود</h3>
                <p>{cleanReaderCopy(pressure.body)}</p>
              </article>
            ) : null}
          </div>
        ) : null}

        {integration ? (
          <section className={styles.chapterIntegration} data-personal-planet-layer="integration">
            <h3>راه یکپارچه‌کردن این جایگاه</h3>
            <p>{cleanReaderCopy(integration.body)}</p>
          </section>
        ) : null}

        {evidenceItems.length > 0 ? (
          <details
            className={styles.evidenceDisclosure}
            data-personal-planet-layer="evidence"
          >
            <summary>چرا این خوانش نجومی است؟</summary>
            <div className={styles.evidenceBody}>
              {evidenceItems.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </section>
  );
}

function findSection(
  chapter: PersonalPlanetChapter,
  id: string,
): PersonalPlanetSection | undefined {
  return chapter.sections.find((section) => section.id === id);
}

function cleanDailyCopy(
  value: string,
  repeated: Array<string | undefined>,
): string {
  let result = cleanReaderCopy(value);
  for (const candidate of repeated) {
    const cleaned = cleanReaderCopy(candidate ?? "");
    if (!cleaned) continue;
    result = result
      .replace(`وقتی این بخش خوب کار می‌کند، ${cleaned}`, "")
      .replace(`زیر فشار، ${cleaned}`, "")
      .replace(cleaned, "");
  }
  return normalizePunctuation(result);
}

function cleanReaderCopy(value: string): string {
  const source = String(value ?? "").replace(/\s+/gu, " ").trim();
  if (!source) return "";
  const sentences = source.match(/[^.!؟]+[.!؟]?/gu) ?? [source];
  const filtered = sentences.filter(
    (sentence) =>
      !INTERNAL_SENTENCE_MARKERS.some((marker) => sentence.includes(marker)),
  );
  return normalizePunctuation(filtered.join(" "))
    .replace("در بخش ثبت‌شده زندگی، معمولاً", "در تجربهٔ روزمره، معمولاً")
    .replace("در بخش ثبت‌شده زندگی،", "در تجربهٔ روزمره،");
}

function normalizePunctuation(value: string): string {
  return value
    .replace(/\s+/gu, " ")
    .replace(/\s+([،؛:.!?؟])/gu, "$1")
    .replace(/([،؛])\s*([،؛])/gu, "$1")
    .replace(/\s+\./gu, ".")
    .trim();
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())))];
}
