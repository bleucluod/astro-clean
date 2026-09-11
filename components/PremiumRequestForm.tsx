"use client";

import { useMemo, useState } from "react";
import { getSupabaseBrowserAuthClient } from "@/lib/auth/supabase-browser-client";
import {
  formatPackagePriceToman,
  getHalleusProductOffer,
  normalizeHalleusPackageCode,
  type HalleusProductCode,
} from "@/lib/monetization/product-catalog";
import styles from "./premium-request-form.module.css";

type PremiumRequestFormProps = {
  initialReportId?: string;
  initialProductCode?: HalleusProductCode;
};

type SubmittedRequest = {
  id?: string;
  accountLinked: boolean;
};

export function PremiumRequestForm({
  initialReportId = "",
  initialProductCode = "full_5",
}: PremiumRequestFormProps) {
  const [contactName, setContactName] = useState("");
  const [contactValue, setContactValue] = useState("");
  const [linkedReportId, setLinkedReportId] = useState(initialReportId.trim());
  const [customerNotes, setCustomerNotes] = useState("");
  const [publicationChoice, setPublicationChoice] = useState<
    "not_requested" | "private" | "public_with_consent"
  >("not_requested");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedRequest, setSubmittedRequest] =
    useState<SubmittedRequest | null>(null);

  const productCode =
    normalizeHalleusPackageCode(initialProductCode) ?? "full_5";
  const offer = getHalleusProductOffer(productCode);
  const includesPremiumBirth = offer.fullReportCredits > 0;
  const priceLabel = formatPackagePriceToman(offer.priceMinor, offer.currency);

  const requestText = useMemo(
    () =>
      [
        "درخواست خرید هالیوس",
        `نام: ${contactName.trim() || "—"}`,
        `راه ارتباطی: ${contactValue.trim() || "—"}`,
        `بسته: ${offer.shortLabel}`,
        `قیمت بسته: ${priceLabel}`,
        `گزارش مرتبط: ${linkedReportId.trim() || "—"}`,
        includesPremiumBirth
          ? `انتخاب انتشار گزارش: ${
              publicationChoice === "private"
                ? "گزارش خصوصی بماند"
                : publicationChoice === "public_with_consent"
                  ? "گزارش با رضایت من عمومی شود"
                  : "فعلاً تصمیمی دربارهٔ انتشار ندارم"
            }`
          : "تحلیل رابطه خصوصی می‌ماند.",
        "",
        customerNotes.trim() || "بدون توضیح اضافه",
      ].join("\n"),
    [
      contactName,
      contactValue,
      customerNotes,
      includesPremiumBirth,
      linkedReportId,
      offer.shortLabel,
      priceLabel,
      publicationChoice,
    ],
  );

  async function submitRequest() {
    setMessage("");
    setSubmittedRequest(null);

    if (!contactName.trim() || !contactValue.trim()) {
      setMessage("نام و یک راه ارتباطی را کامل کن.");
      return;
    }

    setSubmitting(true);

    try {
      const client = getSupabaseBrowserAuthClient();
      const sessionResult = client ? await client.auth.getSession() : null;
      const accessToken = sessionResult?.data.session?.access_token;
      const headers = new Headers({ "content-type": "application/json" });

      if (accessToken) {
        headers.set("authorization", `Bearer ${accessToken}`);
      }

      const response = await fetch("/api/premium-requests", {
        method: "POST",
        headers,
        body: JSON.stringify({
          contactName: contactName.trim(),
          contactValue: contactValue.trim(),
          productCode,
          linkedReportId: linkedReportId.trim() || null,
          customerNotes: customerNotes.trim() || null,
          publicationChoice: includesPremiumBirth
            ? publicationChoice
            : "not_requested",
          company,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        request?: { id?: string; accountLinked?: boolean };
      };

      if (!response.ok) {
        throw new Error(payload.error || "ثبت درخواست انجام نشد.");
      }

      setSubmittedRequest({
        id: payload.request?.id,
        accountLinked: Boolean(payload.request?.accountLinked),
      });
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "ثبت درخواست انجام نشد.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function copyRequest() {
    try {
      await navigator.clipboard.writeText(requestText);
      setMessage("خلاصهٔ درخواست کپی شد.");
    } catch {
      setMessage("کپی خودکار انجام نشد؛ خلاصه را دستی انتخاب کن.");
    }
  }

  return (
    <section
      className={styles.formCard}
      id="order-request-form"
      data-order-request-form="request-v2"
    >
      <div className={styles.formHeading}>
        <span className={styles.kicker}>اطلاعات درخواست</span>
        <h2>راه ارتباطی‌ات را بگذار</h2>
        <p>
          این فرم فقط برای ثبت و پیگیری درخواست است. پرداخت را همچنان در تلگرام
          هماهنگ می‌کنی.
        </p>
      </div>

      <div className={styles.selectedPackage}>
        <span>بستهٔ این درخواست</span>
        <strong>{offer.name}</strong>
        <small>{priceLabel}</small>
      </div>

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>نام</span>
          <input
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
            maxLength={160}
            autoComplete="name"
            placeholder="نامی که ترجیح می‌دهی"
          />
        </label>

        <label className={styles.field}>
          <span>راه ارتباطی</span>
          <input
            value={contactValue}
            onChange={(event) => setContactValue(event.target.value)}
            maxLength={320}
            placeholder="شماره تماس، ایمیل، تلگرام یا اینستاگرام"
          />
        </label>

        <label className={`${styles.field} ${styles.wideField}`}>
          <span>گزارش مرتبط، اگر داری</span>
          <input
            value={linkedReportId}
            onChange={(event) => setLinkedReportId(event.target.value)}
            maxLength={200}
            placeholder="شناسهٔ گزارش، اگر از داخل یک گزارش وارد شدی"
          />
          <small>
            اگر این خرید برای گزارش مشخصی نیست، خالی بگذار.
          </small>
        </label>

        {includesPremiumBirth ? (
          <fieldset className={`${styles.privacyChoice} ${styles.wideField}`}>
            <legend>انتشار گزارش</legend>
            <p>
              خرید روی حریم خصوصی گزارشت اثری ندارد. تا وقتی خودت نخواهی،
              گزارش خصوصی می‌ماند.
            </p>

            <label
              className={
                publicationChoice === "not_requested"
                  ? styles.choiceActive
                  : styles.choice
              }
            >
              <input
                type="radio"
                name="publication-choice"
                value="not_requested"
                checked={publicationChoice === "not_requested"}
                onChange={() => setPublicationChoice("not_requested")}
              />
              <span>
                <strong>فعلاً تصمیمی ندارم</strong>
                <small>گزارش خصوصی می‌ماند.</small>
              </span>
            </label>

            <label
              className={
                publicationChoice === "private"
                  ? styles.choiceActive
                  : styles.choice
              }
            >
              <input
                type="radio"
                name="publication-choice"
                value="private"
                checked={publicationChoice === "private"}
                onChange={() => setPublicationChoice("private")}
              />
              <span>
                <strong>گزارش خصوصی بماند</strong>
                <small>درخواست انتشار عمومی ثبت نمی‌شود.</small>
              </span>
            </label>

            <label
              className={
                publicationChoice === "public_with_consent"
                  ? styles.choiceActive
                  : styles.choice
              }
            >
              <input
                type="radio"
                name="publication-choice"
                value="public_with_consent"
                checked={publicationChoice === "public_with_consent"}
                onChange={() =>
                  setPublicationChoice("public_with_consent")
                }
              />
              <span>
                <strong>گزارش با رضایت من عمومی شود</strong>
                <small>
                  نمایش نام یا هویت، رضایت جداگانه می‌خواهد.
                </small>
              </span>
            </label>
          </fieldset>
        ) : (
          <div className={`${styles.privacyNote} ${styles.wideField}`}>
            <strong>تحلیل رابطه خصوصی است</strong>
            <p>این خروجی مسیر انتشار عمومی ندارد.</p>
          </div>
        )}

        <label className={`${styles.field} ${styles.wideField}`}>
          <span>توضیح اضافه‌ای داری؟</span>
          <textarea
            value={customerNotes}
            onChange={(event) => setCustomerNotes(event.target.value)}
            maxLength={4000}
            rows={4}
            placeholder="اگر دربارهٔ این خرید یا اتصالش به یک گزارش نکته‌ای هست، اینجا بنویس"
          />
        </label>

        <label className={styles.honeypot} aria-hidden="true">
          <input
            tabIndex={-1}
            value={company}
            onChange={(event) => setCompany(event.target.value)}
          />
        </label>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.primaryAction}
          type="button"
          disabled={submitting}
          onClick={() => void submitRequest()}
        >
          {submitting ? "در حال ثبت…" : "ثبت درخواست"}
        </button>

        <button
          className={styles.secondaryAction}
          type="button"
          onClick={() => void copyRequest()}
        >
          کپی خلاصه
        </button>
      </div>

      <details className={styles.copyDetails}>
        <summary>دیدن خلاصهٔ درخواست</summary>
        <pre>{requestText}</pre>
      </details>

      {submittedRequest ? (
        <div className={styles.successPanel} role="status">
          <span>درخواستت ثبت شد</span>
          <h3>
            {submittedRequest.id
              ? `شمارهٔ پیگیری: ${submittedRequest.id}`
              : "درخواست در هالیوس ثبت شد"}
          </h3>
          <p>
            {submittedRequest.accountLinked
              ? "این درخواست به حسابت وصل است. حالا فقط هماهنگی پرداخت مانده."
              : "درخواست ثبت شد. موقع نهایی‌کردن خرید، حساب هالیوس‌ات را هم اعلام کن تا اعتبار روی همان حساب بنشیند."}
          </p>
          <a
            className={styles.telegramAction}
            href="https://t.me/lbleu"
            rel="noreferrer"
            target="_blank"
          >
            هماهنگی پرداخت در تلگرام
          </a>
        </div>
      ) : null}

      {message ? (
        <p className={styles.message} role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
