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
  // React escapes all text. Only these narrow, explicit Markdown constructs become markup.
  const parts = text.split(
    /(\[\[(?:article|page):[^\]\r\n]+\]\]|\*\*[^*\r\n]+\*\*|\*[^*\r\n]+\*|`[^`\r\n]+`|\[[^\]\r\n]+\]\(https:\/\/[^\s)]+\))/g,
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

    const pageMatch = part.match(/^\[\[page:(\/[^|\]\r\n]*)\|([^\]\r\n]+)\]\]$/);
    if (pageMatch) {
      const href = (pageMatch[1] ?? "/").trim();
      const label = pageMatch[2].trim();
      const wikiPath = /^\/wiki\/[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(href);
      if ((CORE_WIKI_ROUTES.has(href) || wikiPath) && label) {
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

    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`strong-${index}`}><WikiInlineText text={part.slice(2, -2)} targets={targets} /></strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={`italic-${index}`}><WikiInlineText text={part.slice(1, -1)} targets={targets} /></em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={`code-${index}`}>{part.slice(1, -1)}</code>;
    }
    const external = part.match(/^\[([^\]\r\n]+)\]\((https:\/\/[^\s)]+)\)$/);
    if (external) {
      try {
        const parsed = new URL(external[2]);
        if (parsed.protocol === "https:") {
          return <a key={`external-${index}`} href={parsed.toString()} target="_blank" rel="noopener noreferrer">{external[1]}</a>;
        }
      } catch { /* The original text is shown below for invalid URLs. */ }
    }

    return part;
  });
}

const TRUSTED_WIKI_INLINE_IMAGE = /^!\[([^\]\r\n]{1,220})\]\((https:\/\/[^\s)]+)\)$/;
const TRUSTED_SELF_HOSTED_IMAGE = /^https:\/\/halleus\.ir\/storage\/v1\/object\/public\/wiki-media\/[a-f0-9]{2}\/[a-f0-9]{64}\.webp$/;
const TRUSTED_NASA_HOSTS = new Set(["images-assets.nasa.gov", "assets.science.nasa.gov", "science.nasa.gov"]);

function trustedR3Image(src: string): boolean {
  if (TRUSTED_SELF_HOSTED_IMAGE.test(src)) return true;
  try {
    const parsed = new URL(src);
    return parsed.protocol === "https:" && TRUSTED_NASA_HOSTS.has(parsed.hostname) && !parsed.username && !parsed.password;
  } catch { return false; }
}

function wikiInlineImage(paragraph: string): { alt: string; src: string } | null {
  const match = paragraph.match(TRUSTED_WIKI_INLINE_IMAGE);
  return match && trustedR3Image(match[2]) ? { alt: match[1], src: match[2] } : null;
}

function splitWikiTableRow(line: string): string[] {
  const source = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let current = "", internalToken = false, code = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i], next = source[i + 1];
    if (char === "\\" && next === "|") { current += "|"; i++; continue; }
    if (char === "[" && next === "[") { internalToken = true; current += "[["; i++; continue; }
    if (char === "]" && next === "]") { internalToken = false; current += "]]"; i++; continue; }
    if (char === "`") { code = !code; current += char; continue; }
    if (char === "|" && !internalToken && !code) { cells.push(current.trim()); current = ""; continue; }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

/** Preserve approved multi-paragraph and list introductions without HTML injection. */
export function WikiIntroText({ text, targets }: { text: string; targets: WikiInternalLinkTargets }) {
  const groups = text.trim().split(/\r?\n\s*\r?\n/).filter(Boolean);
  return <>{groups.map((group, i) => {
    const lines = group.split(/\r?\n/);
    if (lines.length >= 2 && lines.every(line => /^\|/.test(line))) {
      const cells = lines.map(splitWikiTableRow);
      if (cells[1].every(value => /^:?-{3,}:?$/.test(value)) && cells.slice(2).every(row => row.length === cells[0].length)) {
        return <div className={styles.bodyTableScroll} key={`intro-table-${i}`} role="region" aria-label="جدول مقاله" tabIndex={0}>
          <table className={styles.bodyTable}>
            <thead><tr>{cells[0].map((cell, j) => <th key={j} scope="col"><WikiInlineText text={cell} targets={targets} /></th>)}</tr></thead>
            <tbody>{cells.slice(2).map((row, j) => <tr key={j}>{row.map((cell, k) => <td key={k}><WikiInlineText text={cell} targets={targets} /></td>)}</tr>)}</tbody>
          </table>
        </div>;
      }
    }
    if (lines.every(line => /^[-*] /.test(line))) {
      return <ul className={styles.bodyList} key={`intro-list-${i}`}>{lines.map((line, j) => <li key={j}><WikiInlineText text={line.slice(2)} targets={targets} /></li>)}</ul>;
    }
    if (lines.every(line => /^\d+[.)] /.test(line))) {
      return <ol className={styles.bodyList} key={`intro-ordered-${i}`}>{lines.map((line, j) => <li key={j}><WikiInlineText text={line.replace(/^\d+[.)] /, "")} targets={targets} /></li>)}</ol>;
    }
    return <p key={`intro-p-${i}`}><WikiInlineText text={group} targets={targets} /></p>;
  })}</>;
}

