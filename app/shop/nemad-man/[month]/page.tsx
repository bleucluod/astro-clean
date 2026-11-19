import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { BirthSkyLiveProduct } from '@/components/shop/BirthSkyLiveProduct';
import { notFound } from 'next/navigation';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { NemadProductPage } from '@/components/shop/ProductDetail';
import type { ShopCopySection, ShopProduct } from '@/components/shop/product-detail-data';
import { validateBahmanPreview } from '@/lib/shop/nemad-man-bahman-preview';
import { NEMAD_MONTHS } from '@/lib/shop/nemad-man-months';
import { isShopNemadOrderEnabled } from '@/lib/shop/shop-mvp-activation';
import { readShopPriceCatalog } from '@/lib/shop/shop-price-store';
import { buildShopProductStructuredData } from '@/components/shop/product-schema';
import { buildSocialPreviewMetadata, siteConfig } from '@/lib/config/seo';

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

const months = NEMAD_MONTHS;

// Approved month-specific dark scenes from the private Nemad mockup archive.
// The four gallery photographs remain distinct from the two live artwork themes.
const darkScenes: Record<string, readonly [string, string]> = {
  farvardin: ['02-haleh-1387-01-16-dark-wall-bench.webp', '04-peyman-1378-01-13-dark-gift-wrap.webp'],
  ordibehesht: ['02-navid-1375-02-14-dark-wall-bench.webp', '04-bita-1381-02-17-dark-gift-wrap.webp'],
  khordad: ['02-taraneh-1377-03-13-dark-wall-bench.webp', '04-kaveh-1379-03-12-dark-gift-wrap.webp'],
  tir: ['02-ghazal-1383-04-15-dark-wall-bench.webp', '04-sorena-1371-04-14-dark-gift-wrap.webp'],
  mordad: ['02-shadi-1385-05-18-dark-wall-bench.webp', '04-parastoo-1375-05-14-dark-gift-wrap.webp'],
  shahrivar: ['02-youna-1388-06-18-dark-wall-bench.webp', '04-mahtab-1372-06-13-dark-gift-wrap.webp'],
  mehr: ['02-amir-1389-07-14-dark-wall-bench.webp', '04-abtin-1370-07-16-dark-gift-wrap.webp'],
  aban: ['02-nazanin-1374-08-16-dark-wall-bench.webp', '04-yalda-1382-08-18-dark-gift-wrap.webp'],
  azar: ['02-arash-1379-09-18-dark-wall-bench.webp', '04-sam-1389-09-12-dark-gift-wrap.webp'],
  dey: ['02-sepehr-1388-10-18-dark-wall-bench.webp', '04-parnia-1376-10-18-dark-gift-wrap.webp'],
  esfand: ['02-raha-1377-12-15-dark-wall-bench.webp', '04-anahita-1389-12-17-dark-gift-wrap.webp'],
};
// Farvardin-Khordad have one newly approved light photo, so a third
// independently approved dark scene keeps their gallery at four photographs.
const earlyDarkScenes: Record<string, string> = {
  farvardin: '03-nazanin-dark-lounge.webp',
  ordibehesht: '02-halle-dark-record-player.webp',
  khordad: '02-halle-dark-desk.webp',
};

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
    id: 'nm', // Keep Nemad's own order identity; never reuse the Shab-e Ma product ID.
    title: 'نماد من — ' + month,
    seoHeading: fields.title,
    tagline: fields['زیرعنوان'],
    introduction: fields['معرفی کنار تصویر'],
    highlight: fields['ویژگی‌های کوتاه'] ?? '',
    galleryNote: fields['توضیح تصاویر'] ?? '',
    // Entries are only the two theme choices; their visual is the existing SVG.
    gallery: [
      { src: '/nemad-man/zodiac-glyphs-v1/aries.webp#dark', alt: 'تابلو نماد ماه تولد ' + month + '؛ پیش‌نمایش مدل مینیمال تیره با نشان برج', label: 'مینیمال تیره' },
      { src: '/nemad-man/zodiac-glyphs-v1/aries.webp#light', alt: 'تابلو نماد ماه ' + month + '؛ پیش‌نمایش مدل مینیمال روشن با نشان برج', label: 'مینیمال روشن' },
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
  const initial = validateBahmanPreview('نام شما', sampleDate);
  if (!initial.ok) throw new Error('Invalid Nemad Man sample date: ' + sampleDate);
  const product = parseCustomerProduct(source, months[index].title, slug);
  // Keep the placeholder artwork choice aligned with the astronomically
  // calculated sign used by the live preview (not always Aries).
  product.gallery[0].src = '/nemad-man/zodiac-glyphs-v1/' + initial.value.sign.id + '.webp#dark';
  product.gallery[1].src = '/nemad-man/zodiac-glyphs-v1/' + initial.value.sign.id + '.webp#light';
  if (slug === 'bahman') {
    // Keep the two approved dark scenes. The former light scenes are no
    // longer gallery images; one new approved light/black-edge scene replaces them.
    product.gallery = [
      { src: '/nemad-man/zodiac-glyphs-v1/aquarius.webp#dark', alt: 'تابلو نماد ماه تولد بهمن؛ پیش‌نمایش مدل مینیمال تیره با نشان آبریز', label: 'مینیمال تیره' },
      { src: '/nemad-man/zodiac-glyphs-v1/aquarius.webp#light', alt: 'تابلو نماد ماه بهمن؛ پیش‌نمایش مدل مینیمال روشن با نشان آبریز', label: 'مینیمال روشن' },
      { src: '/shop-preview/nemad-man/bahman/02-nora-1370-11-18-dark-wall-bench.webp', alt: 'تابلو ماه تولد بهمن؛ موکاپ تیره با نام نورا روی دیوار', label: 'موکاپ · روی دیوار' },
      { src: '/shop-preview/nemad-man/bahman/04-sina-1373-11-16-dark-gift-wrap.webp', alt: 'هدیه برای متولدین بهمن؛ موکاپ تیره با نام سینا و بسته‌بندی نیمه‌باز', label: 'موکاپ · کادوی نیمه‌باز' },
    ];
  } else {
    const dark = darkScenes[slug];
    if (!dark) throw new Error('Missing approved dark gallery scenes: ' + slug);
    product.gallery.push(
      { src: '/shop-preview/nemad-man/' + slug + '/' + dark[0],
        alt: 'تابلو ماه تولد ' + months[index].title + '؛ مدل تیره روی دیوار',
        label: 'موکاپ · روی دیوار' },
      { src: '/shop-preview/nemad-man/' + slug + '/' + dark[1],
        alt: 'هدیه برای متولدین ' + months[index].title + '؛ مدل تیره در بسته‌بندی هدیه',
        label: 'موکاپ · بسته‌بندی هدیه' },
    );
    if (index < 3) {
      const extraDark = earlyDarkScenes[slug];
      if (!extraDark) throw new Error('Missing approved additional dark scene: ' + slug);
      product.gallery.push({
        src: '/shop-preview/nemad-man/' + slug + '/' + extraDark,
        alt: 'کادو تولد ' + months[index].title + '؛ موکاپ تیره در فضای خانه',
        label: 'موکاپ تیره · فضای خانه',
      });
    }
  }
  // Every month has exactly four approved mockup photos: older dark scenes and
  // the owner's retained black-edge light exports. Both live themes stay separate.
  product.gallery.push({
    src: '/shop-preview/nemad-man/' + slug + '/arad-light-black-edge-20261118.webp',
    alt: 'تابلو نماد ' + months[index].title + ' سفارشی؛ موکاپ روشن روی شاسی بدون قاب با لبهٔ مشکی',
    label: 'موکاپ روشن · لبهٔ مشکی',
  });
  // Nine additional owner-approved light 30x45 mockups exist only for Tir-Esfand.
  if (index >= 3) product.gallery.push({
    src: '/shop-preview/nemad-man/' + slug + '/halle-light-30x45-black-edge-20261118.webp',
    alt: 'تابلو ماه تولد ' + months[index].title + ' با اسم؛ موکاپ روشن ۳۰×۴۵ سانتی‌متری با لبهٔ مشکی',
    label: 'موکاپ روشن · ۳۰×۴۵',
  });
  return {
    slug: months[index].slug, seoTitle, metaDescription, initial: initial.value,
    months: months.map((item) => ({ slug: item.slug, title: item.title })),
    product,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { month } = await params;
  const data = readApprovedMonth(month);
  const title = data?.seoTitle ?? 'نماد من | هالیوس';
  const description = data?.metaDescription ?? 'تابلوی شخصی نماد ماه تولد از هالیوس.';
  const photo = data?.product.gallery.find(({ src }) => src.startsWith('/shop-preview/'))?.src;
  return {
    title,
    description,
    robots: { index: false, follow: false },
    ...buildSocialPreviewMetadata({
      title,
      description,
      canonical: '/shop/' + month + '-sign',
      photo,
      section: 'نماد من · هالیوس',
    }),
  };
}

/** Both paths share the same canonical offer URL; the internal alias stays noindex. */
export default async function NemadManMonthProductPage({ params }: Props) {
  const { month } = await params;
  const purchaseEnabled = isShopNemadOrderEnabled();
  if (process.env.NODE_ENV === 'production' && !purchaseEnabled) notFound();
  const data = readApprovedMonth(month);
  if (!data) notFound();
  const prices = (await readShopPriceCatalog()).prices;
  const markup = buildShopProductStructuredData(
    data.product, siteConfig.url, purchaseEnabled, prices, month,
  );
  return <div className={estedad.variable}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{
      __html: JSON.stringify(markup).replace(/</g, '\\u003c'),
    }} />
    <BirthSkyLiveProduct key={month} purchaseEnabled={isShopNemadOrderEnabled()} nemad={data}
      initialPriceToman={prices['nm:10x15']} />
  </div>;
}
