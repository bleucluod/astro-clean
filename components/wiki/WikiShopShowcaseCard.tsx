import Image from "next/image";
import Link from "next/link";
import type { PublicWikiShopShowcase } from "@/lib/wiki/wiki-shop-showcase";
import styles from "./wiki-shop-showcase.module.css";

/** Exactly the same card is rendered in the Wiki and in the admin preview. */
export function WikiShopShowcaseCard({ offer }: { offer: PublicWikiShopShowcase }) {
  return <aside aria-label="اثر مرتبط از فروشگاه هالیوس">
    <Link href={offer.url} className={styles.card} aria-label={offer.title + "؛ دیدن در فروشگاه هالیوس"}>
      <span className={styles.image}>
        <Image src={offer.image} alt={offer.imageAlt} fill
          sizes="(max-width: 760px) 240px, 180px" />
      </span>
      <span className={styles.content}>
        <span className={styles.eyebrow}>از فروشگاه هالیوس</span>
        <span className={styles.title}>{offer.title}</span>
        <span className={styles.description}>{offer.description}</span>
        <span className={styles.link}>
          <span>{offer.buttonLabel}</span>
          <span className={styles.arrow} aria-hidden="true">←</span>
        </span>
      </span>
    </Link>
  </aside>;
}
