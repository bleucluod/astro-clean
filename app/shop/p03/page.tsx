import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductDetail } from '@/components/shop/ProductDetail';
import styles from '@/components/shop/shop-v01-home.module.css';

export const metadata: Metadata = {
  title: 'شبِ ما | تابلوی راه شیری هالیوس',
  description: 'شبِ ما؛ تابلوی هنری راه شیری و کوهستان با نام و پیام اختیاری، چاپ مات روی شاسی بدون قاب.',
  alternates: { canonical: '/shop/p03' },
  robots: { index: false, follow: false },
};

export default function OurNightProductPage() {
  if (process.env.NODE_ENV === 'production') {
    return <div className={styles.closed} data-shop-page="closed"><h1>شبِ ما</h1><p>بعضی شب‌ها تمام نمی‌شوند؛ فقط به یک خاطرهٔ ماندگار تبدیل می‌شوند.</p><Link className={styles.backLink} href="/shop">بازگشت به فروشگاه</Link></div>;
  }
  return <ProductDetail id="p03" />;
}
