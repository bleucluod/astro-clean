import Image from 'next/image';
import Link from 'next/link';
import styles from './shop-v01-home.module.css';

export type ShopV01Item = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  href: string | null;
  priceToman: number | null;
  availability: 'available' | 'unavailable' | 'coming-soon';
  imageSrc: string | null;
  imageAlt: string | null;
  isDemo?: boolean;
};

function ProductImage({ item }: { item: ShopV01Item }) {
  return (
    <div className={styles.productVisual}>
      {item.imageSrc ? (
        <Image
          src={item.imageSrc}
          alt={item.imageAlt ?? item.title}
          fill
          sizes="(max-width: 767px) calc(100vw - 36px), (max-width: 1024px) 46vw, 30vw"
          className={styles.productImage}
        />
      ) : (
        <span className={styles.imageUnavailable}>تصویر این اثر هنوز آماده نیست</span>
      )}
    </div>
  );
}

export function ShopV01Home({ products, previewMode = false }: { products: ShopV01Item[]; previewMode?: boolean }) {
  const sampleCount = products.filter((item) => item.isDemo).length;

  return (
    <div className={styles.shopHome}>
      <section className={styles.heroSection} aria-labelledby="shop-title">
        <div className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.heroKicker}>فروشگاه هالیوس</span>
            <h1 id="shop-title">آسمان آن روز،<br />برای همیشه.</h1>
            <p className={styles.heroLead}>آسمان یک لحظهٔ عزیز، برای هر روز خانهٔ تو.</p>
          </div>
        </div>
      </section>

      <section id="products" className={styles.collection} aria-labelledby="collection-heading">
        <div className={styles.collectionInner}>
          <header className={styles.collectionHeader}>
            <h2 id="collection-heading">مجموعه آثار</h2>
          </header>
          <div className={styles.productGrid}>
            {products.map((item) => (
              <article className={styles.productCard} key={item.id}>
                {item.isDemo ? (
                  <ProductImage item={item} />
                ) : (
                  <Link className={styles.visualLink} href={item.href ?? '/shop'} aria-label={`مشاهدهٔ ${item.title}`}>
                    <ProductImage item={item} />
                  </Link>
                )}
                <div className={styles.productDetails}>
                  <div className={styles.productHeading}>
                    <h3>{item.isDemo ? item.title : <Link href={item.href ?? '/shop'}>{item.title}</Link>}</h3>
                    {item.isDemo && <span className={styles.sampleBadge}>نمونهٔ نمایشی</span>}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {previewMode && sampleCount > 0 && (
            <p className={styles.previewDisclosure}>
              این صفحه پیش‌نمایش طراحی است. فقط «ماه آن روز» محصول برنامه‌ریزی‌شده است؛ دو اثر دیگر نمونهٔ چیدمان‌اند. قیمت‌گذاری و سفارش هنوز فعال نیست.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
