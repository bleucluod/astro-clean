/**
 * Private D1 manuscript contract. This is NOT a free API response, entitlement,
 * payment status, or permission to publish a report.
 */
import type { VedicD1FactualEvidence, VedicD1PremiumChapterId } from './vedic-d1-reading-contract.ts';

export const VEDIC_D1_PRIVATE_MANUSCRIPT_VERSION = 'vedic-d1-private-manuscript/1' as const;
export const VEDIC_D1_WRITER_RULES_VERSION = 'vedic-d1-persian-writer/4' as const;

export type VedicD1PremiumChapter = {
  id: VedicD1PremiumChapterId;
  title: string;
  paragraphsFa: readonly string[];
  evidence: readonly VedicD1FactualEvidence[];
};

export type VedicD1PrivateManuscriptDraft = {
  kind: 'private-d1-draft';
  version: typeof VEDIC_D1_PRIVATE_MANUSCRIPT_VERSION;
  writerRulesVersion: typeof VEDIC_D1_WRITER_RULES_VERSION;
  calculationVersion: string;
  chapters: readonly VedicD1PremiumChapter[];
  /** No user ID, birth date, city, payment data or authorization claims. */
  trustNoteFa: string;
};
