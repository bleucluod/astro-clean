import { NEMAD_MONTHS } from '@/lib/shop/nemad-man-months';
import type { NemadMonthSlug } from '@/lib/shop/nemad-man-months';

export type WikiNemadShowcaseId = `nm-${NemadMonthSlug}`;

/** Showcase IDs represent twelve choices; orders still use the shared 'nm' product. */
export function wikiNemadProducts(orderable: boolean) {
  return NEMAD_MONTHS.map((month) => ({
    id: `nm-${month.slug}` as WikiNemadShowcaseId,
    name: `نماد من — ${month.title}`,
    description: `تابلوی نماد ماه ${month.title} با نام و تاریخ تولد دلخواه`,
    url: `/shop/${month.slug}-sign`,
    image: `/shop-preview/nemad-man/${month.slug}/arad-light-black-edge-20261118.webp`,
    orderable,
  }));
}

/** Admin-only suggestion: never publishes a card or guesses between multiple months. */
export function suggestWikiNemadMonth(slug: string, title: string) {
  const words: string[] = title.normalize('NFKC').match(/[\p{L}]+/gu) ?? [];
  const matches = NEMAD_MONTHS.filter((month) => words.includes(month.title));
  if (matches.length !== 1 ||
      !/(متولد|متولدین|برج|زودیاک|طالع|خصوصیات)/u.test(title)) return null;
  const month = matches[0];
  return slug.split('-').includes(month.slug) ? month : null;
}

/** Editable copy seeded into the existing admin showcase editor. */
export function wikiNemadSuggestedCopy(productId: string) {
  const month = NEMAD_MONTHS.find((item) => `nm-${item.slug}` === productId);
  if (!month) return null;
  return {
    title: `نماد ماه ${month.title}، با نام و تاریخ خودت`,
    description: `تابلویی شخصی برای متولدین ${month.title}؛ طرح و اندازه‌اش را در صفحهٔ محصول ببین.`,
    buttonLabel: `دیدن نماد ${month.title}`,
  };
}
