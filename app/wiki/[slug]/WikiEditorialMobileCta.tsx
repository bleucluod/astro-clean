import Link from "next/link";

import type { WikiEditorialMobileCard } from "@/lib/wiki/wiki-editorial-cta";
import styles from "../wiki.module.css";

type Props = {
  articleBodyId: string;
  endCtaReached: boolean;
  href: string;
  mobileCard: WikiEditorialMobileCard;
};

// HALLEUS_WIKI_EDITORIAL_MOBILE_CTA_SSR_RUNTIME_V18
export function WikiEditorialMobileCta({
  href,
  mobileCard,
}: Props) {
  return (
    <div
      aria-hidden="true"
      className={styles.editorialMobileCta}
      data-exiting="false"
      data-state="idle"
      data-tab-visible="true"
      data-wiki-editorial-mobile-cta="true"
      hidden
    >
      <span
        aria-hidden="true"
        className={styles.editorialMobileCtaProgress}
        data-wiki-cta-progress="true"
      />

      <button
        aria-label="بستن پیشنهاد"
        className={styles.editorialMobileCtaDismiss}
        data-wiki-cta-dismiss="true"
        tabIndex={-1}
        type="button"
      >
        <span aria-hidden="true">×</span>
      </button>

      <div aria-live="polite" className={styles.editorialMobileCtaText}>
        {mobileCard.text}
      </div>

      <Link
        className={styles.editorialMobileCtaButton}
        href={href}
        tabIndex={-1}
      >
        {mobileCard.label}
      </Link>
    </div>
  );
}