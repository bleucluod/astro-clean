import type { Metadata } from 'next';
import Link from 'next/link';
import { ShopOrderTrackScreen } from '@/components/shop/ShopCheckoutFlow';
import styles from '@/components/shop/shop-v01-home.module.css';

export const metadata: Metadata = { title: 'پیگیری سفارش | هالیوس', robots: { index: false, follow: false } };

export default function ShopTrackPage() {
  if (process.env.NODE_ENV === 'production') {
    return <div className={styles.closed}><h1>پیگیری سفارش</h1><p>فروشگاه هالیوس به‌زودی آماده می‌شود.</p><Link className={styles.backLink} href="/shop">بازگشت به فروشگاه</Link></div>;
  }
  return <ShopOrderTrackScreen />;
}
