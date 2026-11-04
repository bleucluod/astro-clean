import type { Metadata } from 'next';
import { ShopV01Home, type ShopV01Item } from '@/components/shop/ShopV01Home';
import styles from '@/components/shop/shop-v01-home.module.css';

export const metadata: Metadata = {
  title: 'فروشگاه هالیوس | آثار شخصی از آسمان',
  description: 'آثار هنری شخصی‌سازی‌شده از آسمان؛ نخستین اثر هالیوس، ماه آن روز، در حال آماده‌سازی است.',
  alternates: { canonical: '/shop' },
  robots: { index: false, follow: false },
};

// V01 is a visual approval surface, not a live catalog. The existing R29/R31
// shop/database candidate has NOT been committed; never invent availability,
// prices, additional products or permission to accept orders here.
const previewCatalog: ShopV01Item[] = [
  {
    id: 'P01',
    title: 'ماه آن روز',
    subtitle: 'فاز ماه در تاریخی که برای تو معنا دارد',
    category: 'آثار ماه',
    href: '/shop/p01',
    priceToman: null,
    availability: 'coming-soon',
    imageSrc: null,
    imageAlt: null,
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
