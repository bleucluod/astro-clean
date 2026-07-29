import type { WikiArticleSection } from "@/lib/wiki/wiki-content";

const rawHtmlPattern = /<\/?[a-z][^>]*>/i;
const unsafeProtocolPattern = /(?:javascript|vbscript|data):/i;
const unsupportedInlineMarkdownPattern = /(?:\*\*|__|`|(?<!!)\[[^\]]+\]\([^)]+\))/;
const unsupportedBlockMarkdownPattern = /^(?:#\s|#{3,6}\s|>|```|\d+[.)]\s)/m;
const imagePattern = /^!\[([^\]]+)\]\((?:(?:\.\.\/)?(assets\/[A-Za-z0-9._/-]+)|(https:\/\/[^\s)]+))\)$/;
const internalLinkPattern = /\[\[article:([a-z0-9]+(?:[._-][a-z0-9]+)*)\]\]/g;

export type ParsedWikiMarkdown = {
  intro: string;
  keyPoints: string[];
  sections: WikiArticleSection[];
  internalArticleIds: string[];
  assetPaths: string[];
};

function flushParagraph(lines: string[], paragraphs: string[]) {
  const paragraph = lines.join(" ").trim();
  if (paragraph) {
    paragraphs.push(paragraph);
  }
  lines.length = 0;
}

export function findWikiInternalArticleIds(text: string) {
  return [...text.matchAll(internalLinkPattern)].map((match) => match[1]);
}

export function findWikiPublicationDependencyIds(
  relatedArticleIds: readonly string[],
  sourceStableId: string,
) {
  return [...new Set(relatedArticleIds)].filter(
    (stableId) => stableId !== sourceStableId,
  );
}

export function parseWikiMarkdown(markdown: string): ParsedWikiMarkdown {
  const normalized = markdown.replaceAll("\r\n", "\n").replaceAll("\r", "\n").trim();
  if (!normalized || normalized.length > 120_000) {
    throw new Error("Article Markdown must contain between 1 and 120000 characters.");
  }
  if (rawHtmlPattern.test(normalized) || unsafeProtocolPattern.test(normalized)) {
    throw new Error("Raw HTML and unsafe URL protocols are not allowed in Wiki Markdown.");
  }
  if (
    unsupportedInlineMarkdownPattern.test(normalized) ||
    unsupportedBlockMarkdownPattern.test(normalized)
  ) {
    throw new Error("Package v1 supports paragraphs, H2 headings, bullets, images, and stable article links only.");
  }

  const preface: string[] = [];
  const sections: WikiArticleSection[] = [];
  let title = "";
  const paragraphLines: string[] = [];
  let paragraphs: string[] = [];
  let bullets: string[] = [];
  let media: Array<{ src: string; alt: string; caption?: string }> = [];

  const flushSection = () => {
    flushParagraph(paragraphLines, paragraphs);
    if (!title) {
      preface.push(...paragraphs);
    } else if (paragraphs.length || bullets.length || media.length) {
      sections.push({
        title,
        paragraphs: [...paragraphs],
        ...(bullets.length ? { bullets: [...bullets] } : {}),
        ...(media.length ? { media: [...media] } : {}),
      });
    }
    paragraphs = [];
    bullets = [];
    media = [];
  };

  for (const rawLine of normalized.split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("# ")) {
      throw new Error("Article titles belong in manifest.json; H1 is not allowed in Markdown.");
    }
    if (line.startsWith("## ")) {
      flushSection();
      title = line.slice(3).trim();
      if (!title || title.length > 240) {
        throw new Error("Every H2 section needs a concise title.");
      }
      continue;
    }
    if (/^#{3,6}\s/.test(line)) {
      throw new Error("Package v1 supports H2 sections only.");
    }
    if (!line) {
      flushParagraph(paragraphLines, paragraphs);
      continue;
    }
    const image = line.match(imagePattern);
    if (image) {
      flushParagraph(paragraphLines, paragraphs);
      const alt = image[1].trim();
      if (!alt) {
        throw new Error("Every Wiki image needs alt text.");
      }
      media.push({ src: image[2] ?? image[3], alt });
      continue;
    }
    if (line.startsWith("- ")) {
      flushParagraph(paragraphLines, paragraphs);
      const bullet = line.slice(2).trim();
      if (!bullet) {
        throw new Error("Empty Markdown bullets are not allowed.");
      }
      bullets.push(bullet);
      continue;
    }
    if (/^\d+[.)]\s/.test(line) || line.startsWith(">") || line.startsWith("```")) {
      throw new Error("Package v1 supports paragraphs, H2 headings, bullets, images, and stable article links only.");
    }
    paragraphLines.push(line);
  }
  flushSection();

  const keyPointIndex = sections.findIndex((section) =>
    /^(نکات کلیدی|خلاصه|key points)$/i.test(section.title),
  );
  const keyPoints = keyPointIndex >= 0 ? sections[keyPointIndex].bullets ?? [] : [];
  if (keyPointIndex >= 0) {
    sections.splice(keyPointIndex, 1);
  }
  if (sections.length === 0) {
    throw new Error("Article Markdown needs at least one H2 content section.");
  }

  const intro = preface.join("\n\n").trim();
  const allText = [intro, ...sections.flatMap((section) => [
    ...section.paragraphs,
    ...(section.bullets ?? []),
  ])].join("\n");

  return {
    intro,
    keyPoints: [...keyPoints],
    sections,
    internalArticleIds: [...new Set(findWikiInternalArticleIds(allText))],
    assetPaths: [...new Set(sections.flatMap((section) =>
      (section.media ?? []).map((item) => item.src).filter((src) => src.startsWith("assets/")),
    ))],
  };
}
