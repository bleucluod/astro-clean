/**
 * D1 free-vs-private report response schemas. These are not auth or billing
 * contracts. A separate future server owner/entitlement check must authorize
 * rendering a private manuscript; none of these types grants access.
 */
import type { VedicD1PlacementId } from './vedic-d1-contract.ts';
import type { VedicD1NorthView } from './vedic-d1-north-layout.ts';

export const VEDIC_D1_READING_VERSION = 'vedic-d1-reading/1' as const;
export const VEDIC_D1_PREMIUM_CHAPTERS = [
  { id: 'lagna-lord', title: 'لاگنا و سیارهٔ حاکم' },
  { id: 'moon-emotions', title: 'ماه و الگوی عاطفی' },
  { id: 'houses-planets', title: 'پیوند خانه‌ها و سیاره‌های برجسته' },
  { id: 'personal-synthesis', title: 'جمع‌بندی شخصی' },
] as const;
export type VedicD1PremiumChapterId = (typeof VEDIC_D1_PREMIUM_CHAPTERS)[number]['id'];

export type VedicD1FactualEvidence = {
  id: string;
  /** Identifies the numeric contract field or classification behind this fact. */
  sourceField: string;
  bodyId?: VedicD1PlacementId;
  status: 'certain' | 'near-boundary';
  factFa: string;
};

/** Public guest payload: no premium text, evidence or private document. */
export type VedicD1FreeReading = {
  responseVersion: typeof VEDIC_D1_READING_VERSION;
  kind: 'free-d1';
  view: VedicD1NorthView;
  shortReading: { textFa: string; evidence: readonly VedicD1FactualEvidence[] };
  availablePremiumChapterTitles: readonly string[];
  premiumStatus: 'not-available';
};
