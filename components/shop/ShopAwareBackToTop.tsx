'use client';

import { usePathname } from 'next/navigation';
import { IntentPrefetchLink } from '@/components/IntentPrefetchLink';
import styles from '@/components/app-shell.module.css';

export function ShopAwareBackToTop() {
  const pathname = usePathname();
  if (pathname === '/shop' || pathname.startsWith('/shop/')) return null;

  return (
    <IntentPrefetchLink
      className={styles.backToTop}
      data-wiki-chrome-control="back-to-top"
      href="#main-content"
      aria-label="پرش به ابتدای محتوای صفحه"
    >
      <span aria-hidden="true">↑</span>
      پرش به بالا
    </IntentPrefetchLink>
  );
}
