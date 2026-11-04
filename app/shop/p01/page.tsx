import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductDetail } from '@/components/shop/ProductDetail';
import styles from '@/components/shop/shop-v01-home.module.css';

export const metadata: Metadata = {
  title: 'ماه آن روز | تابلوی فاز ماه شخصی هالیوس',
  description: 'تابلوی فاز ماه در تاریخ انتخابی تو؛ چاپ مات روی شاسی بدون قاب با سه اندازه و امکان افزودن نام و پیام.',
  alternates: { canonical: '/shop/p01' },
  robots: { index: false, follow: false },
};

export default function P01ProductPage() {
  if (process.env.NODE_ENV === 'production') {
    return <div className={styles.closed} data-shop-page="closed"><h1>ماه آن روز</h1><p>به‌زودی می‌توانی ماهِ لحظهٔ عزیزت را به بخشی از خانه‌ات تبدیل کنی.</p><Link className={styles.backLink} href="/shop">بازگشت به فروشگاه</Link></div>;
  }
  return <ProductDetail id="p01" />;
}
