import type { Metadata } from 'next';
import { ShopV01Home, type ShopV01Item } from '@/components/shop/ShopV01Home';
import { isShopMvpActive, isShopP02OrderEnabled, isShopNemadOrderEnabled } from '@/lib/shop/shop-mvp-activation';
import { getShopProductUrl } from '@/lib/shop/shop-product-url';
import styles from '@/components/shop/shop-v01-home.module.css';
import { readShopPriceCatalog } from '@/lib/shop/shop-price-store';
import { NEMAD_MONTHS } from '@/lib/shop/nemad-man-months';

export function generateMetadata(): Metadata {
  return {
  title: 'خرید هدیه خاص و ماندگار | فروشگاه هالیوس',
  description: 'خرید هدیه خاص از هالیوس؛ هدیه هنری و کادو شیک با طرح‌های الهام‌گرفته از آسمان، شخصی‌سازی متناسب با هر اثر و امکان پیگیری سفارش.',
  alternates: { canonical: '/shop' },
  robots: { index: true, follow: true },
  };
}

export const dynamic = 'force-dynamic';

// Keep P03 closed; P02 appears in the catalog only when its purchase gate is open.
const launchCatalog: ShopV01Item[] = [
  {
    id: 'P01',
    title: 'تابلوی ماه آن روز',
    subtitle: 'ماه آسمان در تاریخی که برای تو معنا دارد؛ یادگاری از لحظه‌ای که هنوز در خاطرت روشن است.',
    category: 'آثار ماه',
    href: getShopProductUrl('p01'),
    priceToman: 900_000,
    availability: 'available',
    imageSrc: '/shop-preview/p01/mockup-frameless-gibbous-daylight.webp',
    imageAlt: 'شاسی بدون قاب تابلو ماه آن روز در موکاپ خاکستری با نور طبیعی سرد',
  },
  {
    id: 'P02',
    title: 'آسمان تولد',
    subtitle: 'آسمان لحظه‌ای که داستان تو آغاز شد.',
    category: 'آثار آسمان',
    href: getShopProductUrl('p02'),
    priceToman: 1_100_000,
    availability: 'available',
    imageSrc: '/shop-preview/p02/05-raha-parsa-30x45-wall.webp',
    imageAlt: 'تابلو آسمان تولد رها و پارسا روی شاسی بدون قاب با طراحی R9 هالیوس',
  },
  ...NEMAD_MONTHS.map(month => ({
    id: 'NM-' + month.slug,
    title: 'نماد من — ' + month.title,
    subtitle: 'صورت فلکی و نام و تاریخ تولد، روی شاسی مینیمال تیره یا روشن.',
    category: 'آثار ماه تولد',
    href: '/shop/' + month.slug + '-sign',
    priceToman: 900_000,
    availability: 'available' as const,
    imageSrc: '/shop-preview/nemad-man/' + month.slug + '/arad-light-black-edge-20261118.webp',
    imageAlt: 'تابلو نماد ماه تولد ' + month.title + ' با شاسی بدون قاب و لبهٔ مشکی',
  })),
  {
    id: 'P03',
    title: 'شبِ ما',
    subtitle: 'یادگاری از یک شب پرستاره.',
    category: 'آثار شب',
    href: getShopProductUrl('p03'),
    priceToman: null,
    availability: 'coming-soon',
    imageSrc: '/shop-preview/our-night.webp',
    imageAlt: 'تابلوی شب ما با راه شیری بر فراز کوهستان روی شاسی مات تیره',
  },
];

export default async function ShopPage() {
  if (!isShopMvpActive()) {
    return (
      <div className={styles.closed}>
        <span className={styles.eyebrow}>HALLEUS / STUDIO</span>
        <h1>فروشگاه هالیوس</h1>
        <p>داریم برای اولین مجموعهٔ هالیوس آماده می‌شیم. به‌زودی از همین‌جا خبرهای بیشتری می‌شنوی.</p>
      </div>
    );
  }

  const p02Enabled = isShopP02OrderEnabled();
  const nemadEnabled = isShopNemadOrderEnabled();
  const { prices } = await readShopPriceCatalog();
  return <ShopV01Home
    products={launchCatalog.filter((product) => product.id === 'P01' || (p02Enabled && product.id === 'P02') || (nemadEnabled && product.id.startsWith('NM-')))
      .map(product => ({ ...product,
        priceToman: product.id === 'P01' ? prices['p01:10x15']
          : product.id === 'P02' ? prices['p02:10x15']
          : product.id.startsWith('NM-') ? prices['nm:10x15'] : product.priceToman }))}
    showP02Invitation={!p02Enabled} />;
}
