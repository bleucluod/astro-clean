"use client";

import { useMemo, useState } from "react";

const planOptions = [
  "گزارش پایه",
  "گزارش کامل",
  "گزارش کامل + توضیح دستی",
] as const;

type ManualOrderForm = {
  name: string;
  contact: string;
  plan: (typeof planOptions)[number];
  reportLink: string;
  notes: string;
};

const initialForm: ManualOrderForm = {
  name: "",
  contact: "",
  plan: "گزارش کامل",
  reportLink: "",
  notes: "",
};

export function ManualOrderRequestForm() {
  const [form, setForm] = useState<ManualOrderForm>(initialForm);
  const [copyMessage, setCopyMessage] = useState("");

  const requestText = useMemo(() => {
    const lines = [
      "درخواست سفارش دستی Halleus",
      "",
      `نام: ${form.name.trim() || "—"}`,
      `راه ارتباطی: ${form.contact.trim() || "—"}`,
      `پلن انتخابی: ${form.plan}`,
      `لینک یا شناسه گزارش نمونه: ${form.reportLink.trim() || "—"}`,
      "",
      "توضیحات:",
      form.notes.trim() || "—",
    ];

    return lines.join("\n");
  }, [form]);

  function updateField(field: keyof ManualOrderForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleCopyRequest() {
    setCopyMessage("");

    try {
      await navigator.clipboard.writeText(requestText);
      setCopyMessage("متن سفارش کپی شد. حالا می‌توانی آن را برای هماهنگی دستی ارسال کنی.");
    } catch {
      setCopyMessage("کپی خودکار انجام نشد. متن سفارش را دستی انتخاب و کپی کن.");
    }
  }

  return (
    <section className="card manual-order-form-card">
      <span className="section-label">فرم آماده‌سازی سفارش</span>

      <h2>اطلاعات سفارش را آماده کن</h2>

      <p>
        این فرم فقط برای ساختن متن سفارش است. اطلاعات اینجا به جایی ارسال
        نمی‌شود.
      </p>

      <div className="form-grid">
        <label className="field">
          <span>نام</span>
          <input
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="مثلاً آراز"
          />
        </label>

        <label className="field">
          <span>راه ارتباطی</span>
          <input
            value={form.contact}
            onChange={(event) => updateField("contact", event.target.value)}
            placeholder="ایمیل، تلگرام، اینستاگرام یا شماره تماس"
          />
        </label>

        <label className="field">
          <span>پلن</span>
          <select
            value={form.plan}
            onChange={(event) =>
              updateField("plan", event.target.value as ManualOrderForm["plan"])
            }
          >
            {planOptions.map((plan) => (
              <option key={plan} value={plan}>
                {plan}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>لینک یا شناسه گزارش نمونه</span>
          <input
            value={form.reportLink}
            onChange={(event) => updateField("reportLink", event.target.value)}
            placeholder="اگر گزارش نمونه ساختی، لینک یا شناسه‌اش را اینجا بگذار"
          />
        </label>

        <label className="field field-wide">
          <span>توضیحات سفارش</span>
          <textarea
            rows={5}
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            placeholder="مثلاً می‌خواهم گزارش کامل‌تر، قابل خواندن و قابل اشتراک باشد."
          />
        </label>
      </div>

      <div className="manual-order-preview">
        <strong>متن آماده سفارش</strong>
        <pre>{requestText}</pre>
      </div>

      <div className="actions">
        <button className="button" type="button" onClick={handleCopyRequest}>
          کپی متن سفارش
        </button>
      </div>

      {copyMessage ? <p className="success-message">{copyMessage}</p> : null}
    </section>
  );
}
