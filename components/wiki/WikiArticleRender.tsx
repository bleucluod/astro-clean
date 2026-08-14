import Link from "next/link";
import type {
  WikiArticleLink,
  WikiArticleSection,
  WikiArticleSource,
} from "@/lib/wiki/wiki-content";
import styles from "@/app/wiki/wiki.module.css";

export type WikiInternalLinkTargets = Record<
  string,
  { slug: string; label: string }
>;

const CORE_WIKI_ROUTES = new Set(["/", "/chart", "/compare", "/sky", "/wiki"]);

export function WikiInlineText({
  text,
  targets,
}: {
  text: string;
  targets: WikiInternalLinkTargets;
}) {
  const parts = text.split(
    /(\[\[article:[a-z0-9]+(?:[._-][a-z0-9]+)*(?:\|[^\]\r\n]+)?\]\]|\[\[page:\/(?:chart|compare|sky|wiki)?\|[^\]\r\n]+\]\])/g,
  );

  return parts.map((part, index) => {
    const articleMatch = part.match(
      /^\[\[article:([a-z0-9]+(?:[._-][a-z0-9]+)*)(?:\|([^\]\r\n]+))?\]\]$/,
    );
    if (articleMatch) {
      const target = targets[articleMatch[1]];
      const explicitLabel = articleMatch[2]?.trim();
      if (!target) {
        return explicitLabel ?? null;
      }
      return (
        <Link
          className={styles.inlineArticleLink}
          href={`/wiki/${target.slug}`}
          key={`article-${target.slug}-${index}`}
        >
          {explicitLabel ?? target.label}
        </Link>
      );
    }

    const pageMatch = part.match(
      /^\[\[page:(\/(?:chart|compare|sky|wiki)?)?\|([^\]\r\n]+)\]\]$/,
    );
    if (pageMatch) {
      const href = (pageMatch[1] ?? "/").trim();
      const label = pageMatch[2].trim();
      if (CORE_WIKI_ROUTES.has(href) && label) {
        return (
          <Link
            className={styles.inlineArticleLink}
            href={href}
            key={`page-${href}-${index}`}
          >
            {label}
          </Link>
        );
      }
      return label || part;
    }

    return part;
  });
}

export function WikiKeyPoints({
  keyPoints,
  targets,
}: {
  keyPoints: readonly string[];
  targets: WikiInternalLinkTargets;
}) {
  return (
    <section className={styles.keyPoints} aria-labelledby="key-points-title">
      <span className={styles.sectionKicker}>خلاصهٔ مقاله</span>
      <h2 id="key-points-title">سه نکته‌ای که باید با خودت ببری</h2>
      <ul>
        {keyPoints.map((point) => (
          <li key={point}>
            <WikiInlineText text={point} targets={targets} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function WikiArticleBody({
  sections,
  contextLinks,
  sources,
  targets,
}: {
  sections: readonly WikiArticleSection[];
  contextLinks: readonly WikiArticleLink[];
  sources: readonly (string | WikiArticleSource)[];
  targets: WikiInternalLinkTargets;
}) {
  return (
    <div className={styles.articleBody}>
      {sections.map((section) => (
        <section className={styles.bodySection} key={section.title}>
          <h2>{section.title}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>
              <WikiInlineText text={paragraph} targets={targets} />
            </p>
          ))}
          {section.bullets ? (
            <ul className={styles.bodyList}>
              {section.bullets.map((bullet) => (
                <li key={bullet}>
                  <WikiInlineText text={bullet} targets={targets} />
                </li>
              ))}
            </ul>
          ) : null}
          {section.media?.map((media) => (
            <figure className={styles.articleMedia} key={media.src}>
              {/* CMS media is signature-validated and served from the dedicated public bucket. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={media.alt} loading="lazy" src={media.src} />
              {media.caption ? <figcaption>{media.caption}</figcaption> : null}
            </figure>
          ))}
        </section>
      ))}

      {contextLinks.length ? (
        <section className={styles.bodySection} aria-labelledby="article-links-title">
          <h2 id="article-links-title">برای ادامه بخوان</h2>
          <div className={styles.sideLinks}>
            {contextLinks.map((link) => (
              <Link href={link.href} key={`${link.href}-${link.label}`}>
                <span>{link.label}</span>
                <span aria-hidden="true">←</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {sources.length ? (
        <section className={styles.bodySection} aria-labelledby="article-sources-title">
          <h2 id="article-sources-title">منابع و مطالعهٔ بیشتر</h2>
          <ul className={styles.bodyList}>
            {sources.map((source) => (
              <li key={typeof source === "string" ? source : source.href}>
                {typeof source === "string" ? (
                  source
                ) : (
                  <a href={source.href} rel="noreferrer" target="_blank">
                    {source.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
