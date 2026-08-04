import content from "./final-editorial-content.generated.json";

export type FinalEditorialBlock =
  | { type: "eyebrow" | "h1" | "h2" | "subheading" | "paragraph" | "fact"; text: string }
  | { type: "note"; label: string; text: string }
  | { type: "action"; label: string; text: string }
  | { type: "list"; ordered: boolean; items: string[] };

export type FinalEditorialSection = { id: string; blocks: FinalEditorialBlock[] };
type FinalEditorialPage = { metadata: Record<string, string>; sections: FinalEditorialSection[] };
export type FinalEditorialPageKey = keyof typeof content;
const typedContent = content as Record<FinalEditorialPageKey, FinalEditorialPage>;

export function getFinalEditorialPage(key: FinalEditorialPageKey) {
  return typedContent[key];
}

export function getFinalEditorialSection(key: FinalEditorialPageKey, id: string) {
  const section = typedContent[key].sections.find((item) => item.id === id);
  if (!section) throw new Error(`Missing final editorial section: ${key}/${id}`);
  return section;
}
