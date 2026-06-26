"use client";

import { useEffect, useMemo, useState } from "react";
import { getReportRepository } from "@/lib/storage/report-repository";
import type { AstrologyReport } from "@/types/astro";

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

type ManualOrderRequestFormProps = {
  initialReportId?: string;
};

const initialForm: ManualOrderForm = {
  name: "",
  contact: "",
  plan: "گزارش کامل",
  reportLink: "",
  notes: "",
};

function buildInitialForm(initialReportId: string): ManualOrderForm {
  return {
    ...initialForm,
    reportLink: initialReportId,
  };
}

function formatReportContext(report: AstrologyReport | null, reportId: string) {
  if (!report) {
    return reportId
      ? [
          "",
          "اطلاعات گزارش نمونه:",
          `شناسه گزارش: ${reportId}`,
          "جزئیات گزارش در همین مرورگر پیدا نشد. اگر گزارش را در مرورگر دیگری ساخته‌ای، همین شناسه را برای پیگیری دستی بفرست.",
        ]
      : [];
  }

  const name = report.input.name?.trim() || "بدون نام";
  const birthDate = report.input.birthDate || "ثبت نشده";
  const birthTime = report.input.birthTime || "ثبت نشده";
  const birthCity = report.input.birthCity || "ثبت نشده";
  const birthCountry = report.input.birthCountry || "ثبت نشده";

  return [
    "",
    "اطلاعات گزارش نمونه:",
    `شناسه گزارش: ${report.id}`,
    `نام گزارش: ${name}`,
    `تاریخ تولد ذخیره‌شده: ${birthDate}`,
    `ساعت تولد: ${birthTime}`,
    `شهر تولد: ${birthCity}، ${birthCountry}`,
  ];
}

export function ManualOrderRequestForm({
  initialReportId = "",
}: ManualOrderRequestFormProps) {
  const normalizedInitialReportId = initialReportId.trim();
  const [form, setForm] = useState<ManualOrderForm>(() =>
    buildInitialForm(normalizedInitialReportId),
  );
  const [linkedReport, setLinkedReport] = useState<AstrologyReport | null>(null);
  const [reportLookupMessage, setReportLookupMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    if (!normalizedInitialReportId) {
      setLinkedReport(null);
      setReportLookupMessage("");
      return;
    }

    setForm((current) => {
      if (current.reportLink.trim()) {
        return current;
      }

      return {
        ...current,
        reportLink: normalizedInitialReportId,
      };
    });

    let isActive = true;

    async function loadLinkedReport() {
      const record = await getReportRepository().getReport(normalizedInitialReportId);

      if (!isActive) {
        return;
      }

      const report = record?.report ?? null;

      setLinkedReport(report);
      setReportLookupMessage(
        report
          ? "گزارش نمونه از همین مرورگر پیدا شد و اطلاعاتش به متن سفارش اضافه شد."
          : "شناسه گزارش به سفارش اضافه شد، اما جزئیات آن در storage همین مرورگر پیدا نشد.",
      );
    }

    void loadLinkedReport();

    return () => {
      isActive = false;
    };
  }, [normalizedInitialReportId]);

  const requestText = useMemo(() => {
    const reportId = form.reportLink.trim();
    const lines = [
      "درخواست سفارش دستی Halleus",
      "",
      `نام: ${form.name.trim() || "—"}`,
      `راه ارتباطی: ${form.contact.trim() || "—"}`,
      `پلن انتخابی: ${form.plan}`,
      `لینک یا شناسه گزارش نمونه: ${reportId || "—"}`,
      ...formatReportContext(linkedReport, reportId),
      "",
      "توضیحات:",
      form.notes.trim() || "—",
    ];

    return lines.join("\n");
  }, [form, linkedReport]);

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

      {reportLookupMessage ? (
        <p className="success-message">{reportLookupMessage}</p>
      ) : null}

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
