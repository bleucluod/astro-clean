"use client";

import { useState } from "react";
import reportStyles from "@/components/report/human-first-report.module.css";
import styles from "./vedic-d1-guest.module.css";

/** UI review only. No checkout, account creation, pricing or entitlement mutation. */
export function VedicD1PurchaseOffer({ name }: { name: string }) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const development = process.env.NODE_ENV === "development";

  return (
    <section className={styles.purchaseOffer} aria-labelledby="vedic-purchase-title">
      <p className={reportStyles.eyebrow}>گزارش کامل چارت ودیک</p>
      <h2 id="vedic-purchase-title" tabIndex={-1}>{name}، ادامهٔ داستان چارتت را بخوان</h2>
      <p>با گزارش کامل، می‌توانی ارتباط رایزینگ، ماه، سیاره‌ها و خانه‌های چارتت را در کنار هم بخوانی و ببینی هر فصل چه چیزی به تصویر کلی اضافه می‌کند.</p>
      <div className={styles.purchaseBenefits}>
        <span>متن کامل هر چهار فصل</span>
        <span>بر اساس همین چارت تولد</span>
        <span>یک خرید، بدون اشتراک ماهانه</span>
      </div>
      {development ? (
        <>
          <button type="button" className={styles.purchasePrimary}
            aria-expanded={reviewOpen} aria-controls="vedic-purchase-review"
            onClick={() => setReviewOpen(value => !value)}>
            {reviewOpen ? "بستن پیش‌نمایش خرید" : "دریافت گزارش کامل من"}
          </button>
          <small>پیش‌نمایش طراحی؛ هنوز امکان خرید واقعی وجود ندارد.</small>
          <div id="vedic-purchase-review" hidden={!reviewOpen} className={styles.purchaseReview}>
            <h3>دریافت گزارش کامل</h3>
            <p>گزارش همین چارت، شامل هر چهار فصل.</p>
            <ol>
              <li>ورود یا ساخت حساب برای نگهداری خصوصی گزارش</li>
              <li>مشاهدهٔ مبلغ و تأیید خرید</li>
              <li>پرداخت و دسترسی به گزارش کامل از حساب</li>
            </ol>
            <p>قیمت هنوز تعیین نشده و مراحل حساب و پرداخت متصل نیستند.</p>
            <button type="button" className={styles.purchasePrimary} disabled>ادامه و پرداخت</button>
          </div>
        </>
      ) : (
        <button type="button" className={styles.purchasePrimary} disabled>خرید به‌زودی فعال می‌شود</button>
      )}
    </section>
  );
}
