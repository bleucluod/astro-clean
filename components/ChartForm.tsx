"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { ReportCard } from "@/components/ReportCard";
import { SafetyDisclaimer } from "@/components/SafetyDisclaimer";
import { createMockReport } from "@/lib/astrology/mock-engine";
import { saveReport } from "@/lib/storage/reports-storage";
import type { AstrologyReport, BirthInput } from "@/types/astro";
import {
  IRAN_CITY_OPTIONS,
  findIranCityByName,
} from "@/lib/locations/iran-cities";

const initialForm: BirthInput = {
  name: "",
  birthDate: "",
  birthTime: "",
  birthCity: "تهران",
  birthCountry: "ایران",
};

const todayIsoDate = new Date().toISOString().slice(0, 10);

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

    const normalizedCityName = form.birthCity.trim() || initialForm.birthCity;
    const selectedCity = findIranCityByName(normalizedCityName);

    const normalizedForm: BirthInput = {
      ...form,
      name: (form.name ?? "").trim(),
      birthCity: selectedCity?.faName ?? normalizedCityName,
      birthCountry: initialForm.birthCountry,
      birthCityId: selectedCity?.id,
      birthLatitude: selectedCity?.latitude,
      birthLongitude: selectedCity?.longitude,
      birthTimezone: selectedCity?.timezone,
    };

    const nextReport = createMockReport(normalizedForm);

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

          <h1>ساخت چارت تولد mock</h1>

          <p>
            اطلاعات تولد را وارد کن تا یک گزارش نمادین فارسی ساخته شود. بعد از
            ساخت گزارش، مستقیم وارد صفحه جزئیات همان گزارش می‌شوی و می‌توانی
            یادداشت شخصی هم اضافه کنی.
          </p>

          <SafetyDisclaimer compact />
        </div>

        <div className="form-grid">
          <label className="field">
            <span>نام اختیاری</span>
            <input
              autoComplete="name"
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
              max={todayIsoDate}
              autoComplete="bday"
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
              autoComplete="address-level2"
              value={form.birthCity}
              onChange={(event) => updateField("birthCity", event.target.value)}
              placeholder="مثلاً تهران"
            
              list="iran-city-options"/>
          </label>
          <datalist id="iran-city-options">
            {IRAN_CITY_OPTIONS.map((city) => (
              <option
                key={city.id}
                value={city.faName}
                label={city.enName + " - " + city.provinceFaName}
              />
            ))}
          </datalist>

          <label className="field">
            <span>کشور</span>
            <input
              required
              readOnly
              autoComplete="country-name"
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