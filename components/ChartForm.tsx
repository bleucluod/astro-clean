"use client";

import Link from "next/link";
import { useState } from "react";
import { ReportCard } from "@/components/ReportCard";
import { SafetyDisclaimer } from "@/components/SafetyDisclaimer";
import { createMockReport } from "@/lib/astrology/mock-engine";
import { saveReport } from "@/lib/storage/reports-storage";
import type { AstrologyReport, BirthInput } from "@/types/astro";

const initialForm: BirthInput = {
  name: "",
  birthDate: "",
  birthTime: "",
  birthCity: "",
  birthCountry: "",
};

export function ChartForm() {
  const [form, setForm] = useState<BirthInput>(initialForm);
  const [report, setReport] = useState<AstrologyReport | null>(null);
  const [saveMessage, setSaveMessage] = useState("");

  function updateField(field: keyof BirthInput, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextReport = createMockReport(form);
    saveReport(nextReport);
    setReport(nextReport);
    setSaveMessage("گزارش ساخته و در مرورگر ذخیره شد.");
  }

  return (
    <div className="grid chart-page">
      <form className="card form" onSubmit={handleSubmit}>
        <div>
          <span className="badge">فرم MVP</span>
          <h1>ساخت چارت تولد mock</h1>

          <p>
            اطلاعات تولد را وارد کن تا یک گزارش نمادین فارسی ساخته شود. این
            نسخه هنوز محاسبه واقعی نجومی انجام نمی‌دهد و برای تجربه MVP طراحی
            شده است.
          </p>

          <SafetyDisclaimer compact />
        </div>

        <div className="form-grid">
          <label className="field">
            <span>نام اختیاری</span>
            <input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="مثلاً آراز"
            />
          </label>

          <label className="field">
            <span>تاریخ تولد</span>
            <input
              required
              type="date"
              value={form.birthDate}
              onChange={(event) => updateField("birthDate", event.target.value)}
            />
          </label>

          <label className="field">
            <span>ساعت تولد</span>
            <input
              required
              type="time"
              value={form.birthTime}
              onChange={(event) => updateField("birthTime", event.target.value)}
            />
          </label>

          <label className="field">
            <span>شهر تولد</span>
            <input
              required
              value={form.birthCity}
              onChange={(event) => updateField("birthCity", event.target.value)}
              placeholder="مثلاً تهران"
            />
          </label>

          <label className="field">
            <span>کشور</span>
            <input
              required
              value={form.birthCountry}
              onChange={(event) =>
                updateField("birthCountry", event.target.value)
              }
              placeholder="مثلاً ایران"
            />
          </label>
        </div>

        <div className="actions">
          <button className="button" type="submit">
            ساخت و ذخیره گزارش
          </button>

          {report ? (
            <Link className="button secondary" href="/reports">
              دیدن گزارش‌های ذخیره‌شده
            </Link>
          ) : null}
        </div>

        {saveMessage ? <p className="success-message">{saveMessage}</p> : null}
      </form>

      {report ? (
        <ReportCard report={report} />
      ) : (
        <div className="card">
          <span className="badge">پیش‌نمایش خروجی</span>

          <h2>گزارش اینجا ظاهر می‌شود</h2>

          <p>
            بعد از ثبت فرم، Astro Clean یک چارت mock شامل خورشید، ماه و رایزینگ
            می‌سازد و چند جمله تفسیری فارسی نشان می‌دهد.
          </p>

          <div className="grid grid-3">
            <div className="mini-card">
              <strong>خورشید</strong>
              <span>؟</span>
            </div>

            <div className="mini-card">
              <strong>ماه</strong>
              <span>؟</span>
            </div>

            <div className="mini-card">
              <strong>رایزینگ</strong>
              <span>؟</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
