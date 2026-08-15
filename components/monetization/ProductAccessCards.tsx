"use client";

import Link from "next/link";
import { useState } from "react";
import {
  DEFAULT_PRODUCT_PACKAGES,
  formatPackagePriceToman,
  type HalleusProductCode,
} from "@/lib/monetization/product-catalog";
import { useProductAccess } from "@/lib/monetization/product-access-client";
import styles from "./product-access.module.css";

export function ProductLockedOffer({
  productCode,
  title,
  description,
  items,
  href = "/pricing",
  availableCredits = 0,
  onUnlock,
  unlockLabel,
}: {
  productCode: "full_report" | "relationship" | "premium_birth";
  title: string;
  description: string;
  items: string[];
  href?: string;
  availableCredits?: number;
  onUnlock?: () => Promise<{ ok: boolean; error?: string }>;
  unlockLabel?: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function unlock() {
    if (!onUnlock || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await onUnlock();
      if (!result.ok) {
        setMessage(result.error ?? "بازکردن نسخه کامل انجام نشد.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside
      className={styles.lockedOffer}
      data-product-lock={productCode}
      aria-label={title}
    >
      <span className={styles.kicker}>ادامهٔ همین خوانش</span>
      <h3>{title}</h3>
      <p>{description}</p>
      <ul>
        {items.filter(Boolean).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className={styles.lockActions}>
        {onUnlock && availableCredits > 0 ? (
          <button
            className={styles.primaryAction}
            type="button"
            disabled={busy}
            onClick={() => void unlock()}
          >
            {busy
              ? "در حال بازکردن…"
              : unlockLabel ?? "بازکردن گزارش کامل با ۱ اعتبار"}
          </button>
        ) : (
          <Link className={styles.primaryAction} href={href}>
            دیدن بسته‌های اعتبار
          </Link>
        )}
        <small>
          {availableCredits > 0
            ? `${availableCredits.toLocaleString("fa-IR")} اعتبار در حساب داری.`
            : "برای بازکردن این بخش به اعتبار مربوط نیاز داری."}
        </small>
      </div>
      {message ? <p className={styles.lockMessage}>{message}</p> : null}
    </aside>
  );
}

export function ProductOfferGrid({
  selectedProduct,
}: {
  selectedProduct?: HalleusProductCode | null;
}) {
  const offers = DEFAULT_PRODUCT_PACKAGES.filter((item) => item.active);
  return (
    <section
      className={styles.offerSection}
      aria-labelledby="halleus-products-title"
    >
      <div className={styles.offerHeading}>
        <span className={styles.kicker}>اعتبارهای هالیوس</span>
        <h2 id="halleus-products-title">
          هر اعتبار، یک خروجی مشخص را باز می‌کند
        </h2>
        <p>
          اشتراک ماهانه نیست. گزارش یا تحلیل ساخته‌شده بعد از مصرف اعتبار دوباره
          قفل نمی‌شود.
        </p>
      </div>
      <div className={styles.offerGrid}>
        {offers.map((offer) => (
          <article
            className={styles.offerCard}
            data-selected={selectedProduct === offer.code}
            key={offer.code}
          >
            {offer.badge ? (
              <span className={styles.testPrice}>{offer.badge}</span>
            ) : null}
            <h3>{offer.name}</h3>
            <strong>
              {formatPackagePriceToman(
                offer.priceMinor,
                offer.currency,
              )}
            </strong>
            <p>{offer.description}</p>
            <small>
              {offer.fullReportCredits.toLocaleString("fa-IR")} گزارش کامل
              {offer.relationshipCredits
                ? ` + ${offer.relationshipCredits.toLocaleString("fa-IR")} تحلیل رابطه`
                : ""}
            </small>
            <Link
              className={styles.primaryAction}
              href={`/order?package=${encodeURIComponent(offer.code)}`}
            >
              {offer.cta}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export function AccountProductAccessCard() {
  const access = useProductAccess();
  // HALLEUS_FREE_ALL_ACCOUNT_CARD_BATCH1_R1
  const freeAllAccess = access.access.policy.monetizationMode === "FREE_ALL";
  return (
    <section
      className={styles.accountCard}
      aria-labelledby="account-products-title"
    >
      <div>
        <span className={styles.kicker}>اعتبارهای من</span>
        <h2 id="account-products-title">دسترسی‌های قابل مصرف</h2>
        <p>
          {access.status === "loading"
            ? "در حال خواندن وضعیت دسترسی…"
            : access.status === "unavailable"
              ? "وضعیت دسترسی فعلاً قابل تأیید نیست."
              : freeAllAccess
                ? "گزارش‌ها و تحلیل رابطه فعلاً بدون مصرف اعتبار در دسترس‌اند."
                : access.status === "unauthenticated"
                  ? "برای دیدن اعتبارها وارد حساب هالیوس شو."
                  : "اعتبار فقط هنگام بازکردن یک خروجی تازه مصرف می‌شود."}
        </p>
      </div>
      <div className={styles.accountAccessGrid}>
        <div>
          <span>گزارش کامل</span>
          <strong>
            {access.access.balances.fullReport.toLocaleString("fa-IR")}
          </strong>
        </div>
        <div>
          <span>تحلیل رابطه</span>
          <strong>
            {access.access.balances.relationship.toLocaleString("fa-IR")}
          </strong>
        </div>
      </div>
      {!freeAllAccess && access.status !== "loading" && access.status !== "unavailable" ? (
        <Link className={styles.secondaryAction} href="/pricing">
          دیدن بسته‌ها
        </Link>
      ) : null}
    </section>
  );
}
