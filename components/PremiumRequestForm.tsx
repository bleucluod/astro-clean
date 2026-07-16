"use client";

import { useMemo, useState } from "react";
import { getSupabaseBrowserAuthClient } from "@/lib/auth/supabase-browser-client";

const productOptions = [
  "گزارش کامل",
  "گزارش کامل + توضیح دستی",
] as const;

type PremiumRequestFormProps = {
  initialReportId?: string;
};

export function PremiumRequestForm({
  initialReportId = "",
}: PremiumRequestFormProps) {
  const [contactName, setContactName] = useState("");
  const [contactValue, setContactValue] = useState("");
  const [requestedProduct, setRequestedProduct] =
    useState<(typeof productOptions)[number]>("گزارش کامل");
  const [linkedReportId, setLinkedReportId] = useState(initialReportId.trim());
  const [customerNotes, setCustomerNotes] = useState("");
  const [publicationChoice, setPublicationChoice] =
    useState<"not_requested" | "private" | "public_with_consent">(
      "not_requested",
    );
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const requestText = useMemo(
    () =>
      [
        "درخواست نسخه کامل‌تر گزارش هالیوس",
        `نام: ${contactName.trim() || "—"}`,
        `راه ارتباطی: ${contactValue.trim() || "—"}`,
        `محصول: ${requestedProduct}`,
        `شناسه گزارش: ${linkedReportId.trim() || "—"}`,
        `انتخاب انتشار: ${
          publicationChoice === "private"
            ? "خصوصی"
            : publicationChoice === "public_with_consent"
              ? "عمومی با رضایت صریح"
              : "فعلاً انتخاب نشده"
        }`,
        "",
        customerNotes.trim() || "بدون توضیح اضافه",
      ].join("\n"),
    [
      contactName,
      contactValue,
      customerNotes,
      linkedReportId,
      publicationChoice,
      requestedProduct,
    ],
  );

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
      if (accessToken) {
        headers.set("authorization", `Bearer ${accessToken}`);
      }

      const response = await fetch("/api/premium-requests", {
        method: "POST",
        headers,
        body: JSON.stringify({
          contactName: contactName.trim(),
          contactValue: contactValue.trim(),
          requestedProduct,
          linkedReportId: linkedReportId.trim() || null,
          customerNotes: customerNotes.trim() || null,
          publicationChoice,
          company,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        request?: { id?: string };
      };
      if (!response.ok) {
        throw new Error(payload.error || "ثبت درخواست ناموفق بود.");
      }
      setMessage(
        payload.request?.id
          ? `درخواست با شماره ${payload.request.id} ثبت شد.`
          : "درخواست ثبت شد.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "ثبت درخواست ناموفق بود.",
      );
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
      <h2>درخواست نسخه کامل‌تر را ثبت کن</h2>
      <p>
        این اطلاعات برای بررسی و هماهنگی سفارش در صف خصوصی هالیوس ذخیره می‌شود.
        انتخاب انتشار گزارش جدا از ثبت درخواست است و بدون رضایت صریح تغییر نمی‌کند.
      </p>

      <div className="form-grid">
        <label>
          نام
          <input
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
            maxLength={160}
            autoComplete="name"
          />
        </label>
        <label>
          راه ارتباطی
          <input
            value={contactValue}
            onChange={(event) => setContactValue(event.target.value)}
            maxLength={320}
            placeholder="شماره تماس، ایمیل، تلگرام یا اینستاگرام"
          />
        </label>
        <label>
          محصول
          <select
            value={requestedProduct}
            onChange={(event) =>
              setRequestedProduct(
                event.target.value as (typeof productOptions)[number],
              )
            }
          >
            {productOptions.map((product) => (
              <option key={product}>{product}</option>
            ))}
          </select>
        </label>
        <label>
          شناسه گزارش
          <input
            value={linkedReportId}
            onChange={(event) => setLinkedReportId(event.target.value)}
            maxLength={200}
          />
        </label>
        <label>
          انتخاب انتشار
          <select
            value={publicationChoice}
            onChange={(event) =>
              setPublicationChoice(
                event.target.value as
                  | "not_requested"
                  | "private"
                  | "public_with_consent",
              )
            }
          >
            <option value="not_requested">بعداً تصمیم می‌گیرم</option>
            <option value="private">خصوصی بماند</option>
            <option value="public_with_consent">
              فقط با رضایت صریح من عمومی شود
            </option>
          </select>
        </label>
        <label>
          توضیحات
          <textarea
            value={customerNotes}
            onChange={(event) => setCustomerNotes(event.target.value)}
            maxLength={4000}
            rows={5}
          />
        </label>
        <label
          aria-hidden="true"
          style={{ position: "absolute", left: "-10000px" }}
        >
          Company
          <input
            tabIndex={-1}
            value={company}
            onChange={(event) => setCompany(event.target.value)}
          />
        </label>
      </div>

      <div className="manual-order-preview">
        <strong>متن قابل کپی</strong>
        <pre>{requestText}</pre>
      </div>

      <div className="actions">
        <button
          className="button"
          type="button"
          disabled={submitting}
          onClick={() => void submitRequest()}
        >
          {submitting ? "در حال ثبت…" : "ثبت درخواست"}
        </button>
        <button
          className="button secondary"
          type="button"
          onClick={() => void copyRequest()}
        >
          کپی متن
        </button>
      </div>
      {message ? <p className="success-message">{message}</p> : null}
    </section>
  );
}
