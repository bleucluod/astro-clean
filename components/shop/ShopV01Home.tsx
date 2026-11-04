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

function ProductImage({ item, hero = false }: { item: ShopV01Item; hero?: boolean }) {
  return (
    <div className={hero ? styles.heroVisual : styles.productVisual}>
      {item.imageSrc ? (
        <Image
          src={item.imageSrc}
          alt={item.imageAlt ?? item.title}
          fill
          priority={hero}
          sizes={hero
            ? '(max-width: 767px) 100vw, 50vw'
            : '(max-width: 640px) 45vw, (max-width: 1024px) 48vw, 32vw'}
          className={styles.productImage}
        />
      ) : (
        <span className={styles.imageUnavailable}>تصویر این اثر هنوز آماده نیست</span>
      )}
    </div>
  );
}

export function ShopV01Home({ products, previewMode = false }: { products: ShopV01Item[]; previewMode?: boolean }) {
  const featured = products.find((item) => !item.isDemo) ?? products[0];
  const sampleCount = products.filter((item) => item.isDemo).length;

  return (
    <div className={styles.shopHome}>
      <section className={styles.heroSection} aria-labelledby="shop-title">
        <div className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.heroKicker}>فروشگاه هالیوس</span>
            <h1 id="shop-title">لحظه‌هایی که<br />می‌مانند.</h1>
            <p className={styles.heroLead}>آسمان یک روز خاص، در قاب خاطره‌های تو.</p>
            <p className={styles.heroSupporting}>بعضی روزها آن‌قدر عزیزند که دلت می‌خواهد چیزی از آسمانشان برای همیشه کنارت بماند.</p>
            <a className={styles.heroButton} href="#products">
              دیدن آثار
              <span aria-hidden="true">←</span>
            </a>
          </div>
          {featured && (
            <div className={styles.heroMedia}>
              <ProductImage item={featured} hero />
              {previewMode && <span className={styles.heroImageNote}>تصویر مفهومی · محصول نهایی نیست</span>}
            </div>
          )}
        </div>
      </section>

      <section id="products" className={styles.collection} aria-labelledby="collection-heading">
        <div className={styles.collectionInner}>
          <header className={styles.collectionHeader}>
            <h2 id="collection-heading">مجموعه آثار</h2>
            <p>یک یادگاری از آسمان، برای لحظه‌هایی که فراموش نمی‌شوند.</p>
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
                    <h3>{item.title}</h3>
                    {item.isDemo && <span className={styles.sampleBadge}>نمونهٔ نمایشی</span>}
                  </div>
                  <p>{item.subtitle}</p>
                  {!item.isDemo && (
                    <Link className={styles.productAction} href={item.href ?? '/shop'}>
                      مشاهدهٔ اثر <span aria-hidden="true">←</span>
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
          {previewMode && sampleCount > 0 && (
            <p className={styles.previewDisclosure}>
              این صفحه پیش‌نمایش طراحی است. فقط «ماه آن روز» محصول برنامه‌ریزی‌شدهٔ هالیوس است؛ دو تصویر دیگر برای آزمایش نمایش سه محصول کنار هم هستند. قیمت‌گذاری و سفارش هنوز فعال نیست.
            </p>
          )}
        </div>
      </section>

      <section className={styles.closing} aria-labelledby="closing-title">
        <div className={styles.closingInner}>
          <h2 id="closing-title">هر آسمان، یک داستان.</h2>
          <p>برای خاطره‌هایی که دلت می‌خواهد هر روز ببینی‌شان.</p>
        </div>
      </section>
    </div>
  );
}
