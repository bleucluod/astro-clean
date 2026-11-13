import type { WikiArticleSection } from "@/lib/wiki/wiki-content";

/** Cumulative percentage of readable section text, not the section number. */
export function wikiSectionEndPercents(sections: readonly WikiArticleSection[]): number[] {
  const count = (value: unknown): number => {
    if (typeof value === "string") return value.trim().length;
    if (Array.isArray(value)) return value.reduce<number>((sum, part) => sum + count(part), 0);
    if (!value || typeof value !== "object") return 0;
    return Object.entries(value).reduce((sum, [key, part]) =>
      ["id", "url", "src", "alt", "anchor", "kind"].includes(key) ? sum : sum + count(part), 0);
  };
  const weights = sections.map((section) => Math.max(1,
    section.orderedBlocks?.length ? count(section.orderedBlocks)
      : count(section.paragraphs) + count(section.bullets ?? [])));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cumulative = 0;
  return weights.map((weight) => {
    cumulative += weight;
    return Math.round(1000 * cumulative / Math.max(1, total)) / 10;
  });
}

export function eligibleWikiSectionBoundary(index: number, count: number, percent: number): boolean {
  if (!Number.isInteger(index) || index < 0 || index >= count - 1) return false;
  // A substantial first chapter can be the natural 15–30% placement.
  return index > 0 || count < 4 || (percent >= 15 && percent <= 30);
}
export function eligibleWikiShowcasePosition(
  sections: readonly WikiArticleSection[], index: number,
  percents = wikiSectionEndPercents(sections),
): boolean {
  return eligibleWikiSectionBoundary(index, sections.length, percents[index]);
}

export type WikiShowcaseWindow = "early" | "late";

/** Suggest two well-separated, genuinely available H2 boundaries; never force an ad. */
export function suggestWikiShowcasePositions(
  sections: readonly WikiArticleSection[], occupied: readonly number[] = [],
): Array<{ index: number; percent: number; window: WikiShowcaseWindow }> {
  const percents = wikiSectionEndPercents(sections);
  const used = new Set(occupied);
  const selected: Array<{ index: number; percent: number; window: WikiShowcaseWindow }> = [];
  for (const [window, minimum, maximum, target] of [
    ["early", 15, 30, 22.5], ["late", 60, 80, 70],
  ] as const) {
    const possibilities = sections.map((_, index) => ({ index, percent: percents[index] }))
      .filter((item) => eligibleWikiShowcasePosition(sections, item.index, percents) &&
        !used.has(item.index) && item.percent >= minimum && item.percent <= maximum)
      .sort((a, b) => Math.abs(a.percent - target) - Math.abs(b.percent - target));
    const next = possibilities[0];
    if (!next) continue;
    used.add(next.index);
    selected.push({ ...next, window });
  }
  return selected;
}