// HALLEUS_WIKI_KEY_POINTS_COUNT_V12
export function WikiKeyPoints({
  keyPoints,
  targets,
}: {
  keyPoints: readonly string[];
  targets: WikiInternalLinkTargets;
}) {
  const visibleKeyPoints = keyPoints.filter((point) => point.trim().length > 0);
  const count = visibleKeyPoints.length;

  if (count === 0) {
    return null;
  }

  const title = count === 1
    ? "یک نکته که باید با خودت ببری"
    : count === 2
      ? "دو نکته که باید با خودت ببری"
      : count === 3
        ? "سه نکته‌ای که باید با خودت ببری"
        : `${new Intl.NumberFormat("fa-IR", { useGrouping: false }).format(count)} نکته که باید با خودت ببری`;

  return (
    <section className={styles.keyPoints} aria-labelledby="key-points-title">
      <span className={styles.sectionKicker}>خلاصهٔ مقاله</span>
      <h2 id="key-points-title">{title}</h2>
      <ul>
        {visibleKeyPoints.map((point, index) => (
          <li key={`${point}-${index}`}>
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
  rootId,
}: {
  sections: readonly WikiArticleSection[];
  contextLinks: readonly WikiArticleLink[];
  sources: readonly (string | WikiArticleSource)[];
  targets: WikiInternalLinkTargets;
  rootId?: string;
}) {
  return (
    <div className={styles.articleBody} id={rootId}>
      {sections.map((section) => (
        <section className={styles.bodySection} key={section.title}>
          <h2>{section.title}</h2>
          {section.orderedBlocks ? (
            section.orderedBlocks.map((block, index) => {
              if (block.kind === "list") {
                return (
                  <ul className={styles.bodyList} key={`list-${index}`}>
                    {block.items.map((item, itemIndex) => (
                      <li key={`${itemIndex}-${item}`}>
                        <WikiInlineText text={item} targets={targets} />
                      </li>
                    ))}
                  </ul>
                );
              }
              if (block.kind === "numbered-list") {
                return <ol className={styles.bodyList} key={`ordered-${index}`}>{block.items.map((item, itemIndex) => (
                  <li key={itemIndex}><WikiInlineText text={item} targets={targets} /></li>
                ))}</ol>;
              }
              if (block.kind === "heading") {
                return <h3 key={`h3-${index}`}><WikiInlineText text={block.text} targets={targets} /></h3>;
              }
              if (block.kind === "table") {
                return <div className={styles.bodyTableScroll} key={`table-${index}`} role="region" aria-label="جدول مقاله" tabIndex={0}>
                  <table className={styles.bodyTable}>
                    <thead><tr>{block.header.map((cell, cellIndex) => <th key={cellIndex} scope="col"><WikiInlineText text={cell} targets={targets} /></th>)}</tr></thead>
                    <tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}><WikiInlineText text={cell} targets={targets} /></td>)}</tr>)}</tbody>
                  </table>
                </div>;
              }
              if (block.kind === "image") {
                if (!trustedR3Image(block.src) || !block.alt.trim()) return null;
                return <figure className={styles.articleMedia} key={`image-${index}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={block.alt} loading="lazy" src={block.src} />
                  {block.caption ? <figcaption>{block.caption}</figcaption> : null}
                </figure>;
              }
              if (block.kind === "quote") {
                return <blockquote className={styles.bodyQuote} key={`quote-${index}`}><WikiInlineText text={block.text} targets={targets} /></blockquote>;
              }
              if (block.kind === "divider") return <hr className={styles.bodyDivider} key={`divider-${index}`} />;
              const image = wikiInlineImage(block.text);
              return image ? (
                <figure className={styles.articleMedia} key={`paragraph-${index}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={image.alt} loading="lazy" src={image.src} />
                </figure>
              ) : (
                <p key={`paragraph-${index}`}>
                  <WikiInlineText text={block.text} targets={targets} />
                </p>
              );
            })
          ) : (
            <>
            {section.paragraphs.map((paragraph) => {
              const image = wikiInlineImage(paragraph);
              return image ? (
                <figure className={styles.articleMedia} key={paragraph}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={image.alt} loading="lazy" src={image.src} />
                </figure>
              ) : (
                <p key={paragraph}>
                  <WikiInlineText text={paragraph} targets={targets} />
                </p>
              );
            })}
            {section.bullets?.length ? (
              <ul className={styles.bodyList}>
                {section.bullets.map((bullet) => (
                  <li key={bullet}>
                    <WikiInlineText text={bullet} targets={targets} />
                  </li>
                ))}
              </ul>
            ) : null}
            </>
          )}
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
