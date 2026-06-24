"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { ReportCard } from "@/components/ReportCard";
import { SafetyDisclaimer } from "@/components/SafetyDisclaimer";
import { createMockReport } from "@/lib/astrology/mock-engine";
import { saveReport } from "@/lib/storage/reports-storage";
import type { AstrologyReport, BirthInput } from "@/types/astro";

const initialForm: BirthInput = {
  name: "",
  birthDate: "",
  birthTime: "",
  birthCity: "\u062A\u0647\u0631\u0627\u0646",
  birthCountry: "\u0627\u06CC\u0631\u0627\u0646",
};

function notifyLocalDataChanged() {
  window.dispatchEvent(new Event("astro-clean-data-changed"));
}

export function ChartForm() {
  const router = useRouter();
  const [form, setForm] = useState<BirthInput>(initialForm);
  const [report, setReport] = useState<AstrologyReport | null>(null);
  const [saveMessage, setSaveMessage] = useState("");

  function updateField(field: keyof BirthInput, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextReport = createMockReport(form);

    saveReport(nextReport);
    notifyLocalDataChanged();

    setReport(nextReport);
    setSaveMessage("گزارش ساخته و ذخیره شد. در حال انتقال به صفحه جزئیات...");

    router.push(`/reports/${nextReport.id}`);
  }

  return (
    <div className="grid chart-page">
      <form className="card form" onSubmit={handleSubmit}>
        <div>
          <span className="badge">فرم MVP</span>

          <h1>\u0633\u0627\u062E\u062A \u06AF\u0632\u0627\u0631\u0634 \u0686\u0627\u0631\u062A \u062A\u0648\u0644\u062F</h1>

          <p>
            اطلاعات تولد را وارد کن تا یک گزارش نمادین فارسی ساخته شود. بعد از
            ساخت گزارش، مستقیم وارد صفحه جزئیات همان گزارش می‌شوی و می‌توانی
            یادداشت شخصی هم اضافه کنی.
          </p>

          <SafetyDisclaimer compact />
        </div>

        <div className="form-grid">
          <label className="field">
            <span>\u06A9\u0634\u0648\u0631</span>
            <input
              required
              readOnly
              value={form.birthCountry}
              aria-label="\u06A9\u0634\u0648\u0631"
            />
            <small className="field-note">
              \u0646\u0633\u062E\u0647 \u0641\u0639\u0644\u06CC \u0641\u0642\u0637 \u0628\u0631\u0627\u06CC \u0627\u06CC\u0631\u0627\u0646 \u062A\u0646\u0638\u06CC\u0645 \u0634\u062F\u0647 \u0627\u0633\u062A.
            </small>
          </label>

          <label className="field">
            <span>\u0634\u0647\u0631 \u062A\u0648\u0644\u062F</span>
            <input
              required
              value={form.birthCity}
              onChange={(event) => updateField("birthCity", event.target.value)}
              placeholder="\u0645\u062B\u0644\u0627\u064B \u062A\u0647\u0631\u0627\u0646"
            />
          </label>
        </div>

        <div className="actions">
          <button className="button" type="submit">
            ساخت گزارش و رفتن به جزئیات
          </button>

          <Link className="button secondary" href="/reports">
            دیدن گزارش‌های ذخیره‌شده
          </Link>
        </div>

        {saveMessage ? <p className="success-message">{saveMessage}</p> : null}
      </form>

      {report ? (
        <ReportCard report={report} />
      ) : (
        <div className="card">
          <span className="badge">پیش‌نمایش خروجی</span>

          <h2>گزارش اینجا ساخته می‌شود</h2>

          <p>
            بعد از ثبت فرم، Astro Clean یک چارت mock شامل نشانه‌های اصلی می‌سازد،
            گزارش را در مرورگر ذخیره می‌کند و تو را به صفحه جزئیات همان گزارش
            می‌برد.
          </p>

          <div className="grid grid-3">
            <div className="mini-card">
              <strong>ساخت</strong>
              <span>mock</span>
            </div>

            <div className="mini-card">
              <strong>ذخیره</strong>
              <span>local</span>
            </div>

            <div className="mini-card">
              <strong>جزئیات</strong>
              <span>فعال</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}