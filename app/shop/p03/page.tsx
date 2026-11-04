import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import styles from '@/components/shop/shop-v01-home.module.css';

export const metadata: Metadata = {
  title: 'شبِ ما | تابلوی خاطرهٔ مشترک هالیوس',
  description: 'شبِ ما؛ تصویری آرام از راه شیری و آسمان شب برای زنده نگه‌داشتن حس یک خاطرهٔ مشترک، روی شاسی مات بدون قاب.',
  robots: { index: false, follow: false },
};

export default function OurNightProductPage() {
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className={styles.closed}>
        <h1>شبِ ما</h1>
        <p>بعضی شب‌ها تمام نمی‌شوند؛ فقط به یک خاطرهٔ ماندگار تبدیل می‌شوند.</p>
        <Link className={styles.backLink} href="/shop">بازگشت به فروشگاه</Link>
      </div>
    );
  }

  return (
    <div className={styles.detailShell}>
      <nav className={styles.crumbs} aria-label="مسیر صفحه">
        <Link href="/">هالیوس</Link><span aria-hidden="true">/</span>
        <Link href="/shop">فروشگاه</Link><span aria-hidden="true">/</span>
        <span>شبِ ما</span>
      </nav>
      <div className={styles.detailPreview}>
        <div className={styles.detailArt}>
          <Image src="/shop-preview/our-night.webp" alt="تابلوی شب ما با راه شیری بر فراز کوهستان و نور نرم روی دیوار" width={900} height={900} sizes="(max-width: 760px) calc(100vw - 32px), 50vw" />
        </div>
        <div className={styles.detailCopy}>
          <span className={styles.eyebrow}>از مجموعه آثار هالیوس</span>
          <h1>شبِ ما</h1>
          <p className={styles.detailLead}>بعضی لحظه‌ها وقتی دو نفر کنار هم‌اند، شکل دیگری دارند.</p>
          <p>آسمانی پرستاره، سکوت کوهستان و یاد شبی که برای شما معنای خودش را دارد؛ اثری که بی‌سروصدا از آن خاطره حرف می‌زند.</p>
          <ul>
            <li>منظرهٔ هنری از راه شیری و آسمان شب</li>
            <li>چاپ روی شاسی مات و بدون قاب</li>
            <li>برای خانه و خاطره‌های دونفره</li>
          </ul>
          <span className={styles.unavailable}>به‌زودی</span>
          <Link className={styles.backLink} href="/shop#products">بازگشت به مجموعه آثار <span aria-hidden="true">←</span></Link>
        </div>
      </div>
    </div>
  );
}
