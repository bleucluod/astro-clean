import type { Metadata } from 'next';
import { ShopV01Home, type ShopV01Item } from '@/components/shop/ShopV01Home';
import { isShopMvpActive } from '@/lib/shop/shop-mvp-activation';
import styles from '@/components/shop/shop-v01-home.module.css';

export const metadata: Metadata = {
  title: 'فروشگاه هالیوس | آثار شخصی از آسمان',
  description: 'تابلوی شخصی ماه آن روز؛ فاز ماه در تاریخ انتخابی تو، چاپ مات در سه اندازه.',
  alternates: { canonical: '/shop' },
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

// Preserve future product definitions without offering them for sale in the MVP.
const launchCatalog: ShopV01Item[] = [
  {
    id: 'P01',
    title: 'ماه آن روز',
    subtitle: 'فاز ماه در تاریخی که برای تو معنا دارد',
    category: 'آثار ماه',
    href: '/shop/p01',
    priceToman: null,
    availability: 'coming-soon',
    imageSrc: '/shop-preview/moon-that-day.webp',
    imageAlt: 'تابلوی ماه آن روز با تصویر ماه روی شاسی مات بدون قاب در دکور روشن',
  },
  {
    id: 'P02',
    title: 'آسمان تولد',
    subtitle: 'آسمان لحظه‌ای که داستان تو آغاز شد.',
    category: 'آثار آسمان',
    href: '/shop/p02',
    priceToman: null,
    availability: 'coming-soon',
    imageSrc: '/shop-preview/birth-sky.webp',
    imageAlt: 'تابلوی آسمان تولد با طرح دایره‌ای ستاره‌ها روی شاسی مات تیره',
  },
  {
    id: 'P03',
    title: 'شبِ ما',
    subtitle: 'یادگاری از یک شب پرستاره.',
    category: 'آثار شب',
    href: '/shop/p03',
    priceToman: null,
    availability: 'coming-soon',
    imageSrc: '/shop-preview/our-night.webp',
    imageAlt: 'تابلوی شب ما با راه شیری بر فراز کوهستان روی شاسی مات تیره',
  },
];

export default function ShopPage() {
  if (!isShopMvpActive()) {
    return (
      <div className={styles.closed}>
        <span className={styles.eyebrow}>HALLEUS / STUDIO</span>
        <h1>فروشگاه هالیوس</h1>
        <p>داریم برای اولین مجموعهٔ هالیوس آماده می‌شیم. به‌زودی از همین‌جا خبرهای بیشتری می‌شنوی.</p>
      </div>
    );
  }

  return <ShopV01Home products={launchCatalog.filter((product) => product.id === 'P01')} />;
}
