/** Server-side projection of the private D1 writer. Never import this module into a client component. */
import type { VedicD1AssembledChart } from './vedic-d1-assembly.ts';
import type { VedicD1PrivateManuscriptDraft } from './vedic-d1-premium-contract.ts';
import { buildVedicD1PrivateManuscriptDraft } from './vedic-d1-premium-writer.ts';
import { VEDIC_D1_PREMIUM_CHAPTERS, type VedicD1ChapterExcerpt } from './vedic-d1-reading-contract.ts';

const wordCount = (text: string): number => {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/u).length : 0;
};

/** Longest complete-sentence prefix at or below 20% of the actual chapter's words. */
export function extractVedicD1ChapterExcerpt(paragraphs: readonly string[]): string | null {
  const text = paragraphs.join('\n\n').trim();
  const budget = Math.floor(wordCount(text) / 5);
  if (budget < 1) return null;
  let end = 0;
  // Whitespace/end lookahead keeps decimal punctuation inside numbers intact.
  for (const match of text.matchAll(/[.!؟?…]+[»”’"')\]]*(?=\s|$)/gu)) {
    const next = match.index! + match[0].length;
    if (wordCount(text.slice(0, next)) > budget) break;
    end = next;
  }
  // Never reveal a partial sentence or exceed the budget, even for short fallback chapters.
  return end > 0 ? text.slice(0, end).trimEnd() : null;
}

export function projectVedicD1ChapterPreview(draft: VedicD1PrivateManuscriptDraft): readonly VedicD1ChapterExcerpt[] {
  if (draft.kind !== 'private-d1-draft' || draft.chapters.length !== VEDIC_D1_PREMIUM_CHAPTERS.length) {
    throw new Error('VEDIC_D1_PREVIEW_INVALID_DRAFT');
  }
  return VEDIC_D1_PREMIUM_CHAPTERS.map((expected, index) => {
    const chapter = draft.chapters[index];
    if (chapter.id !== expected.id || chapter.title !== expected.title) {
      throw new Error('VEDIC_D1_PREVIEW_INVALID_CHAPTER');
    }
    // Explicit projection: no evidence, full paragraphs or manuscript metadata.
    return { id: expected.id, title: expected.title, excerptFa: extractVedicD1ChapterExcerpt(chapter.paragraphsFa) };
  });
}

export function buildVedicD1ServerPreview(chart: VedicD1AssembledChart): readonly VedicD1ChapterExcerpt[] {
  // The public input intentionally has no name, account or owner field.
  return projectVedicD1ChapterPreview(buildVedicD1PrivateManuscriptDraft(chart));
}
