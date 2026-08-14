"use client";

import { useMemo, useState } from "react";
import { getSupabaseBrowserAuthClient } from "@/lib/auth/supabase-browser-client";
import {
  HALLEUS_PRODUCT_OFFERS,
  formatTestPriceToman,
  getHalleusProductOffer,
  normalizeHalleusPackageCode,
  type HalleusProductCode,
} from "@/lib/monetization/product-catalog";

type PremiumRequestFormProps = {
  initialReportId?: string;
  initialProductCode?: HalleusProductCode;
};

export function PremiumRequestForm({
  initialReportId = "",
  initialProductCode = "full_5",
}: PremiumRequestFormProps) {
  const [contactName, setContactName] = useState("");
  const [contactValue, setContactValue] = useState("");
  const [productCode, setProductCode] = useState<HalleusProductCode>(normalizeHalleusPackageCode(initialProductCode) ?? "full_5");
  const [linkedReportId, setLinkedReportId] = useState(initialReportId.trim());
  const [customerNotes, setCustomerNotes] = useState("");
  const [publicationChoice, setPublicationChoice] = useState<"not_requested" | "private" | "public_with_consent">("not_requested");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const offer = getHalleusProductOffer(productCode);
  const includesPremiumBirth = true;

  const requestText = useMemo(() => [
    "درخواست محصول یک‌باره هالیوس",
    `نام: ${contactName.trim() || "—"}`,
    `راه ارتباطی: ${contactValue.trim() || "—"}`,
    `محصول: ${offer.shortLabel}`,
    `قیمت تست فعلی: ${formatTestPriceToman(offer.testPriceToman)}`,
    `شناسه گزارش تولد: ${linkedReportId.trim() || "—"}`,
    includesPremiumBirth
      ? `انتخاب انتشار گزارش تولد: ${publicationChoice === "private" ? "خصوصی" : publicationChoice === "public_with_consent" ? "عمومی با رضایت صریح" : "پیش‌فرض خصوصی؛ بعداً تصمیم می‌گیرم"}`
      : "تحلیل رابطه همیشه خصوصی است.",
    "",
    customerNotes.trim() || "بدون توضیح اضافه",
  ].join("\n"), [contactName, contactValue, customerNotes, includesPremiumBirth, linkedReportId, offer, publicationChoice]);

  async function submitRequest() {
    setMessage("");
    if (!contactName.trim() || !contactValue.trim()) {
      setMessage("نام و راه ارتباطی را کامل کن.");
      return;
    }
    setSubmitting(true);
    try {
      const client = getSupabaseBrowserAuthClient();
      const sessionResult = client ? await client.auth.getSession() : null;
      const accessToken = sessionResult?.data.session?.access_token;
      const headers = new Headers({ "content-type": "application/json" });
      if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);

      const response = await fetch("/api/premium-requests", {
        method: "POST",
        headers,
        body: JSON.stringify({
          contactName: contactName.trim(),
          contactValue: contactValue.trim(),
          productCode,
          linkedReportId: linkedReportId.trim() || null,
          customerNotes: customerNotes.trim() || null,
          publicationChoice: includesPremiumBirth ? publicationChoice : "not_requested",
          company,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        request?: { id?: string; accountLinked?: boolean };
      };
      if (!response.ok) throw new Error(payload.error || "ثبت درخواست ناموفق بود.");
      setMessage(
        payload.request?.id
          ? `درخواست با شماره ${payload.request.id} ثبت شد.${payload.request.accountLinked ? " اعتبارهای بسته پس از تحویل روی همین حساب اضافه می‌شوند." : " برای دریافت اعتبارها، درخواست باید به حساب هالیوس متصل باشد."}`
          : "درخواست ثبت شد.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ثبت درخواست ناموفق بود.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyRequest() {
    try {
      await navigator.clipboard.writeText(requestText);
      setMessage("متن درخواست کپی شد.");
    } catch {
      setMessage("کپی خودکار انجام نشد؛ متن را دستی انتخاب کن.");
    }
  }

  return (
    <section className="card manual-order-form">
      <span className="section-label">درخواست قابل پیگیری</span>
      <h2>محصول یک‌باره را انتخاب کن</h2>
      <p>این مسیر فعلاً برای اعتبارسنجی تقاضای واقعی از همان صف درخواست هالیوس استفاده می‌کند؛ ثبت فرم پرداخت خودکار نیست.</p>
      <p>قیمت‌ها تست‌اند. خرید فعلاً دستی است؛ بعد از تأیید، اعتبارهای بسته روی حساب اضافه می‌شوند.</p>

      <div className="form-grid">
        <label>نام<input value={contactName} onChange={(event) => setContactName(event.target.value)} maxLength={160} autoComplete="name" /></label>
        <label>راه ارتباطی<input value={contactValue} onChange={(event) => setContactValue(event.target.value)} maxLength={320} placeholder="شماره تماس، ایمیل، تلگرام یا اینستاگرام" /></label>
        <label>
          محصول
          <select value={productCode} onChange={(event) => setProductCode(event.target.value as HalleusProductCode)}>
            {HALLEUS_PRODUCT_OFFERS.filter((item) => item.active).map((item) => (
              <option key={item.code} value={item.code}>{item.shortLabel} · قیمت تست {formatTestPriceToman(item.testPriceToman)}</option>
            ))}
          </select>
          <small>{offer.promise}</small>
        </label>
        <label>
          شناسه گزارش تولد
          <input value={linkedReportId} onChange={(event) => setLinkedReportId(event.target.value)} maxLength={200} disabled={!includesPremiumBirth} />
          <small>برای Relationship لازم نیست؛ Bundle و Premium Birth می‌توانند به گزارش فعلی وصل شوند.</small>
        </label>

        {includesPremiumBirth ? (
          <label>
            انتخاب انتشار گزارش تولد
            <select value={publicationChoice} onChange={(event) => setPublicationChoice(event.target.value as "not_requested" | "private" | "public_with_consent")}>
              <option value="not_requested">پیش‌فرض خصوصی؛ بعداً تصمیم می‌گیرم</option>
              <option value="private">خصوصی بماند</option>
              <option value="public_with_consent">فقط با رضایت صریح من عمومی شود</option>
            </select>
            <small>Premium Birth خصوصی پیش‌فرض است. عمومی‌کردن گزارش و نمایش هویت همچنان رضایت‌های جداگانه‌اند. انتخاب انتشار گزارش جدا از ثبت درخواست است و بدون رضایت صریح تغییر نمی‌کند.</small>
          </label>
        ) : (
          <div className="field"><span>حریم Relationship</span><small>نتیجه Relationship روی همان دستگاه، private و noindex می‌ماند و مسیر انتشار عمومی ندارد.</small></div>
        )}

        <label>توضیحات<textarea value={customerNotes} onChange={(event) => setCustomerNotes(event.target.value)} maxLength={4000} rows={5} /></label>
        <label aria-hidden="true" style={{ position: "absolute", left: "-10000px" }}>Company<input tabIndex={-1} value={company} onChange={(event) => setCompany(event.target.value)} /></label>
      </div>

      <div className="manual-order-preview"><strong>متن قابل کپی</strong><pre>{requestText}</pre></div>
      <div className="actions">
        <button className="button" type="button" disabled={submitting} onClick={() => void submitRequest()}>{submitting ? "در حال ثبت…" : "ثبت درخواست"}</button>
        <button className="button secondary" type="button" onClick={() => void copyRequest()}>کپی متن</button>
      </div>
      {message ? <p className="success-message">{message}</p> : null}
    </section>
  );
}
