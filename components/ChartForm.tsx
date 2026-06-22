"use client";

import { useState } from "react";
import { ReportCard } from "@/components/ReportCard";
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

function createShareText(report: AstrologyReport): string {
  return `گزارش Astro Clean من: خورشید در ${report.chart.sunSign.faName}، ماه در ${report.chart.moonSign.faName} و رایزینگ ${report.chart.risingSign.faName}. این یک تفسیر نمادین و سرگرم‌کننده است.`;
}

export function ChartForm() {
  const [form, setForm] = useState<BirthInput>(initialForm);
  const [report, setReport] = useState<AstrologyReport | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

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
    setSaveMessage("گزارش در مرورگر ذخیره شد.");
    setCopyMessage("");
  }

  async function handleCopyShareText() {
    if (!report) {
      return;
    }

    const shareText = createShareText(report);

    try {
      await navigator.clipboard.writeText(shareText);
      setCopyMessage("متن اشتراک‌گذاری کپی شد.");
    } catch {
      setCopyMessage("کپی خودکار ممکن نشد. متن را دستی کپی کن.");
    }
  }

  return (
    <div className="grid">
      <form className="card form" onSubmit={handleSubmit}>
        <div>
          <span className="badge">فرم MVP</span>
          <h1>اطلاعات تولد خود را وارد کن</h1>
          <p>
            این نسخه فعلاً از mock engine استفاده می‌کند. یعنی خروجی برای تست
            محصول است، نه محاسبه واقعی نجومی.
          </p>
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

        <button className="button" type="submit">
          ساخت و ذخیره گزارش mock
        </button>

        {saveMessage ? <p className="success-message">{saveMessage}</p> : null}
      </form>

      {report ? (
        <div className="grid">
          <ReportCard report={report} />

          <div className="card">
            <h2>اشتراک‌گذاری</h2>
            <p>
              فعلاً فقط یک متن کوتاه برای اشتراک‌گذاری می‌سازیم. کارت تصویری
              وایرال را برای نسخه‌های بعد نگه می‌داریم.
            </p>

            <button className="button secondary" onClick={handleCopyShareText}>
              کپی متن اشتراک‌گذاری
            </button>

            {copyMessage ? <p className="success-message">{copyMessage}</p> : null}
          </div>
        </div>
      ) : (
        <div className="card">
          <h2>خروجی گزارش اینجا نمایش داده می‌شود</h2>
          <p>
            بعد از ثبت فرم، Astro Clean یک چارت mock شامل خورشید، ماه و رایزینگ
            می‌سازد و چند جمله تفسیری فارسی نشان می‌دهد.
          </p>
        </div>
      )}
    </div>
  );
}
