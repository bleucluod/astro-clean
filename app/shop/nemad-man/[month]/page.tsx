import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { BirthSkyLiveProduct } from '@/components/shop/BirthSkyLiveProduct';
import { notFound } from 'next/navigation';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ProductDetail, type NemadProductPage } from '@/components/shop/ProductDetail';
import type { ShopCopySection, ShopProduct } from '@/components/shop/product-detail-data';
import { validateBahmanPreview } from '@/lib/shop/nemad-man-bahman-preview';
import { isShopNemadOrderEnabled } from '@/lib/shop/shop-mvp-activation';

// Use the same Estedad-loaded product shell as P02, not P03's renderer.
const estedad = localFont({
  src: [
    { path: '../../../../assets/shop-print/fonts/Estedad-Light.ttf', weight: '300', style: 'normal' },
    { path: '../../../../assets/shop-print/fonts/Estedad-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../../../../assets/shop-print/fonts/Estedad-Medium.ttf', weight: '500', style: 'normal' },
  ],
  variable: '--font-p02-estedad',
  display: 'swap',
});

const months = [
  { slug: 'farvardin', title: 'فروردین' },
  { slug: 'ordibehesht', title: 'اردیبهشت' },
  { slug: 'khordad', title: 'خرداد' },
  { slug: 'tir', title: 'تیر' },
  { slug: 'mordad', title: 'مرداد' },
  { slug: 'shahrivar', title: 'شهریور' },
  { slug: 'mehr', title: 'مهر' },
  { slug: 'aban', title: 'آبان' },
  { slug: 'azar', title: 'آذر' },
  { slug: 'dey', title: 'دی' },
  { slug: 'bahman', title: 'بهمن' },
  { slug: 'esfand', title: 'اسفند' },
] as const;

type Props = { params: Promise<{ month: string }> };
export const dynamic = 'force-dynamic';

function requireField(source: string, pattern: RegExp, label: string): string {
  const match = source.match(pattern)?.[1]?.trim();
  if (!match) throw new Error('Missing approved Nemad Man ' + label);
  return match;
}

function parseCustomerProduct(source: string, month: string, slug: string): ShopProduct {
  const starts = [...source.matchAll(/<!-- شروع متن قابل‌نمایش محصول[^\n]*-->/g)];
  const ends = [...source.matchAll(/<!-- پایان متن قابل‌نمایش محصول[^\n]*-->/g)];
  if (starts.length !== 1 || ends.length !== 1 || ends[0].index! <= starts[0].index!) {
    throw new Error('Invalid approved product boundaries: ' + slug);
  }
  const body = source.slice(starts[0].index! + starts[0][0].length, ends[0].index!).trim();
  const fields: Record<string, string> = {};
  const sections: ShopCopySection[] = [];
  let section: ShopCopySection | null = null;
  let nested: { title: string; paragraphs: string[] } | null = null;
  for (const raw of body.split(/\r?\n/)) {
    const value = raw.trim();
    if (!value || value === '---') continue;
    if (value.startsWith('# ')) {
      if (fields.title) throw new Error('Repeated product title: ' + slug);
      fields.title = value.slice(2);
    } else if (value.startsWith('## ')) {
      section = { title: value.slice(3), paragraphs: [], subheadings: [] };
      sections.push(section);
      nested = null;
    } else if (value.startsWith('### ')) {
      if (!section) throw new Error('Orphan subheading: ' + slug);
      nested = { title: value.slice(4), paragraphs: [] };
      section.subheadings!.push(nested);
    } else {
      const label = value.match(/^\*\*([^*]+):\*\*\s*(.*)$/);
      if (label && ['زیرعنوان', 'معرفی کنار تصویر', 'ویژگی‌های کوتاه',
        'توضیح تصاویر', 'عنوان پایان', 'متن پایان', 'متن دکمه'].includes(label[1])) {
        fields[label[1]] = label[2];
      } else {
        if (!section) throw new Error('Unassigned approved text: ' + slug);
        (nested ? nested.paragraphs : section.paragraphs).push(value);
      }
    }
  }
  const faqIndex = sections.findIndex((item) => /پرسش‌های|پرسش های/.test(item.title));
  if (!fields.title || !fields['زیرعنوان'] || !fields['معرفی کنار تصویر'] || faqIndex < 2) {
    throw new Error('Incomplete approved product content: ' + slug);
  }
  const faq = (sections[faqIndex].subheadings ?? []).map((item) => ({
    question: item.title, answer: item.paragraphs.join(' '),
  }));
  if (faq.length < 6 || faq.some((item) => !item.answer)) {
    throw new Error('Incomplete approved product FAQ: ' + slug);
  }
  return {
    id: 'p03', // Reuse the existing P03 page renderer; no additional checkout ID.
    title: 'نماد من — ' + month,
    seoHeading: fields.title,
    tagline: fields['زیرعنوان'],
    introduction: fields['معرفی کنار تصویر'],
    highlight: fields['ویژگی‌های کوتاه'] ?? '',
    galleryNote: fields['توضیح تصاویر'] ?? '',
    // Entries are only the two theme choices; their visual is the existing SVG.
    gallery: [
      { src: '/nemad-man/zodiac-glyphs-v1/aries.webp#dark', alt: 'مینیمال مشکی', label: 'مینیمال مشکی' },
      { src: '/nemad-man/zodiac-glyphs-v1/aries.webp#light', alt: 'مینیمال روشن', label: 'مینیمال روشن' },
    ],
    storyTitle: sections[0].title, story: sections[0].paragraphs,
    qualityTitle: sections[1].title, quality: sections[1].paragraphs,
    preCraftSections: sections.slice(2, faqIndex),
    postCraftSections: sections.slice(faqIndex + 1),
    faqHeading: sections[faqIndex].title, faq,
    editorialTitle: '', editorialIntro: [], editorial: [],
    ...(fields['عنوان پایان'] && fields['متن پایان'] ? {
      closingCopy: {
        title: fields['عنوان پایان'], text: fields['متن پایان'],
        button: fields['متن دکمه'] ?? 'دیدن نماد من',
      },
    } : {}),
  };
}

