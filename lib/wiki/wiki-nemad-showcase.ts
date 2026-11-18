import { NEMAD_MONTHS } from '@/lib/shop/nemad-man-months';
import type { NemadMonthSlug } from '@/lib/shop/nemad-man-months';
import type { WikiArticleSection } from './wiki-content';
import { eligibleWikiShowcasePosition, wikiSectionEndPercents } from './wiki-showcase-positions';

export type WikiNemadShowcaseId = `nm-${NemadMonthSlug}`;

/** Approved month-specific images; these IDs are showcase choices, not order IDs. */
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

/** A single month-specific article gets one free middle slot, without DB writes. */
export function automaticNemadWikiOffer(
  article: { slug: string; title: string; sections: readonly WikiArticleSection[] },
  usedPositions: ReadonlySet<number>, existingProductIds: readonly string[],
) {
  const words = article.title.normalize('NFKC').match(/[\p{L}]+/gu) ?? [];
  const mentioned = NEMAD_MONTHS.filter((month) => words.includes(month.title));
  if (mentioned.length !== 1 ||
      !/(متولد|متولدین|برج|زودیاک|طالع|خصوصیات)/u.test(article.title)) return null;
  const month = mentioned[0];
  if (!article.slug.split('-').includes(month.slug)) return null;
  const productId = `nm-${month.slug}` as WikiNemadShowcaseId;
  if (existingProductIds.includes(productId)) return null;
  const percents = wikiSectionEndPercents(article.sections);
  const positions = article.sections.map((section, index) => ({ section, index, percent: percents[index] }))
    .filter(({ index, percent }) =>
      !usedPositions.has(index) && eligibleWikiShowcasePosition(article.sections, index, percents) &&
      percent >= 20 && percent <= 80)
    .sort((a, b) => Math.abs(a.percent - 50) - Math.abs(b.percent - 50));
  const position = positions[0];
  if (!position) return null;
  const product = wikiNemadProducts(true).find((item) => item.id === productId);
  if (!product) return null;
  return {
    // Not a database UUID: automatic cards are intentionally untracked.
    id: `auto-nemad-${article.slug}`,
    productId,
    afterSectionIndex: position.index,
    sectionTitle: position.section.title,
    title: `نماد ماه ${month.title}، با نام و تاریخ خودت`,
    description: `تابلویی شخصی برای متولدین ${month.title}؛ طرح و اندازه‌اش را در صفحهٔ محصول ببین.`,
    buttonLabel: `دیدن نماد ${month.title}`,
    url: product.url,
    image: product.image,
    imageAlt: `تابلوی نماد من ویژه متولدین ${month.title}`,
  };
}
