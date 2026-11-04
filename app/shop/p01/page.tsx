import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import styles from '@/components/shop/shop-v01-home.module.css';

export const metadata: Metadata = {
  title: 'ماه آن روز | تابلوی ماه شخصی هالیوس',
  description: 'فاز واقعی ماه در تاریخ عزیز تو، روی تابلوی شاسی مات بدون قاب؛ با امکان افزودن نام یا پیام دلخواه.',
  robots: { index: false, follow: false },
};

// Product copy can be reviewed locally. Ordering remains closed until the
// approved product photography, pricing and fulfillment gates are complete.
export default function P01ProductPage() {
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className={styles.closed}>
        <h1>ماه آن روز</h1>
        <p>به‌زودی می‌توانی ماهِ لحظهٔ عزیزت را به بخشی از خانه‌ات تبدیل کنی.</p>
        <Link className={styles.backLink} href="/shop">بازگشت به فروشگاه</Link>
      </div>
    );
  }

  return (
    <div className={styles.detailShell}>
      <nav className={styles.crumbs} aria-label="مسیر صفحه">
        <Link href="/">هالیوس</Link><span aria-hidden="true">/</span>
        <Link href="/shop">فروشگاه</Link><span aria-hidden="true">/</span>
        <span>ماه آن روز</span>
      </nav>
      <div className={styles.detailPreview}>
        <div className={styles.detailArt}>
          <Image src="/shop-preview/moon-that-day.webp" alt="تابلوی ماه آن روز بر دیوار روشن با گلدان و نور پنجره" width={900} height={900} sizes="(max-width: 760px) calc(100vw - 32px), 50vw" />
        </div>
        <div className={styles.detailCopy}>
          <span className={styles.eyebrow}>از مجموعه آثار هالیوس</span>
          <h1>ماه آن روز</h1>
          <p className={styles.detailLead}>بعضی لحظه‌ها ارزش دارند شکل دیگری از ماندن پیدا کنند.</p>
          <p>فاز ماه در تاریخی که انتخاب می‌کنی، روی شاسی مات بدون قاب؛ با نام یا پیام دلخواه، اگر بخواهی.</p>
          <ul>
            <li>انتخاب تاریخ به شمسی یا میلادی</li>
            <li>امکان افزودن نام یا پیام دلخواه</li>
            <li>شاسی مات بدون قاب در اندازه‌های ۱۰×۱۵، ۲۰×۳۰ و ۳۰×۴۵ سانتی‌متر</li>
          </ul>
          <span className={styles.unavailable}>به‌زودی</span>
          <Link className={styles.backLink} href="/shop#products">بازگشت به مجموعه آثار <span aria-hidden="true">←</span></Link>
        </div>
      </div>
    </div>
  );
}
