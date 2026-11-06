import type { Metadata } from 'next';
import Link from 'next/link';
import { ShopCheckoutScreen } from '@/components/shop/ShopCheckoutFlow';
import { isShopMvpActive } from '@/lib/shop/shop-mvp-activation';
import styles from '@/components/shop/shop-v01-home.module.css';

export const metadata: Metadata = { title: 'اطلاعات ارسال | هالیوس', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default function ShopCheckoutPage() {
  if (!isShopMvpActive()) {
    return <div className={styles.closed}><h1>تسویه‌حساب</h1><p>فروشگاه هالیوس به‌زودی آماده می‌شود.</p><Link className={styles.backLink} href="/shop">بازگشت به فروشگاه</Link></div>;
  }
  return <ShopCheckoutScreen />;
}