function readApprovedMonth(slug: string): (NemadProductPage & {
  seoTitle: string; metaDescription: string;
}) | null {
  const index = months.findIndex((item) => item.slug === slug);
  if (index < 0) return null;
  const version = slug === 'bahman' ? 'v3' : 'v2';
  const path = join(process.cwd(), 'content', 'shop-seo', '2026-11-06', 'nemad-man',
    slug + '-approved-' + version + '.md');
  const source = readFileSync(path, 'utf8');
  const seoTitle = requireField(source, /^\*\*SEO Title:\*\*\s*(.+)$/m, 'SEO Title');
  const metaDescription = requireField(source, /^\*\*Meta Description:\*\*\s*(.+)$/m, 'Meta Description');
  const sampleDate = '1375/' + String(index + 1).padStart(2, '0') + '/15';
  const initial = validateBahmanPreview('آراد', sampleDate);
  if (!initial.ok) throw new Error('Invalid Nemad Man sample date: ' + sampleDate);
  const product = parseCustomerProduct(source, months[index].title, slug);
  if (slug === 'bahman') {
    product.gallery = [
      { src: '/nemad-man/zodiac-glyphs-v1/aquarius.webp#dark', alt: 'پیش‌نمایش شخصی طرح تیرهٔ نماد بهمن', label: 'نماد شخصی · تیره' },
      { src: '/nemad-man/zodiac-glyphs-v1/aquarius.webp#light', alt: 'پیش‌نمایش شخصی طرح روشن نماد بهمن', label: 'نماد شخصی · روشن' },
      { src: '/shop-preview/nemad-man/bahman/01-mahsa-1387-11-12-light-console.webp', alt: 'تابلو نماد من با نام مهسا، طرح روشن روی میز کنسول', label: 'موکاپ · میز کنسول' },
      { src: '/shop-preview/nemad-man/bahman/02-nora-1370-11-18-dark-wall-bench.webp', alt: 'تابلو نماد من با نام نورا، طرح تیره روی دیوار', label: 'موکاپ · روی دیوار' },
      { src: '/shop-preview/nemad-man/bahman/03-reza-1372-11-14-light-workdesk.webp', alt: 'تابلو نماد من با نام رضا، طرح روشن روی میز کار', label: 'موکاپ · میز کار' },
      { src: '/shop-preview/nemad-man/bahman/04-sina-1373-11-16-dark-gift-wrap.webp', alt: 'تابلو نماد من با نام سینا، طرح تیره در بسته‌بندی هدیه', label: 'موکاپ · کادوی نیمه‌باز' },
    ];
  }
  return {
    slug, seoTitle, metaDescription, initial: initial.value,
    months: months.map((item) => ({ slug: item.slug, title: item.title })),
    product,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = readApprovedMonth((await params).month);
  return {
    title: data?.seoTitle ?? 'نماد من | هالیوس',
    description: data?.metaDescription,
    robots: { index: false, follow: false },
  };
}

export default async function NemadManMonthProductPage({ params }: Props) {
  const { month } = await params;
  if (process.env.NODE_ENV === 'production' &&
      (month !== 'bahman' || !isShopNemadOrderEnabled())) notFound();
  const data = readApprovedMonth(month);
  if (!data) notFound();
  if (month === 'bahman') {
    return <div className={estedad.variable}>
      <BirthSkyLiveProduct purchaseEnabled={isShopNemadOrderEnabled()} nemad={data} />
    </div>;
  }
  return <ProductDetail key={month} id="p03" nemad={data} />;
}
