import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import styles from '@/components/shop/shop-v01-home.module.css';

export const metadata: Metadata = {
  title: 'ماه آن روز | پیش‌نمایش محصول هالیوس',
  description: 'تابلوی شخصی از فاز ماه در یک تاریخ دلخواه، روی شاسی مات بدون قاب. صفحهٔ محصول در حال آماده‌سازی است.',
  robots: { index: false, follow: false },
};

// Only a navigation destination required to review V01. The interactive
// product detail, price, gallery and checkout remain gated to V02/V03.
export default function P01ReviewDestination() {
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className={styles.closed}>
        <h1>ماه آن روز</h1>
        <p>این اثر هنوز برای سفارش آماده نیست.</p>
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
        <div className={styles.detailArt} aria-label="نمای مفهومی محصول، نه عکس نهایی چاپ">
          <Image src="/halleus-visuals/moon-apollo11.webp" alt="تصویر ماه برای نمایش فضای بصری اثر، نه عکس محصول چاپ‌شده" width={900} height={900} sizes="(max-width: 760px) 100vw, 460px" />
          <span>نمای مفهومی · عکس نهایی در انتظار تأیید</span>
        </div>
        <div className={styles.detailCopy}>
          <span className={styles.eyebrow}>HALLEUS / P01</span>
          <h1>ماه آن روز</h1>
          <p className={styles.detailLead}>بعضی لحظه‌ها ارزش دارند شکل دیگری از ماندن پیدا کنند.</p>
          <p>فاز ماه در تاریخی که انتخاب می‌کنی، روی شاسی مات بدون قاب؛ با نام یا پیام دلخواه، اگر بخواهی.</p>
          <ul>
            <li>تاریخ انتخابی شمسی یا میلادی</li>
            <li>اندازه‌های برنامه‌ریزی‌شده: ۱۰×۱۵، ۲۰×۳۰ و ۳۰×۴۵ سانتی‌متر</li>
            <li>قیمت و تصاویر چاپ واقعی هنوز تأیید نشده‌اند</li>
          </ul>
          <span className={styles.unavailable}>در حال آماده‌سازی · ثبت سفارش غیرفعال</span>
          <Link className={styles.backLink} href="/shop#products">بازگشت به مجموعه آثار <span aria-hidden="true">←</span></Link>
        </div>
      </div>
    </div>
  );
}
