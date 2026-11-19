import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductDetail } from '@/components/shop/ProductDetail';
import { buildShopProductStructuredData } from '@/components/shop/product-schema';
import { getShopProduct } from '@/components/shop/product-detail-data';
import { readShopPriceCatalog } from '@/lib/shop/shop-price-store';
import { siteConfig } from '@/lib/config/seo';
import { isShopMvpActive } from '@/lib/shop/shop-mvp-activation';
import styles from '@/components/shop/shop-v01-home.module.css';

export function generateMetadata(): Metadata {
  return {
  title: "تابلو فاز ماه در تاریخ دلخواه | ماه آن روز | هالیوس",
  description: "تابلوی «ماه آن روز» از هالیوس؛ تابلو فاز ماه برای تاریخ دلخواهت، با امکان افزودن نام و پیام، چاپ مات روی شاسی و سه اندازه. خاطره‌ات را به روشنای ماه بسپار.",
  alternates: { canonical: '/shop/moon-phase-print' },
  robots: { index: true, follow: true },
  };
}

export const dynamic = 'force-dynamic';

export default async function P01ProductPage() {
  if (!isShopMvpActive()) {
    return <div className={styles.closed} data-shop-page="closed"><h1>ماه آن روز</h1><p>به‌زودی می‌توانی ماهِ لحظهٔ عزیزت را به بخشی از خانه‌ات تبدیل کنی.</p><Link className={styles.backLink} href="/shop">بازگشت به فروشگاه</Link></div>;
  }
  const prices = (await readShopPriceCatalog()).prices;
  const markup = buildShopProductStructuredData(getShopProduct('p01'), siteConfig.url, true, prices);
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{
      __html: JSON.stringify(markup).replace(/</g, '\\u003c'),
    }} />
    <ProductDetail id="p01" initialPriceToman={prices['p01:10x15']} />
  </>;
}
