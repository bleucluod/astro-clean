/** Public D1 reading builder: imports NO private premium writer/text. */
import type { VedicD1AssembledChart } from './vedic-d1-assembly.ts';
import { buildVedicD1NorthView } from './vedic-d1-north-layout.ts';
import {
  VEDIC_D1_PREMIUM_CHAPTERS,
  VEDIC_D1_READING_VERSION,
  type VedicD1FreeReading,
  type VedicD1FactualEvidence,
} from './vedic-d1-reading-contract.ts';

export function buildVedicD1FreeReading(chart: VedicD1AssembledChart): VedicD1FreeReading {
  // The layout performs contract and placement consistency checks. It does not
  // validate numerical ephemeris provenance; Step 05 must pass independently.
  const view = buildVedicD1NorthView(chart);
  const moon = view.rows.find(row => row.id === 'moon')!;
  const asc = view.canDrawHouses ? view.houses[0].signNameFa : null;
  const evidence: VedicD1FactualEvidence[] = [
    {
      id: 'free-lagna', sourceField: 'ascendantSignIndex',
      status: asc ? 'certain' : 'near-boundary',
      factFa: asc ? `طالع محاسبه‌شده در نشان ${asc} قرار دارد.` : 'طالع نزدیک مرز دو نشان است و نام قطعی آن قابل اتکا نیست.',
    },
    {
      id: 'free-moon', sourceField: 'placements.moon.signIndex', bodyId: 'moon',
      status: moon.signNameFa ? 'certain' : 'near-boundary',
      factFa: moon.signNameFa ? `ماه در نشان ${moon.signNameFa} قرار دارد.` : 'ماه نزدیک مرز نشان است؛ نام نشان را قطعی نمی‌خوانیم.',
    },
  ];
  return {
    responseVersion: VEDIC_D1_READING_VERSION,
    kind: 'free-d1',
    view,
    shortReading: {
      textFa: `${evidence[0].factFa} ${evidence[1].factFa} این دو نقطه، آغاز خواندن نقشه‌اند؛ هیچ‌کدام به‌تنهایی سرنوشت یا شخصیت قطعی را تعیین نمی‌کنند.`,
      evidence,
    },
    availablePremiumChapterTitles: VEDIC_D1_PREMIUM_CHAPTERS.map(chapter => chapter.title),
    premiumPreview: null,
    premiumStatus: 'not-available',
  };
}
