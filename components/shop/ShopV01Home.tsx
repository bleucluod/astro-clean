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

export function ShopV01Home({ products }: { products: ShopV01Item[] }) {
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
                {item.href ? (
                  <Link className={styles.visualLink} href={item.href} aria-label={`مشاهدهٔ ${item.title}`}>
                    <ProductImage item={item} />
                  </Link>
                ) : (
                  <ProductImage item={item} />
                )}
                <div className={styles.productDetails}>
                  <div className={styles.productHeading}>
                    <h3>{item.href ? <Link href={item.href}>{item.title}</Link> : item.title}</h3>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
