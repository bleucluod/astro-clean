import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import styles from '@/components/shop/shop-v01-home.module.css';

export const metadata: Metadata = {
  title: 'آسمان تولد | تابلوی آسمان هالیوس',
  description: 'آسمان تولد؛ اثری آرام و شخصی با الهام از لحظه‌ای که داستان زندگی آغاز شد، روی شاسی مات بدون قاب.',
  robots: { index: false, follow: false },
};

export default function BirthSkyProductPage() {
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className={styles.closed}>
        <h1>آسمان تولد</h1>
        <p>داستان هر کسی از جایی شروع می‌شود. به‌زودی می‌توانی یاد آن آغاز را به خانه بیاوری.</p>
        <Link className={styles.backLink} href="/shop">بازگشت به فروشگاه</Link>
      </div>
    );
  }

  return (
    <div className={styles.detailShell}>
      <nav className={styles.crumbs} aria-label="مسیر صفحه">
        <Link href="/">هالیوس</Link><span aria-hidden="true">/</span>
        <Link href="/shop">فروشگاه</Link><span aria-hidden="true">/</span>
        <span>آسمان تولد</span>
      </nav>
      <div className={styles.detailPreview}>
        <div className={styles.detailArt}>
          <Image src="/shop-preview/birth-sky.webp" alt="تابلوی آسمان تولد با نقشی دایره‌ای از ستاره‌ها روی شاسی تیره و دیوار روشن" width={900} height={900} sizes="(max-width: 760px) calc(100vw - 32px), 50vw" />
        </div>
        <div className={styles.detailCopy}>
          <span className={styles.eyebrow}>از مجموعه آثار هالیوس</span>
          <h1>آسمان تولد</h1>
          <p className={styles.detailLead}>هر آدمی، یک نقطهٔ شروع دارد که فقط مال خود اوست.</p>
          <p>تابلویی با الهام از آسمان و لحظهٔ آغاز زندگی؛ تصویری ساده و آرام برای روزی که هیچ‌وقت دوباره تکرار نمی‌شود.</p>
          <ul>
            <li>طراحی مینیمال با نقش ستاره‌ها</li>
            <li>چاپ روی شاسی مات و بدون قاب</li>
            <li>هدیه‌ای برای یادآوری یک آغاز عزیز</li>
          </ul>
          <span className={styles.unavailable}>به‌زودی</span>
          <Link className={styles.backLink} href="/shop#products">بازگشت به مجموعه آثار <span aria-hidden="true">←</span></Link>
        </div>
      </div>
    </div>
  );
}
