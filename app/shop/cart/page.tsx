import type { Metadata } from 'next';
import Link from 'next/link';
import { ShopCartScreen } from '@/components/shop/ShopCheckoutFlow';
import styles from '@/components/shop/shop-v01-home.module.css';

export const metadata: Metadata = { title: 'سبد خرید | هالیوس', robots: { index: false, follow: false } };

export default function ShopCartPage() {
  if (process.env.NODE_ENV === 'production') {
    return <div className={styles.closed}><h1>سبد خرید</h1><p>فروشگاه هالیوس به‌زودی آماده می‌شود.</p><Link className={styles.backLink} href="/shop">بازگشت به فروشگاه</Link></div>;
  }
  return <ShopCartScreen />;
}
