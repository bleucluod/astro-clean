import type { WikiArticleSection } from "@/lib/wiki/wiki-content";

/** A stable, content-derived section marker; it intentionally excludes the heading. */
export function wikiShowcaseSectionAnchor(section: WikiArticleSection): string {
  const paragraphs = section.orderedBlocks?.flatMap((block) => {
    if ("text" in block && block.kind === "paragraph") return [block.text];
    return [];
  }) ?? section.paragraphs;
  const sample = (paragraphs.find((p) => p.trim()) ?? section.bullets?.[0] ?? section.title)
    .normalize("NFKC").replace(/[\u200c\u200e\u200f]/g, " ").replace(/\s+/g, " ")
    .trim().slice(0, 240);
  // FNV-1a; identical in server and browser, no crypto secret or random IDs.
  let hash = 2166136261;
  for (let i = 0; i < sample.length; i += 1) {
    hash ^= sample.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return "sec1-" + hash.toString(16).padStart(8, "0");
}

export function resolveWikiShowcaseSection(
  sections: readonly WikiArticleSection[],
  stored: { sectionAnchor?: string | null; sectionTitle: string },
): number | null {
  const candidates = sections.map((section, index) => ({ section, index }))
    .filter(({ index }) => index < sections.length - 1 && (sections.length < 4 || index > 0));
  if (stored.sectionAnchor) {
    const anchors = candidates.filter(({ section }) => wikiShowcaseSectionAnchor(section) === stored.sectionAnchor);
    if (anchors.length === 1) return anchors[0].index;
  }
  const titles = candidates.filter(({ section }) => section.title === stored.sectionTitle);
  return titles.length === 1 ? titles[0].index : null;
}
