import Image from 'next/image';
import Link from 'next/link';
import type { PublicWikiShopShowcase } from '@/lib/wiki/wiki-shop-showcase';
import styles from './wiki-shop-showcase.module.css';

export function WikiShopShowcaseCard({ offer }: { offer: PublicWikiShopShowcase }) {
  return (
    <aside className={styles.card} aria-label="اثر مرتبط از فروشگاه هالیوس">
      <Link href={offer.url} className={styles.image} aria-label={'مشاهدهٔ ' + offer.title}>
        <Image src={offer.image} alt={offer.imageAlt} fill sizes="(max-width: 760px) 240px, 220px" />
      </Link>
      <div className={styles.content}>
        <span className={styles.eyebrow}>از فروشگاه هالیوس</span>
        <h3>{offer.title}</h3>
        <p>{offer.description}</p>
        <Link className={styles.link} href={offer.url}>{offer.buttonLabel}<span aria-hidden="true">←</span></Link>
      </div>
    </aside>
  );
}
