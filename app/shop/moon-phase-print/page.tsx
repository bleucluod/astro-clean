import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductDetail } from '@/components/shop/ProductDetail';
import { isShopMvpActive } from '@/lib/shop/shop-mvp-activation';
import styles from '@/components/shop/shop-v01-home.module.css';

export function generateMetadata(): Metadata {
  const indexable = isShopMvpActive();
  return {
  title: "تابلو فاز ماه در تاریخ دلخواه | ماه آن روز | هالیوس",
  description: "تابلوی «ماه آن روز» از هالیوس؛ تابلو فاز ماه برای تاریخ دلخواهت، با امکان افزودن نام و پیام، چاپ مات روی شاسی و سه اندازه. خاطره‌ات را به روشنای ماه بسپار.",
  alternates: { canonical: '/shop/moon-phase-print' },
  robots: { index: indexable, follow: indexable },
  };
}

export const dynamic = 'force-dynamic';

export default function P01ProductPage() {
  if (!isShopMvpActive()) {
    return <div className={styles.closed} data-shop-page="closed"><h1>ماه آن روز</h1><p>به‌زودی می‌توانی ماهِ لحظهٔ عزیزت را به بخشی از خانه‌ات تبدیل کنی.</p><Link className={styles.backLink} href="/shop">بازگشت به فروشگاه</Link></div>;
  }
  return <ProductDetail id="p01" />;
}
