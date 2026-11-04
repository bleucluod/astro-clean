import type { Metadata } from 'next';
import { ShopV01Home, type ShopV01Item } from '@/components/shop/ShopV01Home';
import styles from '@/components/shop/shop-v01-home.module.css';

export const metadata: Metadata = {
  title: 'فروشگاه هالیوس | آثار شخصی از آسمان',
  description: 'آثار هنری شخصی‌سازی‌شده از آسمان؛ نخستین اثر هالیوس، ماه آن روز، در حال آماده‌سازی است.',
  alternates: { canonical: '/shop' },
  robots: { index: false, follow: false },
};

// Review-only catalog. Only P01 is planned; the other two are layout samples.
// There are no active orders, prices, or production catalog entries here.
const previewCatalog: ShopV01Item[] = [
  {
    id: 'P01',
    title: 'ماه آن روز',
    subtitle: 'فاز ماه در تاریخی که برای تو معنا دارد',
    category: 'آثار ماه',
    href: '/shop/p01',
    priceToman: null,
    availability: 'coming-soon',
    imageSrc: '/shop-preview/moon-that-day.webp',
    imageAlt: 'نمای مفهومی شاسی مات بدون قاب با تصویر ماه روی دیوار روشن',
  },
  {
    id: 'DEMO-02',
    title: 'آسمان تولد',
    subtitle: 'نقشه‌ای از ستاره‌های یک روز خاص.',
    category: 'نمونهٔ نمایشی',
    href: null,
    priceToman: null,
    availability: 'unavailable',
    imageSrc: '/shop-preview/birth-sky-demo.webp',
    imageAlt: 'نمونهٔ مفهومی شاسی بدون قاب با نقشهٔ ستاره‌ها روی زمینهٔ آبی تیره',
    isDemo: true,
  },
  {
    id: 'DEMO-03',
    title: 'شبِ ما',
    subtitle: 'یادگاری از یک شب پرستاره.',
    category: 'نمونهٔ نمایشی',
    href: null,
    priceToman: null,
    availability: 'unavailable',
    imageSrc: '/shop-preview/our-night-demo.webp',
    imageAlt: 'نمونهٔ مفهومی شاسی بدون قاب با راه شیری و منظرهٔ کوهستان',
    isDemo: true,
  },
];

export default function ShopPage() {
  // A GitHub review commit must never activate an unfinished public shop if
  // another release happens to deploy main before visual approval.
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className={styles.closed}>
        <span className={styles.eyebrow}>HALLEUS / STUDIO</span>
        <h1>فروشگاه هالیوس</h1>
        <p>داریم برای اولین مجموعهٔ هالیوس آماده می‌شیم. به‌زودی از همین‌جا خبرهای بیشتری می‌شنوی.</p>
      </div>
    );
  }

  return <ShopV01Home products={previewCatalog} previewMode />;
}
