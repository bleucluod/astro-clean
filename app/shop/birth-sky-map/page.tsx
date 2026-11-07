import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductDetail } from '@/components/shop/ProductDetail';
import styles from '@/components/shop/shop-v01-home.module.css';

export const metadata: Metadata = {
  title: 'آسمان تولد | تابلوی نقشهٔ ستاره‌های تولد هالیوس',
  description: 'تابلوی آسمان تولد با نقشهٔ ستاره‌ها براساس تاریخ، ساعت و شهر تولد؛ شاسی مات بدون قاب در سه اندازه.',
  alternates: { canonical: '/shop/birth-sky-map' },
  robots: { index: false, follow: false },
};

export default function BirthSkyProductPage() {
  if (process.env.NODE_ENV === 'production') {
    return <div className={styles.closed} data-shop-page="closed"><h1>آسمان تولد</h1><p>داستان هر کسی از جایی شروع می‌شود. به‌زودی می‌توانی یاد آن آغاز را به خانه بیاوری.</p><Link className={styles.backLink} href="/shop">بازگشت به فروشگاه</Link></div>;
  }
  return <ProductDetail id="p02" />;
}
