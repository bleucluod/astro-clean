import type { Metadata } from 'next';
import Link from 'next/link';
import { ShopOrderTrackScreen } from '@/components/shop/ShopCheckoutFlow';
import { isShopMvpActive } from '@/lib/shop/shop-mvp-activation';
import styles from '@/components/shop/shop-v01-home.module.css';

export const metadata: Metadata = { title: 'پیگیری سفارش | هالیوس', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default function ShopTrackPage() {
  if (!isShopMvpActive()) {
    return <div className={styles.closed}><h1>پیگیری سفارش</h1><p>فروشگاه هالیوس به‌زودی آماده می‌شود.</p><Link className={styles.backLink} href="/shop">بازگشت به فروشگاه</Link></div>;
  }
  return <ShopOrderTrackScreen />;
}
