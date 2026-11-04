import type { Metadata } from 'next';
import { ShopV01Home, type ShopV01Item } from '@/components/shop/ShopV01Home';
import styles from '@/components/shop/shop-v01-home.module.css';

export const metadata: Metadata = {
  title: 'فروشگاه هالیوس | آثار شخصی از آسمان',
  description: 'مجموعهٔ آثار شخصی هالیوس: ماه آن روز، آسمان تولد و شب ما؛ لحظه‌های آسمان در قالب تابلو.',
  alternates: { canonical: '/shop' },
  robots: { index: false, follow: false },
};

// The launch lineup is P01, P02 and P03. Checkout and pricing stay disabled
// until each product passes its own design, astronomy and fulfillment gates.
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
    href: null,
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
    href: null,
    priceToman: null,
    availability: 'coming-soon',
    imageSrc: '/shop-preview/our-night.webp',
    imageAlt: 'تابلوی شب ما با راه شیری بر فراز کوهستان روی شاسی مات تیره',
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

  return <ShopV01Home products={launchCatalog} />;
}
